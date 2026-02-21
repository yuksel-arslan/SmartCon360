"""Unit tests for LBS Builder service."""

from __future__ import annotations

import pytest

from app.domain.element import BIMElement
from app.services.lbs_builder import LBSBuilder


class TestLBSBuilder:
    def test_build_basic(self, sample_elements: list[BIMElement]) -> None:
        builder = LBSBuilder()
        storeys = ["Level 1", "Level 2", "Basement"]
        spaces = ["Room A", "Room B"]

        lbs = builder.build(sample_elements, storeys, spaces)

        assert lbs.node_type == "site"
        assert lbs.level == 0
        assert len(lbs.children) == 1

        building = lbs.children[0]
        assert building.node_type == "building"
        assert len(building.children) >= 2

    def test_build_storey_order(self, sample_elements: list[BIMElement]) -> None:
        builder = LBSBuilder()
        storeys = ["Level 1", "Level 2", "Basement"]

        lbs = builder.build(sample_elements, storeys, [])
        building = lbs.children[0]

        storey_labels = [c.label for c in building.children]
        assert storey_labels[0] == "Level 1"
        assert storey_labels[1] == "Level 2"
        assert storey_labels[2] == "Basement"

    def test_build_element_count(self, sample_elements: list[BIMElement]) -> None:
        builder = LBSBuilder()
        lbs = builder.build(sample_elements, [], [])

        assert lbs.element_count == len(sample_elements)

    def test_build_flat(self, sample_elements: list[BIMElement]) -> None:
        builder = LBSBuilder()
        flat = builder.build_flat(sample_elements)

        assert len(flat) > 0
        for row in flat:
            assert "storey" in row
            assert "space" in row
            assert "element_count" in row

    def test_build_with_spaces(self, sample_elements: list[BIMElement]) -> None:
        builder = LBSBuilder()
        lbs = builder.build(sample_elements, ["Level 1", "Level 2", "Basement"], ["Room A", "Room B"])

        building = lbs.children[0]
        level1 = building.children[0]

        space_names = [c.label for c in level1.children]
        assert len(space_names) > 0

    def test_build_codes_format(self, sample_elements: list[BIMElement]) -> None:
        builder = LBSBuilder()
        lbs = builder.build(sample_elements, ["Level 1"], [])

        assert lbs.code == "SITE"
        building = lbs.children[0]
        assert building.code == "SITE.B01"

        if building.children:
            storey = building.children[0]
            assert storey.code.startswith("SITE.B01.F")
