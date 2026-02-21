"""Unit tests for WBS Builder service."""

from __future__ import annotations

import pytest

from app.domain.element import BIMElement
from app.services.wbs_builder import WBSBuilder


class TestWBSBuilder:
    def test_build_empty(self) -> None:
        builder = WBSBuilder()
        result = builder.build([])
        assert result == []

    def test_build_hierarchy(self, sample_elements: list[BIMElement]) -> None:
        builder = WBSBuilder()
        wbs = builder.build(sample_elements)

        assert len(wbs) > 0

        system_labels = [n.label for n in wbs]
        assert "Superstructure" in system_labels

        total_elements = sum(n.element_count for n in wbs)
        assert total_elements == len(sample_elements)

    def test_build_flat(self, sample_elements: list[BIMElement]) -> None:
        builder = WBSBuilder()
        flat = builder.build_flat(sample_elements)

        assert len(flat) > 0

        for row in flat:
            assert "system" in row
            assert "classification_code" in row
            assert "storey" in row
            assert "quantity" in row
            assert "unit" in row
            assert "element_count" in row

    def test_wbs_nodes_have_codes(self, sample_elements: list[BIMElement]) -> None:
        builder = WBSBuilder()
        wbs = builder.build(sample_elements)

        for system_node in wbs:
            assert system_node.code.startswith("S")
            assert system_node.level == 1

            for cls_node in system_node.children:
                assert cls_node.level == 2
                assert cls_node.parent_code == system_node.code

                for storey_node in cls_node.children:
                    assert storey_node.level == 3
                    assert storey_node.parent_code == cls_node.code
                    assert storey_node.element_count > 0

    def test_wbs_quantity_rollup(self, sample_elements: list[BIMElement]) -> None:
        builder = WBSBuilder()
        wbs = builder.build(sample_elements)

        for system_node in wbs:
            child_sum = sum(c.quantity for c in system_node.children)
            assert abs(system_node.quantity - child_sum) < 0.01

    def test_substructure_classification(self, sample_elements: list[BIMElement]) -> None:
        builder = WBSBuilder()
        wbs = builder.build(sample_elements)

        system_labels = [n.label for n in wbs]
        assert "Substructure" in system_labels

        sub_node = next(n for n in wbs if n.label == "Substructure")
        assert sub_node.element_count == 1
