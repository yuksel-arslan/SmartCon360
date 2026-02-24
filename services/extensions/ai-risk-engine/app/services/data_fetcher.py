"""
AI Risk Engine — Data Fetcher

Fetches project data from core-service to feed the rule engine.
Follows the architectural rule: extension services read from core services
via API, not direct database access.
"""

import os

import httpx

CORE_SERVICE_URL = os.getenv("CORE_SERVICE_URL", "http://localhost:3001")
OPS_SERVICE_URL = os.getenv("OPS_SERVICE_URL", "http://localhost:3002")
TIMEOUT = 10.0


async def fetch_project_activities(
    project_id: str,
    user_id: str | None = None,
) -> list[dict]:
    """
    Fetch activity data for a project from core-service.
    Includes takt assignments, progress records, and constraint info.
    """
    headers: dict[str, str] = {}
    if user_id:
        headers["x-user-id"] = user_id

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # Fetch takt plan with assignments
        try:
            resp = await client.get(
                f"{CORE_SERVICE_URL}/projects/{project_id}",
                headers=headers,
            )
            if resp.status_code != 200:
                return []
            project_data = resp.json().get("data", {})
        except httpx.RequestError:
            return []

        # Fetch progress data
        progress_data: list[dict] = []
        try:
            resp = await client.get(
                f"{CORE_SERVICE_URL}/progress/projects/{project_id}/records",
                headers=headers,
            )
            if resp.status_code == 200:
                progress_data = resp.json().get("data", [])
        except httpx.RequestError:
            pass

        # Fetch constraints
        constraints: list[dict] = []
        try:
            resp = await client.get(
                f"{CORE_SERVICE_URL}/constraints",
                params={"projectId": project_id},
                headers=headers,
            )
            if resp.status_code == 200:
                constraints = resp.json().get("data", [])
        except httpx.RequestError:
            pass

        # Build activity data from available sources
        activities = _build_activity_data(
            project_data, progress_data, constraints
        )
        return activities


async def fetch_project_context(
    project_id: str,
    user_id: str | None = None,
) -> dict:
    """
    Fetch project-level context metrics:
    EVM data (CPI, SPI), PPC, resource utilization, constraints summary.
    """
    headers: dict[str, str] = {}
    if user_id:
        headers["x-user-id"] = user_id

    context: dict = {}

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # Fetch EVM data from cost module
        try:
            resp = await client.get(
                f"{CORE_SERVICE_URL}/cost/evm/project/{project_id}/snapshot",
                headers=headers,
            )
            if resp.status_code == 200:
                evm = resp.json().get("data", {})
                context["cpi"] = evm.get("cpi")
                context["spi"] = evm.get("spi")
        except httpx.RequestError:
            pass

        # Fetch PPC data
        try:
            resp = await client.get(
                f"{CORE_SERVICE_URL}/progress/projects/{project_id}/ppc",
                headers=headers,
            )
            if resp.status_code == 200:
                ppc_data = resp.json().get("data", {})
                context["current_ppc"] = ppc_data.get("currentPpc")
                context["previous_ppc"] = ppc_data.get("previousPpc")
        except httpx.RequestError:
            pass

        # Fetch constraints summary
        try:
            resp = await client.get(
                f"{CORE_SERVICE_URL}/constraints",
                params={"projectId": project_id},
                headers=headers,
            )
            if resp.status_code == 200:
                constraints = resp.json().get("data", [])
                open_constraints = [
                    c
                    for c in constraints
                    if c.get("status") in ("open", "in_progress")
                ]
                context["open_constraints"] = len(open_constraints)
                context["critical_constraints"] = sum(
                    1
                    for c in open_constraints
                    if c.get("priority") == "critical"
                )
        except httpx.RequestError:
            pass

    return context


def _build_activity_data(
    project_data: dict,
    progress_data: list[dict],
    constraints: list[dict],
) -> list[dict]:
    """
    Build activity data records from project, progress, and constraint data.
    Each activity record contains the fields needed by the rule engine.
    """
    trades = project_data.get("trades", [])
    locations = project_data.get("locations", [])

    # Build progress lookup by trade+location
    progress_lookup: dict[str, dict] = {}
    for record in progress_data:
        key = f"{record.get('tradeId')}:{record.get('locationId')}"
        progress_lookup[key] = record

    # Build constraint lookup by trade/location
    constraint_lookup: dict[str, list[dict]] = {}
    for c in constraints:
        trade_id = c.get("tradeId", "")
        if trade_id:
            constraint_lookup.setdefault(trade_id, []).append(c)

    activities: list[dict] = []
    for trade in trades:
        trade_id = trade.get("id", "")
        for location in locations:
            loc_id = location.get("id", "")
            key = f"{trade_id}:{loc_id}"
            progress = progress_lookup.get(key, {})

            activity = {
                "id": f"{trade_id}:{loc_id}",
                "trade_id": trade_id,
                "trade_name": trade.get("name", ""),
                "location_id": loc_id,
                "location_name": location.get("name", ""),
                "percent_complete": progress.get("percentComplete"),
                "expected_percent": progress.get("expectedPercent"),
                "total_float": progress.get("totalFloat"),
                "is_critical": progress.get("isCritical", False),
                "is_outdoor": location.get("locationType") == "site",
                "predecessors": [],
            }

            # Add constraint-based predecessor delay info
            trade_constraints = constraint_lookup.get(trade_id, [])
            predecessor_info = [
                {
                    "id": c.get("id"),
                    "is_delayed": c.get("status") in ("open", "in_progress")
                    and c.get("category") == "predecessor",
                }
                for c in trade_constraints
                if c.get("category") == "predecessor"
            ]
            activity["predecessors"] = predecessor_info

            activities.append(activity)

    return activities
