"""Unit tests for Cost Binder service."""

from __future__ import annotations

import pytest

from app.domain.element import BIMElement
from app.domain.cost import CurrencyCode
from app.services.cost_binder import CostBinder


class TestCostBinder:
    def test_generate_cost_items(self, sample_elements: list[BIMElement]) -> None:
        binder = CostBinder()
        items = binder.generate_cost_items(sample_elements)

        assert len(items) > 0
        for item in items:
            assert item.cost_id.startswith("CI-")
            assert item.quantity > 0 or item.unit == "ea"
            assert len(item.element_ids) > 0

    def test_cost_items_linked_to_elements(self, sample_elements: list[BIMElement]) -> None:
        binder = CostBinder()
        items = binder.generate_cost_items(sample_elements)

        linked_count = sum(
            1 for elem in sample_elements
            if len(elem.linked_cost_items) > 0
        )
        assert linked_count > 0

    def test_currency_setting(self, sample_elements: list[BIMElement]) -> None:
        binder = CostBinder(currency=CurrencyCode.EUR)
        items = binder.generate_cost_items(sample_elements)

        for item in items:
            assert item.currency == CurrencyCode.EUR

    def test_unit_rate_zero(self, sample_elements: list[BIMElement]) -> None:
        binder = CostBinder()
        items = binder.generate_cost_items(sample_elements)

        for item in items:
            assert item.unit_rate == 0.0
            assert item.total_cost == 0.0

    def test_empty_elements(self) -> None:
        binder = CostBinder()
        items = binder.generate_cost_items([])
        assert items == []

    def test_grouped_by_system_and_classification(self, sample_elements: list[BIMElement]) -> None:
        binder = CostBinder()
        items = binder.generate_cost_items(sample_elements)

        total_element_refs = sum(len(ci.element_ids) for ci in items)
        assert total_element_refs == len(sample_elements)
