"""Core takt simulation engine.

Implements what-if scenario analysis, Monte Carlo risk simulation, and
multi-scenario comparison for takt construction plans.

Takt planning math refresher
-----------------------------
- **Takt grid**: Each wagon (trade) flows through every zone sequentially.
  Wagon *w* enters zone *z* once the previous wagon *w-1* has left that zone
  AND wagon *w* has completed the prior zone *z-1*.
- **Total takt periods** = num_zones + num_wagons - 1 + total_buffer_periods
- **Working days**: Only weekdays in ``working_days`` list count.
"""

from __future__ import annotations

import copy
import logging
import math
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any

import numpy as np
from dateutil.parser import parse as parse_date

from ..models.schemas import (
    BasePlan,
    ChangeType,
    CompareRequest,
    CompareResult,
    HistogramBin,
    MonteCarloRequest,
    MonteCarloResult,
    ResourceImpact,
    SimulationChange,
    SimulationResult,
    TradeStacking,
    Wagon,
    WhatIfRequest,
    Zone,
)

logger = logging.getLogger("simulation-service.simulator")


# ---------------------------------------------------------------------------
# Data structures used internally
# ---------------------------------------------------------------------------

class _Assignment:
    """Represents a single trade-zone assignment in the takt grid."""

    __slots__ = (
        "wagon_id",
        "wagon_name",
        "zone_id",
        "zone_name",
        "period",
        "start_date",
        "end_date",
        "duration_days",
    )

    def __init__(
        self,
        wagon_id: str,
        wagon_name: str,
        zone_id: str,
        zone_name: str,
        period: int,
        start_date: date,
        end_date: date,
        duration_days: int,
    ) -> None:
        self.wagon_id = wagon_id
        self.wagon_name = wagon_name
        self.zone_id = zone_id
        self.zone_name = zone_name
        self.period = period
        self.start_date = start_date
        self.end_date = end_date
        self.duration_days = duration_days


# ---------------------------------------------------------------------------
# TaktSimulator
# ---------------------------------------------------------------------------

