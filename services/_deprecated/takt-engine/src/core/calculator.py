"""Core takt planning computation algorithms."""

from datetime import date, timedelta
from dataclasses import dataclass


@dataclass
class ZoneInput:
    id: str
    name: str
    sequence: int
    area_sqm: float = 0


@dataclass
class WagonInput:
    id: str
    trade_id: str
    sequence: int
    duration_days: int
    buffer_after: int = 0


@dataclass
class Assignment:
    zone_id: str
    wagon_id: str
    period_number: int
    planned_start: date
    planned_end: date


def calculate_total_periods(num_zones: int, num_trades: int, buffer_size: int = 0) -> int:
    """Calculate total takt periods needed.
    
    Formula: zones + trades - 1 + buffer_periods
    Buffer periods = buffer_size * (num_trades - 1) for time buffers
    """
    buffer_periods = buffer_size * (num_trades - 1)
    return num_zones + num_trades - 1 + buffer_periods


def add_working_days(start: date, days: int, working_days: list[int] | None = None) -> date:
    """Add N working days to a date.
    
    working_days: list of weekday numbers (0=Mon, 6=Sun). Default Mon-Fri.
    """
    if working_days is None:
        working_days = [0, 1, 2, 3, 4]  # Mon-Fri
    
    current = start
    added = 0
    while added < days:
        current += timedelta(days=1)
        if current.weekday() in working_days:
            added += 1
    return current


def generate_takt_grid(
    zones: list[ZoneInput],
    wagons: list[WagonInput],
    start_date: date,
    takt_time: int,
    working_days: list[int] | None = None,
) -> list[Assignment]:
    """Generate the full takt assignment grid.
    
    For each zone z (1-indexed) and wagon w (1-indexed):
        period = z + (w - 1) + sum(buffers before w)
        start = project_start + (period - 1) * takt_time working days
        end = start + wagon.duration_days working days
    
    Returns list of Assignment objects.
    """
    if working_days is None:
        working_days = [0, 1, 2, 3, 4]
    
    # Sort by sequence
    sorted_zones = sorted(zones, key=lambda z: z.sequence)
    sorted_wagons = sorted(wagons, key=lambda w: w.sequence)
    
    # Pre-compute cumulative buffer offsets
    buffer_offsets = [0]  # wagon 0 has no buffer before it
    for i in range(1, len(sorted_wagons)):
        buffer_offsets.append(
            buffer_offsets[i - 1] + sorted_wagons[i - 1].buffer_after
        )
    
    assignments: list[Assignment] = []
    
    for zone in sorted_zones:
        for i, wagon in enumerate(sorted_wagons):
            # Period number (1-based)
            period = zone.sequence + i + buffer_offsets[i]
            
            # Calculate dates
            days_offset = (period - 1) * takt_time
            planned_start = add_working_days(start_date, days_offset, working_days)
            planned_end = add_working_days(planned_start, wagon.duration_days - 1, working_days)
            
            assignments.append(Assignment(
                zone_id=zone.id,
                wagon_id=wagon.id,
                period_number=period,
                planned_start=planned_start,
                planned_end=planned_end,
            ))
    
    return assignments


def detect_trade_stacking(
    assignments: list[Assignment],
) -> list[dict]:
    """Detect zones where multiple trades overlap in the same period.
    
    Trade stacking = two different wagons active in the same zone during
    overlapping date ranges.
    """
    conflicts = []
    
    # Group by zone
    zone_assignments: dict[str, list[Assignment]] = {}
    for a in assignments:
        zone_assignments.setdefault(a.zone_id, []).append(a)
    
    for zone_id, zone_assigns in zone_assignments.items():
        for i, a1 in enumerate(zone_assigns):
            for a2 in zone_assigns[i + 1:]:
                # Check date overlap
                if a1.planned_start <= a2.planned_end and a2.planned_start <= a1.planned_end:
                    conflicts.append({
                        "zone_id": zone_id,
                        "wagon_1": a1.wagon_id,
                        "wagon_2": a2.wagon_id,
                        "period_1": a1.period_number,
                        "period_2": a2.period_number,
                        "overlap_start": max(a1.planned_start, a2.planned_start).isoformat(),
                        "overlap_end": min(a1.planned_end, a2.planned_end).isoformat(),
                    })
    
    return conflicts


def compute_flowline_data(
    zones: list[ZoneInput],
    wagons: list[WagonInput],
    assignments: list[Assignment],
    takt_time: int,
) -> dict:
    """Compute flowline visualization data.
    
    Returns data structure for D3.js rendering:
    - zones with y-positions
    - wagons with line segments
    """
    sorted_zones = sorted(zones, key=lambda z: z.sequence)
    
    zone_data = [
        {"id": z.id, "name": z.name, "y_index": i}
        for i, z in enumerate(sorted_zones)
    ]
    
    zone_seq_map = {z.id: z.sequence - 1 for z in sorted_zones}
    
    wagon_data = []
    for wagon in sorted(wagons, key=lambda w: w.sequence):
        segments = []
        wagon_assigns = [a for a in assignments if a.wagon_id == wagon.id]
        wagon_assigns.sort(key=lambda a: a.period_number)
        
        for a in wagon_assigns:
            y = zone_seq_map.get(a.zone_id, 0)
            x_start = (a.period_number - 1) * takt_time
            x_end = x_start + wagon.duration_days
            segments.append({
                "zone_index": y,
                "x_start": x_start,
                "x_end": x_end,
                "y": y,
                "status": "planned",
                "progress": 0,
            })
        
        wagon_data.append({
            "trade_id": wagon.trade_id,
            "wagon_id": wagon.id,
            "segments": segments,
        })
    
    total_periods = calculate_total_periods(len(zones), len(wagons))
    
    return {
        "zones": zone_data,
        "wagons": wagon_data,
        "total_days": total_periods * takt_time,
        "takt_time": takt_time,
    }
