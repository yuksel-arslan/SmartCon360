"""Unit tests for Zone Generator service."""

from __future__ import annotations

import pytest

from app.domain.element import BIMElement
from app.domain.zone import ZoneType
from app.services.zone_generator import ZoneGenerator


class TestZoneGenerator:
    def test_generate_storey_zones(self, sample_elements: list[BIMElement]) -> None:
        gen = ZoneGenerator()
        storeys = ["Level 1", "Level 2", "Basement"]
        zones = gen.generate_storey_zones(sample_elements, storeys)

        assert len(zones) > 0
        for zone in zones:
            assert zone.zone_type == ZoneType.STOREY
            assert zone.zone_id.startswith("Z-")
            assert zone.element_count > 0

    def test_storey_zone_order(self, sample_elements: list[BIMElement]) -> None:
        gen = ZoneGenerator()
        storeys = ["Level 1", "Level 2", "Basement"]
        zones = gen.generate_storey_zones(sample_elements, storeys)

        for i in range(len(zones) - 1):
            assert zones[i].sequence_order < zones[i + 1].sequence_order

    def test_generate_space_zones(self, sample_elements: list[BIMElement]) -> None:
        gen = ZoneGenerator()
        storeys = ["Level 1", "Level 2", "Basement"]
        zones = gen.generate_space_zones(sample_elements, storeys)

        assert len(zones) > 0
        for zone in zones:
            assert zone.zone_type == ZoneType.SPACE

    def test_generate_clustered_zones(self, sample_elements: list[BIMElement]) -> None:
        gen = ZoneGenerator()
        storeys = ["Level 1", "Level 2", "Basement"]
        zones = gen.generate_clustered_zones(sample_elements, storeys, max_elements_per_zone=5)

        assert len(zones) > 0
        for zone in zones:
            assert zone.zone_type == ZoneType.CLUSTER

    def test_trade_sequence_detected(self, sample_elements: list[BIMElement]) -> None:
        gen = ZoneGenerator()
        zones = gen.generate_storey_zones(sample_elements, ["Level 1"])

        for zone in zones:
            assert len(zone.trade_sequence) > 0

    def test_zone_metrics(self, sample_elements: list[BIMElement]) -> None:
        gen = ZoneGenerator()
        zones = gen.generate_storey_zones(sample_elements, ["Level 1"])

        level1_zone = next((z for z in zones if z.storey == "Level 1"), None)
        assert level1_zone is not None
        assert level1_zone.total_volume > 0

    def test_empty_elements(self) -> None:
        gen = ZoneGenerator()
        zones = gen.generate_storey_zones([], [])
        assert zones == []