class TaktSimulator:
    """Stateless simulation engine for takt plans."""

    # -----------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------

    def simulate_what_if(self, request: WhatIfRequest) -> SimulationResult:
        """Run a single what-if scenario.

        1. Calculate the original (unmodified) takt grid.
        2. Apply requested changes to produce a modified plan.
        3. Calculate the modified takt grid.
        4. Compare and return the delta.
        """
        base = request.base_plan
        zones = [z.model_copy() for z in base.zones]
        wagons = [w.model_copy() for w in base.wagons]
        takt_time = base.takt_time
        start_date = self._parse_date(base.start_date)
        working_days = base.working_days
        buffer_days = base.buffer_days

        # --- Original grid ---
        orig_assignments = self._recalculate_grid(
            zones, wagons, takt_time, start_date, working_days, buffer_days,
        )
        orig_end = self._grid_end_date(orig_assignments)

        # --- Apply changes ---
        sim_zones = [z.model_copy() for z in zones]
        sim_wagons = [w.model_copy(deep=True) for w in wagons]
        sim_takt = takt_time
        sim_buffer = buffer_days
        zone_delays: dict[str, int] = {}
        resource_impacts: list[ResourceImpact] = []
        warnings: list[str] = []

        for change in request.changes:
            sim_zones, sim_wagons, sim_takt, sim_buffer, zone_delays, warnings = (
                self._apply_change(
                    change,
                    sim_zones,
                    sim_wagons,
                    sim_takt,
                    sim_buffer,
                    zone_delays,
                    resource_impacts,
                    warnings,
                )
            )

        # --- Simulated grid ---
        sim_assignments = self._recalculate_grid(
            sim_zones,
            sim_wagons,
            sim_takt,
            start_date,
            working_days,
            sim_buffer,
            zone_delays=zone_delays,
        )
        sim_end = self._grid_end_date(sim_assignments)

        # --- Stacking detection ---
        stacking = self._detect_stacking(sim_assignments)

        # --- Metrics ---
        delta_days = (sim_end - orig_end).days
        cost_impact = self._compute_cost_impact(
            orig_assignments, sim_assignments, wagons, sim_wagons,
        )
        risk_score = self._compute_risk_score(
            delta_days, len(stacking), len(sim_zones), len(sim_wagons),
        )

        # --- Flowline data ---
        flowline_data = self._compute_flowline(sim_assignments, sim_zones)

        return SimulationResult(
            original_end_date=orig_end.isoformat(),
            simulated_end_date=sim_end.isoformat(),
            delta_days=delta_days,
            trade_stacking_conflicts=stacking,
            resource_impacts=resource_impacts,
            cost_impact=round(cost_impact, 2),
            risk_score_change=round(risk_score, 4),
            flowline_data=flowline_data,
            warnings=warnings,
        )

    def simulate_monte_carlo(self, request: MonteCarloRequest) -> MonteCarloResult:
        """Run a Monte Carlo simulation with stochastic duration sampling.

        For each iteration the duration of every trade-zone pair is sampled
        from a truncated normal distribution centred on the planned duration.
        A random delay event may also be injected.
        """
        base = request.base_plan
        zones = sorted(base.zones, key=lambda z: z.sequence)
        wagons = sorted(base.wagons, key=lambda w: w.sequence)
        start_date = self._parse_date(base.start_date)
        working_days = base.working_days
        buffer_days = base.buffer_days

        n_zones = len(zones)
        n_wagons = len(wagons)
        n_iter = request.iterations
        variance_pct = request.duration_variance_pct
        delay_prob = request.delay_probability

        # Build deterministic duration matrix (wagons x zones) in takt-time
        # units.  Each cell = wagon's duration_days.
        planned_durations = np.array(
            [[w.duration_days for _ in zones] for w in wagons],
            dtype=np.float64,
        )  # shape: (n_wagons, n_zones)

        rng = np.random.default_rng()

        # Sample durations for all iterations at once: (n_iter, n_wagons, n_zones)
        std_dev = planned_durations * variance_pct
        sampled = rng.normal(
            loc=planned_durations,
            scale=np.maximum(std_dev, 0.5),
            size=(n_iter, n_wagons, n_zones),
        )
        # Truncate: minimum 1 day
        sampled = np.maximum(sampled, 1.0)
        sampled = np.ceil(sampled).astype(np.int64)

        # Inject random delay events
        delay_mask = rng.random(size=(n_iter, n_wagons, n_zones)) < delay_prob
        delay_amount = rng.integers(1, max(base.takt_time, 2) + 1, size=(n_iter, n_wagons, n_zones))
        sampled += delay_mask.astype(np.int64) * delay_amount

        # For each iteration, compute the total project duration in working
        # days using a vectorised forward-pass through the takt grid.
        # finish[w][z] = max(finish[w-1][z], finish[w][z-1]) + duration[w][z] + buffer
        # We track the critical-path contribution per wagon.

        total_durations = np.empty(n_iter, dtype=np.int64)
        critical_counts = np.zeros(n_wagons, dtype=np.int64)

        for it in range(n_iter):
            dur = sampled[it]  # (n_wagons, n_zones)
            finish = np.zeros((n_wagons, n_zones), dtype=np.int64)
            predecessor = np.zeros((n_wagons, n_zones), dtype=np.int8)
            # predecessor: 0 = zone-predecessor, 1 = wagon-predecessor

            for w in range(n_wagons):
                for z in range(n_zones):
                    prev_zone = finish[w][z - 1] if z > 0 else 0
                    prev_wagon = (finish[w - 1][z] + buffer_days) if w > 0 else 0
                    if prev_wagon > prev_zone:
                        predecessor[w][z] = 1
                    finish[w][z] = max(prev_zone, prev_wagon) + dur[w][z]

            total_durations[it] = int(finish[-1, -1])

            # Trace critical path backwards to identify critical wagons
            w, z = n_wagons - 1, n_zones - 1
            critical_set: set[int] = set()
            while w >= 0 and z >= 0:
                critical_set.add(w)
                if w == 0 and z == 0:
                    break
                if z == 0:
                    w -= 1
                elif w == 0:
                    z -= 1
                elif predecessor[w][z] == 1:
                    w -= 1
                else:
                    z -= 1
            for cw in critical_set:
                critical_counts[cw] += 1

        # --- Deterministic baseline duration ---
        det_assignments = self._recalculate_grid(
            zones, wagons, base.takt_time, start_date, working_days, buffer_days,
        )
        det_end = self._grid_end_date(det_assignments)
        det_duration_days = self._working_days_between(start_date, det_end, working_days)

        # --- Statistics ---
        mean_dur = float(np.mean(total_durations))
        std_dur = float(np.std(total_durations))
        p50 = int(np.percentile(total_durations, 50))
        p80 = int(np.percentile(total_durations, 80))
        p95 = int(np.percentile(total_durations, 95))

        on_time_count = int(np.sum(total_durations <= det_duration_days))
        on_time_prob = on_time_count / n_iter

        # Percentile end dates (calendar)
        p50_date = self._add_working_days(start_date, p50, working_days)
        p80_date = self._add_working_days(start_date, p80, working_days)
        p95_date = self._add_working_days(start_date, p95, working_days)

        # Critical trades (top contributors)
        crit_threshold = n_iter * 0.3
        critical_trades = [
            wagons[i].name
            for i in range(n_wagons)
            if critical_counts[i] >= crit_threshold
        ]
        # Sort by criticality descending
        idx_sorted = np.argsort(-critical_counts)
        if not critical_trades:
            # Fall back to top 3
            critical_trades = [wagons[int(i)].name for i in idx_sorted[:3]]

        # Histogram
        histogram = self._build_histogram(total_durations, bins=30)

        return MonteCarloResult(
            p50_end_date=p50_date.isoformat(),
            p80_end_date=p80_date.isoformat(),
            p95_end_date=p95_date.isoformat(),
            mean_duration_days=round(mean_dur, 2),
            std_dev_days=round(std_dur, 2),
            on_time_probability=round(on_time_prob, 4),
            critical_trades=critical_trades,
            histogram=histogram,
        )

    def compare_scenarios(self, request: CompareRequest) -> CompareResult:
        """Compare multiple what-if scenarios and recommend the best one."""
        results: list[SimulationResult] = []
        for scenario_changes in request.scenarios:
            what_if = WhatIfRequest(
                plan_id=request.plan_id,
                base_plan=request.base_plan,
                changes=scenario_changes,
            )
            results.append(self.simulate_what_if(what_if))

        # Score each scenario: lower is better.
        # score = risk_adjusted_delta + stacking_penalty
        best_idx = 0
        best_score = float("inf")
        scores: list[float] = []

        for i, res in enumerate(results):
            stacking_penalty = len(res.trade_stacking_conflicts) * 5
            cost_penalty = max(res.cost_impact, 0) / 1000  # Normalise
            score = (
                res.delta_days
                + stacking_penalty
                + cost_penalty
                + res.risk_score_change * 10
            )
            scores.append(score)
            if score < best_score:
                best_score = score
                best_idx = i

        # Build reason
        best = results[best_idx]
        parts: list[str] = []
        if best.delta_days < 0:
            parts.append(f"saves {abs(best.delta_days)} day(s)")
        elif best.delta_days == 0:
            parts.append("maintains the original schedule")
        else:
            parts.append(f"adds only {best.delta_days} day(s)")

        if best.cost_impact < 0:
            parts.append(f"reduces cost by ${abs(best.cost_impact):,.0f}")
        elif best.cost_impact > 0:
            parts.append(f"with a cost increase of ${best.cost_impact:,.0f}")

        stacking_count = len(best.trade_stacking_conflicts)
        if stacking_count == 0:
            parts.append("introduces no trade-stacking conflicts")
        else:
            parts.append(f"introduces {stacking_count} stacking conflict(s)")

        reason = (
            f"Scenario {best_idx + 1} is recommended because it "
            + ", ".join(parts)
            + "."
        )

        return CompareResult(
            scenarios=results,
            recommendation_index=best_idx,
            recommendation_reason=reason,
        )

    # -----------------------------------------------------------------
    # Grid calculation
    # -----------------------------------------------------------------

    def _recalculate_grid(
        self,
        zones: list[Zone],
        wagons: list[Wagon],
        takt_time: int,
        start_date: date,
        working_days: list[int],
        buffer_days: int = 0,
        zone_delays: dict[str, int] | None = None,
    ) -> list[_Assignment]:
        """Compute the full takt grid returning a list of assignments.

        The grid follows standard takt-train logic:
          - Wagons are sorted by sequence.
          - Zones are sorted by sequence.
          - A wagon cannot enter a zone until:
            (a) the prior wagon has left that zone (+ buffer), AND
            (b) the wagon has completed the prior zone.
          - Zone delays push the start of ALL wagons in that zone forward
            by the specified number of working days.
        """
        sorted_zones = sorted(zones, key=lambda z: z.sequence)
        sorted_wagons = sorted(wagons, key=lambda w: w.sequence)

        if not sorted_zones or not sorted_wagons:
            return []

        zone_delays = zone_delays or {}

        n_wagons = len(sorted_wagons)
        n_zones = len(sorted_zones)

        # finish_date[w][z] stores the end date of wagon w in zone z.
        finish_date: list[list[date | None]] = [
            [None] * n_zones for _ in range(n_wagons)
        ]

        assignments: list[_Assignment] = []
        period_counter = 0

        for w_idx, wagon in enumerate(sorted_wagons):
            for z_idx, zone in enumerate(sorted_zones):
                # Determine earliest start for this cell
                earliest = start_date

                # (a) Must wait for previous wagon to finish this zone + buffer
                if w_idx > 0 and finish_date[w_idx - 1][z_idx] is not None:
                    prev_wagon_end = finish_date[w_idx - 1][z_idx]
                    assert prev_wagon_end is not None
                    earliest_after_prev_wagon = self._add_working_days(
                        prev_wagon_end, buffer_days + 1, working_days,
                    )
                    if earliest_after_prev_wagon > earliest:
                        earliest = earliest_after_prev_wagon

                # (b) Must wait for this wagon to finish the previous zone
                if z_idx > 0 and finish_date[w_idx][z_idx - 1] is not None:
                    prev_zone_end = finish_date[w_idx][z_idx - 1]
                    assert prev_zone_end is not None
                    earliest_after_prev_zone = self._add_working_days(
                        prev_zone_end, 1, working_days,
                    )
                    if earliest_after_prev_zone > earliest:
                        earliest = earliest_after_prev_zone

                # Zone-specific delay
                zone_delay = zone_delays.get(zone.id, 0)
                if zone_delay > 0:
                    earliest = self._add_working_days(earliest, zone_delay, working_days)

                # Ensure start falls on a working day
                earliest = self._next_working_day(earliest, working_days)

                # Duration for this wagon (may differ from takt_time if
                # the wagon has its own duration_days, e.g. after add_crew).
                duration = wagon.duration_days

                # Compute end date
                end = self._add_working_days(earliest, duration - 1, working_days)

                finish_date[w_idx][z_idx] = end

                assignment = _Assignment(
                    wagon_id=wagon.id,
                    wagon_name=wagon.name,
                    zone_id=zone.id,
                    zone_name=zone.name,
                    period=period_counter,
                    start_date=earliest,
                    end_date=end,
                    duration_days=duration,
                )
                assignments.append(assignment)
                period_counter += 1

        return assignments

    # -----------------------------------------------------------------
    # Stacking detection
    # -----------------------------------------------------------------

    def _detect_stacking(self, assignments: list[_Assignment]) -> list[TradeStacking]:
        """Find trade-stacking conflicts: multiple wagons in the same zone
        at the same time."""
        # Group by zone
        zone_assignments: dict[str, list[_Assignment]] = defaultdict(list)
        for a in assignments:
            zone_assignments[a.zone_id].append(a)

        conflicts: list[TradeStacking] = []

        for zone_id, zone_asgns in zone_assignments.items():
            n = len(zone_asgns)
            for i in range(n):
                for j in range(i + 1, n):
                    a = zone_asgns[i]
                    b = zone_asgns[j]
                    # Check date overlap
                    if a.start_date <= b.end_date and b.start_date <= a.end_date:
                        # Overlap detected
                        overlap_start = max(a.start_date, b.start_date)
                        overlap_end = min(a.end_date, b.end_date)
                        conflicts.append(
                            TradeStacking(
                                zone_id=zone_id,
                                zone_name=a.zone_name,
                                period=min(a.period, b.period),
                                trades=[a.wagon_name, b.wagon_name],
                                start_date=overlap_start.isoformat(),
                                end_date=overlap_end.isoformat(),
                            )
                        )

        return conflicts

    # -----------------------------------------------------------------
    # Change application
    # -----------------------------------------------------------------

    def _apply_change(
        self,
        change: SimulationChange,
        zones: list[Zone],
        wagons: list[Wagon],
        takt_time: int,
        buffer_days: int,
        zone_delays: dict[str, int],
        resource_impacts: list[ResourceImpact],
        warnings: list[str],
    ) -> tuple[
        list[Zone],
        list[Wagon],
        int,
        int,
        dict[str, int],
        list[str],
    ]:
        """Apply a single SimulationChange and return updated plan components."""
        params = change.parameters

        if change.type == ChangeType.add_crew:
            trade_id = params.get("trade_id", "")
            additional = int(params.get("additional_crew", 1))
            wagon = self._find_wagon(wagons, trade_id)
            if wagon is None:
                warnings.append(f"add_crew: trade '{trade_id}' not found, skipping.")
            else:
                original_crew = wagon.crew_size
                new_crew = original_crew + additional
                # Duration reduces proportionally (but at least 1 day)
                ratio = original_crew / new_crew
                new_duration = max(1, round(wagon.duration_days * ratio))
                resource_impacts.append(
                    ResourceImpact(
                        trade_id=wagon.id,
                        trade_name=wagon.name,
                        original_crew=original_crew,
                        simulated_crew=new_crew,
                        delta_crew=additional,
                    )
                )
                wagon.crew_size = new_crew
                wagon.duration_days = new_duration

        elif change.type == ChangeType.change_takt_time:
            new_takt = int(params.get("new_takt_time", takt_time))
            if new_takt < 1:
                warnings.append("change_takt_time: value must be >= 1, using 1.")
                new_takt = 1
            # Update all wagon durations proportionally to new takt
            ratio = new_takt / takt_time if takt_time > 0 else 1
            for w in wagons:
                w.duration_days = max(1, round(w.duration_days * ratio))
            takt_time = new_takt

        elif change.type == ChangeType.move_trade:
            trade_id = params.get("trade_id", "")
            new_seq = int(params.get("new_sequence", 0))
            wagon = self._find_wagon(wagons, trade_id)
            if wagon is None:
                warnings.append(f"move_trade: trade '{trade_id}' not found, skipping.")
            else:
                # Re-sequence: pull wagon out and insert at new position
                old_seq = wagon.sequence
                # Shift others
                for w in wagons:
                    if w.id == trade_id:
                        continue
                    if old_seq < new_seq:
                        # Moving down: shift items in between up
                        if old_seq < w.sequence <= new_seq:
                            w.sequence -= 1
                    else:
                        # Moving up: shift items in between down
                        if new_seq <= w.sequence < old_seq:
                            w.sequence += 1
                wagon.sequence = new_seq

        elif change.type == ChangeType.add_buffer:
            after_trade_id = params.get("after_trade_id", "")
            extra_buffer = int(params.get("buffer_days", 1))
            # We add to the global buffer for simplicity in the grid model.
            # A more granular approach would require per-wagon buffers.
            if after_trade_id:
                wagon = self._find_wagon(wagons, after_trade_id)
                if wagon is None:
                    warnings.append(
                        f"add_buffer: trade '{after_trade_id}' not found, "
                        "applying buffer globally."
                    )
            buffer_days += extra_buffer

        elif change.type == ChangeType.delay_zone:
            zone_id = params.get("zone_id", "")
            delay = int(params.get("delay_days", 0))
            zone = self._find_zone(zones, zone_id)
            if zone is None:
                warnings.append(f"delay_zone: zone '{zone_id}' not found, skipping.")
            else:
                zone_delays[zone_id] = zone_delays.get(zone_id, 0) + delay

        elif change.type == ChangeType.remove_trade:
            trade_id = params.get("trade_id", "")
            wagon = self._find_wagon(wagons, trade_id)
            if wagon is None:
                warnings.append(f"remove_trade: trade '{trade_id}' not found, skipping.")
            else:
                removed_seq = wagon.sequence
                wagons = [w for w in wagons if w.id != trade_id]
                # Re-compact sequences
                for w in wagons:
                    if w.sequence > removed_seq:
                        w.sequence -= 1

        elif change.type == ChangeType.split_zone:
            zone_id = params.get("zone_id", "")
            split_names: list[str] = params.get("split_into", [])
            zone = self._find_zone(zones, zone_id)
            if zone is None:
                warnings.append(f"split_zone: zone '{zone_id}' not found, skipping.")
            elif len(split_names) < 2:
                warnings.append(
                    "split_zone: 'split_into' must have at least 2 names."
                )
            else:
                original_seq = zone.sequence
                zones = [z for z in zones if z.id != zone_id]
                # Shift sequences of zones after the split point
                n_new = len(split_names)
                for z in zones:
                    if z.sequence > original_seq:
                        z.sequence += n_new - 1
                # Insert new zones
                for i, name in enumerate(split_names):
                    new_zone = Zone(
                        id=f"{zone_id}_split_{i}",
                        name=name,
                        sequence=original_seq + i,
                    )
                    zones.append(new_zone)
                zones.sort(key=lambda z: z.sequence)

        return zones, wagons, takt_time, buffer_days, zone_delays, warnings

    # -----------------------------------------------------------------
    # Flowline computation
    # -----------------------------------------------------------------

    def _compute_flowline(
        self,
        assignments: list[_Assignment],
        zones: list[Zone],
    ) -> dict[str, Any]:
        """Generate flowline visualization data.

        Returns a structure ready for D3.js rendering:
        {
          "zones": ["Zone A", "Zone B", ...],
          "trades": {
            "Drywall": [
              {"zone": "Zone A", "start": "2026-03-01", "end": "2026-03-05"},
              ...
            ],
            ...
          }
        }
        """
        sorted_zones = sorted(zones, key=lambda z: z.sequence)
        zone_names = [z.name for z in sorted_zones]

        trades: dict[str, list[dict[str, str]]] = defaultdict(list)
        for a in assignments:
            trades[a.wagon_name].append(
                {
                    "zone": a.zone_name,
                    "zone_id": a.zone_id,
                    "start": a.start_date.isoformat(),
                    "end": a.end_date.isoformat(),
                    "duration_days": a.duration_days,
                }
            )

        return {
            "zones": zone_names,
            "trades": dict(trades),
        }

    # -----------------------------------------------------------------
    # Cost & risk helpers
    # -----------------------------------------------------------------

    def _compute_cost_impact(
        self,
        orig_assignments: list[_Assignment],
        sim_assignments: list[_Assignment],
        orig_wagons: list[Wagon],
        sim_wagons: list[Wagon],
    ) -> float:
        """Compute cost impact as delta(total crew-days * cost_per_day).

        Positive = more expensive than the original plan.
        """
        orig_cost = self._total_cost(orig_assignments, orig_wagons)
        sim_cost = self._total_cost(sim_assignments, sim_wagons)
        return sim_cost - orig_cost

    def _total_cost(
        self,
        assignments: list[_Assignment],
        wagons: list[Wagon],
    ) -> float:
        cost_map: dict[str, float] = {w.id: w.cost_per_day for w in wagons}
        crew_map: dict[str, int] = {w.id: w.crew_size for w in wagons}
        total = 0.0
        for a in assignments:
            cpd = cost_map.get(a.wagon_id, 0.0)
            crew = crew_map.get(a.wagon_id, 1)
            total += a.duration_days * cpd * crew
        return total

    def _compute_risk_score(
        self,
        delta_days: int,
        stacking_count: int,
        n_zones: int,
        n_wagons: int,
    ) -> float:
        """Compute a risk-score delta in range [-1.0, +1.0].

        Factors:
        - Schedule compression/extension
        - Trade stacking density
        """
        max_cells = max(n_zones * n_wagons, 1)

        # Schedule component: normalised by a generous baseline
        schedule_risk = delta_days / max(max_cells, 20)
        schedule_risk = max(-1.0, min(1.0, schedule_risk))

        # Stacking component
        stacking_risk = stacking_count / max_cells
        stacking_risk = min(stacking_risk, 1.0)

        combined = 0.6 * schedule_risk + 0.4 * stacking_risk
        return max(-1.0, min(1.0, combined))

    # -----------------------------------------------------------------
    # Date helpers
    # -----------------------------------------------------------------

    @staticmethod
    def _parse_date(value: str | date) -> date:
        if isinstance(value, date):
            return value
        return parse_date(str(value)).date()

    @staticmethod
    def _next_working_day(d: date, working_days: list[int]) -> date:
        """Advance *d* to the next working day if it falls on a non-working day."""
        while d.weekday() not in working_days:
            d += timedelta(days=1)
        return d

    @staticmethod
    def _add_working_days(start: date, days: int, working_days: list[int]) -> date:
        """Add *days* working days to *start* (inclusive of start if start is
        a working day and days >= 1)."""
        if days <= 0:
            return start
        current = start
        # Ensure we start on a working day
        while current.weekday() not in working_days:
            current += timedelta(days=1)
        added = 0
        while added < days:
            current += timedelta(days=1)
            if current.weekday() in working_days:
                added += 1
        return current

    @staticmethod
    def _working_days_between(start: date, end: date, working_days: list[int]) -> int:
        """Count working days between start (inclusive) and end (inclusive)."""
        if end < start:
            return 0
        count = 0
        current = start
        while current <= end:
            if current.weekday() in working_days:
                count += 1
            current += timedelta(days=1)
        return count

    @staticmethod
    def _grid_end_date(assignments: list[_Assignment]) -> date:
        """Return the latest end date in the assignment list."""
        if not assignments:
            return date.today()
        return max(a.end_date for a in assignments)

    # -----------------------------------------------------------------
    # Histogram builder
    # -----------------------------------------------------------------

    @staticmethod
    def _build_histogram(data: np.ndarray, bins: int = 30) -> list[HistogramBin]:
        """Build histogram bins from an array of durations."""
        counts, edges = np.histogram(data, bins=bins)
        total = int(np.sum(counts))
        result: list[HistogramBin] = []
        for i in range(len(counts)):
            result.append(
                HistogramBin(
                    min_days=round(float(edges[i]), 2),
                    max_days=round(float(edges[i + 1]), 2),
                    count=int(counts[i]),
                    frequency=round(int(counts[i]) / total, 6) if total > 0 else 0.0,
                )
            )
        return result

    # -----------------------------------------------------------------
    # Lookup helpers
    # -----------------------------------------------------------------

    @staticmethod
    def _find_wagon(wagons: list[Wagon], wagon_id: str) -> Wagon | None:
        for w in wagons:
            if w.id == wagon_id:
                return w
        return None

    @staticmethod
    def _find_zone(zones: list[Zone], zone_id: str) -> Zone | None:
        for z in zones:
            if z.id == zone_id:
                return z
        return None
