"""Zone Generator service.

Generates takt-ready zones from BIM spatial structure.
Zones are created based on:
  - Storey grouping
  - Space clustering within storeys
  - Element grouping by trade / system

Output is compatible with SmartCon360 TaktFlow module.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Optional

from ..domain.element import BIMElement
from ..domain.quantity import QuantityType
from ..domain.zone import TaktZone, ZoneType

logger = logging.getLogger("bim_engine.zone_generator")

TRADE_SEQUENCE_DEFAULT: list[str] = [
    "Substructure",
    "Superstructure",
    "MEP-Rough",
    "Finishes",
    "MEP-Final",
    "External",
]


class ZoneGenerator:
    """Generates takt-ready zones from IFC spatial structure.

    Produces zones compatible with SmartCon360 TaktFlow module
    for takt planning and flowline visualization.
    """

    def generate_storey_zones(
        self,
        elements: list[BIMElement],
        storeys: list[str],
    ) -> list[TaktZone]:
        """Generate one zone per storey."""
        storey_elements: dict[str, list[BIMElement]] = defaultdict(list)

        for elem in elements:
            storey = elem.storey or "Unknown Storey"
            storey_elements[storey].append(elem)

        storey_order = storeys if storeys else sorted(storey_elements.keys())
        zones: list[TaktZone] = []
        seq = 1

        for storey_name in storey_order:
            elems = storey_elements.get(storey_name, [])
            if not elems:
                continue

            zone_id = f"Z-{seq:03d}"
            total_volume, total_area = self._compute_zone_metrics(elems)

            trades = self._detect_trade_sequence(elems)

            zone = TaktZone(
                zone_id=zone_id,
                name=f"Zone {storey_name}",
                zone_type=ZoneType.STOREY,
                storey=storey_name,
                element_ids=[e.global_id for e in elems],
                element_count=len(elems),
                total_volume=total_volume,
                total_area=total_area,
                sequence_order=seq,
                trade_sequence=trades,
            )
            zones.append(zone)
            seq += 1

        for storey_name in sorted(storey_elements.keys()):
            if storey_name in storey_order:
                continue
            elems = storey_elements[storey_name]
            if not elems:
                continue

            zone_id = f"Z-{seq:03d}"
            total_volume, total_area = self._compute_zone_metrics(elems)
            trades = self._detect_trade_sequence(elems)

            zone = TaktZone(
                zone_id=zone_id,
                name=f"Zone {storey_name}",
                zone_type=ZoneType.STOREY,
                storey=storey_name,
                element_ids=[e.global_id for e in elems],
                element_count=len(elems),
                total_volume=total_volume,
                total_area=total_area,
                sequence_order=seq,
                trade_sequence=trades,
            )
            zones.append(zone)
            seq += 1

        logger.info("Generated %d storey zones", len(zones))
        return zones

    def generate_space_zones(
        self,
        elements: list[BIMElement],
        storeys: list[str],
    ) -> list[TaktZone]:
        """Generate zones by storey + space clustering."""
        storey_space_elements: dict[str, dict[str, list[BIMElement]]] = defaultdict(
            lambda: defaultdict(list)
        )

        for elem in elements:
            storey = elem.storey or "Unknown Storey"
            space = elem.space or "General"
            storey_space_elements[storey][space].append(elem)

        storey_order = storeys if storeys else sorted(storey_space_elements.keys())
        zones: list[TaktZone] = []
        seq = 1

        for storey_name in storey_order:
            space_groups = storey_space_elements.get(storey_name, {})
            if not space_groups:
                continue

            for space_name in sorted(space_groups.keys()):
                elems = space_groups[space_name]
                if not elems:
                    continue

                zone_id = f"Z-{seq:03d}"
                total_volume, total_area = self._compute_zone_metrics(elems)
                trades = self._detect_trade_sequence(elems)

                zone = TaktZone(
                    zone_id=zone_id,
                    name=f"Zone {storey_name} - {space_name}",
                    zone_type=ZoneType.SPACE,
                    storey=storey_name,
                    space_names=[space_name],
                    element_ids=[e.global_id for e in elems],
                    element_count=len(elems),
                    total_volume=total_volume,
                    total_area=total_area,
                    sequence_order=seq,
                    trade_sequence=trades,
                )
                zones.append(zone)
                seq += 1

        logger.info("Generated %d space zones", len(zones))
        return zones

    def generate_clustered_zones(
        self,
        elements: list[BIMElement],
        storeys: list[str],
        max_elements_per_zone: int = 50,
    ) -> list[TaktZone]:
        """Generate zones by clustering elements within storeys.

        If a storey has more elements than max_elements_per_zone,
        it is split into multiple zones based on system grouping.
        """
        storey_elements: dict[str, list[BIMElement]] = defaultdict(list)

        for elem in elements:
            storey = elem.storey or "Unknown Storey"
            storey_elements[storey].append(elem)

        storey_order = storeys if storeys else sorted(storey_elements.keys())
        zones: list[TaktZone] = []
        seq = 1

        for storey_name in storey_order:
            elems = storey_elements.get(storey_name, [])
            if not elems:
                continue

            if len(elems) <= max_elements_per_zone:
                zone_id = f"Z-{seq:03d}"
                total_volume, total_area = self._compute_zone_metrics(elems)
                trades = self._detect_trade_sequence(elems)

                zone = TaktZone(
                    zone_id=zone_id,
                    name=f"Zone {storey_name}",
                    zone_type=ZoneType.CLUSTER,
                    storey=storey_name,
                    element_ids=[e.global_id for e in elems],
                    element_count=len(elems),
                    total_volume=total_volume,
                    total_area=total_area,
                    sequence_order=seq,
                    trade_sequence=trades,
                )
                zones.append(zone)
                seq += 1
            else:
                system_groups: dict[str, list[BIMElement]] = defaultdict(list)
                for elem in elems:
                    system_groups[elem.resolved_system.value].append(elem)

                cluster_idx = 1
                for system_name in TRADE_SEQUENCE_DEFAULT:
                    group_elems = system_groups.get(system_name, [])
                    if not group_elems:
                        continue

                    for batch_start in range(0, len(group_elems), max_elements_per_zone):
                        batch = group_elems[batch_start:batch_start + max_elements_per_zone]
                        zone_id = f"Z-{seq:03d}"
                        total_volume, total_area = self._compute_zone_metrics(batch)
                        trades = self._detect_trade_sequence(batch)

                        zone = TaktZone(
                            zone_id=zone_id,
                            name=f"Zone {storey_name}-{system_name}-{cluster_idx:02d}",
                            zone_type=ZoneType.CLUSTER,
                            storey=storey_name,
                            element_ids=[e.global_id for e in batch],
                            element_count=len(batch),
                            total_volume=total_volume,
                            total_area=total_area,
                            sequence_order=seq,
                            trade_sequence=trades,
                        )
                        zones.append(zone)
                        seq += 1
                        cluster_idx += 1

                for system_name in sorted(system_groups.keys()):
                    if system_name in TRADE_SEQUENCE_DEFAULT:
                        continue
                    group_elems = system_groups[system_name]
                    if not group_elems:
                        continue
                    for batch_start in range(0, len(group_elems), max_elements_per_zone):
                        batch = group_elems[batch_start:batch_start + max_elements_per_zone]
                        zone_id = f"Z-{seq:03d}"
                        total_volume, total_area = self._compute_zone_metrics(batch)
                        trades = self._detect_trade_sequence(batch)

                        zone = TaktZone(
                            zone_id=zone_id,
                            name=f"Zone {storey_name}-{system_name}-{cluster_idx:02d}",
                            zone_type=ZoneType.CLUSTER,
                            storey=storey_name,
                            element_ids=[e.global_id for e in batch],
                            element_count=len(batch),
                            total_volume=total_volume,
                            total_area=total_area,
                            sequence_order=seq,
                            trade_sequence=trades,
                        )
                        zones.append(zone)
                        seq += 1
                        cluster_idx += 1

        logger.info("Generated %d clustered zones", len(zones))
        return zones

    def _compute_zone_metrics(
        self, elements: list[BIMElement]
    ) -> tuple[float, float]:
        """Compute total volume and area for a zone."""
        total_volume = 0.0
        total_area = 0.0

        for elem in elements:
            for q in elem.quantities:
                if q.quantity_type == QuantityType.VOLUME:
                    total_volume += q.value
                elif q.quantity_type == QuantityType.AREA:
                    total_area += q.value

        return total_volume, total_area

    def _detect_trade_sequence(self, elements: list[BIMElement]) -> list[str]:
        """Detect the trade sequence present in the zone elements."""
        systems_present: set[str] = set()
        for elem in elements:
            systems_present.add(elem.resolved_system.value)

        ordered: list[str] = []
        for system in TRADE_SEQUENCE_DEFAULT:
            if system in systems_present:
                ordered.append(system)
        for system in sorted(systems_present):
            if system not in ordered:
                ordered.append(system)

        return ordered
