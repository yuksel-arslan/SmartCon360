"""Contract Policy Client for TaktFlow.

Fetches takt_flow policies from the core-service contract-profile API.
Used to determine:
  - progress.unit: how takt zone progress is tracked (measured_quantity, milestone_pct, etc.)
  - design.concurrent: whether fast-track scheduling is enabled
"""

import os
import httpx
from typing import Optional

CORE_SERVICE_URL = os.getenv("CORE_SERVICE_URL", "http://localhost:3001")


class TaktFlowPolicies:
    """Resolved TaktFlow policies from contract profile."""

    def __init__(
        self,
        progress_unit: str = "percentage",
        design_concurrent: bool = False,
    ):
        self.progress_unit = progress_unit
        self.design_concurrent = design_concurrent

    def to_dict(self) -> dict:
        return {
            "progress_unit": self.progress_unit,
            "design_concurrent": self.design_concurrent,
        }


_DEFAULTS = TaktFlowPolicies()


async def get_takt_policies(project_id: str) -> TaktFlowPolicies:
    """Fetch TaktFlow-specific policies from core-service.

    Falls back to defaults if core-service is unreachable or
    no contract profile exists.
    """
    try:
        url = f"{CORE_SERVICE_URL}/projects/{project_id}/contract-profile?module=takt_flow"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)

        if resp.status_code != 200:
            return _DEFAULTS

        data = resp.json()
        if not data.get("data") or not data.get("meta", {}).get("hasProfile"):
            return _DEFAULTS

        policies = data["data"].get("policies", [])
        policy_map: dict[str, str] = {}
        for p in policies:
            policy_map[p["policyKey"]] = p["policyValue"]

        return TaktFlowPolicies(
            progress_unit=policy_map.get("progress.unit", "percentage"),
            design_concurrent=policy_map.get("design.concurrent", "false") == "true",
        )
    except Exception:
        return _DEFAULTS


def get_takt_policies_sync(project_id: str) -> TaktFlowPolicies:
    """Synchronous version for non-async contexts."""
    try:
        url = f"{CORE_SERVICE_URL}/projects/{project_id}/contract-profile?module=takt_flow"
        resp = httpx.get(url, timeout=5.0)

        if resp.status_code != 200:
            return _DEFAULTS

        data = resp.json()
        if not data.get("data") or not data.get("meta", {}).get("hasProfile"):
            return _DEFAULTS

        policies = data["data"].get("policies", [])
        policy_map: dict[str, str] = {}
        for p in policies:
            policy_map[p["policyKey"]] = p["policyValue"]

        return TaktFlowPolicies(
            progress_unit=policy_map.get("progress.unit", "percentage"),
            design_concurrent=policy_map.get("design.concurrent", "false") == "true",
        )
    except Exception:
        return _DEFAULTS
