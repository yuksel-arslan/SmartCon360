# API.md — TaktFlow AI Complete API Reference

## Base: `/api/v1` | Auth: Bearer JWT | Format: JSON

## Response: `{ data, meta, error }`

---

## AUTH /auth
- POST /auth/register → `{email, password, first_name, last_name, company}` → `{user, tokens}`
- POST /auth/login → `{email, password}` → `{user, tokens}`
- POST /auth/refresh → `{refresh_token}` → `{tokens}`
- POST /auth/logout → 204
- GET /auth/me → `{user}`
- PATCH /auth/me → `{fields}` → `{user}`
- GET /auth/google → 302 OAuth
- GET /auth/google/callback → `{user, tokens}`

## PROJECTS /projects
- GET /projects → List
- POST /projects → `{name, code, project_type, planned_start, planned_finish, default_takt_time, budget}` → `{project}`
- GET /projects/:id → Detail
- PATCH /projects/:id → Update
- DELETE /projects/:id → Archive

### LBS /projects/:id/locations
- GET → Tree
- POST → `{parent_id, name, location_type, area_sqm}` → `{location with code, path}`
- POST /bulk → `{locations[]}` → `{locations[]}`
- PATCH /:locId → Update
- DELETE /:locId → Delete
- POST /reorder → `{ids[]}` → 200

### Trades /projects/:id/trades
- GET → List
- POST → `{name, code, color, default_crew_size, predecessor_trade_ids}` → `{trade}`
- PATCH /:tradeId → Update
- DELETE /:tradeId → Delete

### Members /projects/:id/members
- GET → List
- POST → `{user_id, role}` → `{member}`
- PATCH /:uid → `{role}` → Update
- DELETE /:uid → Remove

## TAKT /takt
### Plans
- POST /takt/plans → `{project_id, name, takt_time, start_date, buffer_type, buffer_size, zone_ids, wagons[]}` → `{plan with assignments}`
- GET /takt/plans/:planId → Full plan data
- PATCH /takt/plans/:planId → Update
- DELETE /takt/plans/:planId → Delete
- POST /takt/plans/:planId/activate → Set active

### Zones & Wagons
- GET/POST /takt/plans/:planId/zones
- PATCH /takt/plans/:planId/zones/:zoneId
- POST /takt/plans/:planId/zones/reorder
- GET/POST /takt/plans/:planId/wagons
- PATCH /takt/plans/:planId/wagons/:wagonId

### Computation
- POST /takt/compute/grid → Recompute assignments
- POST /takt/compute/validate → Conflict check
- GET /takt/compute/summary/:planId → Stats

## AI PLANNER /ai
- POST /ai/generate-plan → `{project_id, target_duration, preferences}` → `{plans[3], recommendation}`
- POST /ai/optimize-plan → `{plan_id, optimize_for}` → `{optimized_plan}`
- POST /ai/suggest-zones → `{project_id}` → `{zone_suggestions[]}`
- POST /ai/suggest-sequence → `{project_id, trade_ids}` → `{optimal_sequence[]}`
- POST /ai/predict/delays → `{plan_id}` → `{predictions[]}`
- POST /ai/predict/duration → `{trade_id, zone_id}` → `{estimated_days, confidence}`
- GET /ai/predict/project-health/:projectId → `{score, factors[]}`

## FLOWLINE /flowline
- GET /flowline/:planId → `{zones[], wagons[{segments[]}], today_x}`
- GET /flowline/:planId/comparison → Planned vs actual
- GET /flowline/:planId/buffers → Buffer status
- GET /flowline/:planId/critical-path → Critical chain
- GET /flowline/:planId/export/svg → SVG file

## CONSTRAINTS /constraints
- GET /constraints?project_id&status&category&priority → List
- POST /constraints → `{project_id, title, category, priority, zone_id, trade_id, assigned_to, target_date}` → `{constraint}`
- GET /constraints/:id → Detail
- PATCH /constraints/:id → Update
- PATCH /constraints/:id/resolve → `{resolution_notes}` → Resolved
- GET /constraints/stats?project_id → Stats
- GET /constraints/crr?project_id → CRR metric
- POST /constraints/auto-detect → `{plan_id}` → AI detected constraints
- GET /constraints/lookahead?project_id&weeks=6 → Upcoming

## PROGRESS /progress
- POST /progress/update → `{assignment_id, progress_pct, status, notes, photo_urls[]}` → `{update}`
- GET /progress/assignment/:id → History
- POST /progress/ppc/calculate → `{project_id, week_start}` → `{ppc_record}`
- GET /progress/ppc/history?project_id → PPC trend
- GET /progress/ppc/current?project_id → This week
- GET /progress/ppc/by-trade?project_id → Per trade
- POST /progress/variance → `{assignment_id, reason_category, description, corrective_action}` → `{variance}`
- GET /progress/variance/reasons?project_id → Top reasons

## SIMULATION /simulate
- POST /simulate/what-if → `{plan_id, changes[]}` → `{original, simulated, delta, conflicts}`
- POST /simulate/monte-carlo → `{plan_id, iterations}` → `{p50, p80, p95 dates, distribution}`
- POST /simulate/compare → `{scenarios[]}` → `{comparison_table}`

## RESOURCES /resources
- GET/POST /resources/crews?project_id
- PATCH /resources/crews/:id
- GET/POST /resources/equipment?project_id
- GET/POST /resources/materials?project_id
- POST /resources/assign → `{assignment_id, crew_id, equipment_ids[]}`
- GET /resources/utilization?project_id → Report
- GET /resources/histogram?plan_id → Chart data
- GET /resources/overallocation?plan_id → Warnings

## NOTIFICATIONS /notifications
- GET /notifications → Paginated list
- PATCH /notifications/:id/read → Mark read
- POST /notifications/read-all → Mark all read
- GET /notifications/unread-count → Count

## REPORTS /reports
- POST /reports/generate → `{project_id, type, period_start, period_end, format}` → `{report}`
- GET /reports/:id → Metadata
- GET /reports/:id/download → File
- GET /reports/list/:projectId → List

## BIM /bim
- POST /bim/upload → IFC file → `{file_id, structure}`
- GET /bim/:fileId/structure → Building hierarchy
- POST /bim/:fileId/suggest-zones → AI zone suggestions
- GET /bim/:fileId/quantities → BOQ

## AI CONCIERGE /concierge
- POST /concierge/ask → `{project_id, message}` → `{answer, sources, suggestions, confidence}`
- POST /concierge/ask/stream → SSE streaming response
- GET /concierge/history → Chat history

## ANALYTICS /analytics
- GET /analytics/dashboard/:projectId → `{ppc, takt_progress, open_constraints, health_score}`
- GET /analytics/ppc-trend/:projectId → Weekly PPC array
- GET /analytics/trade-reliability/:projectId → TRI per trade
- GET /analytics/constraint-rate/:projectId → CRR trend
- GET /analytics/buffer-status/:planId → Buffer penetration
- GET /analytics/s-curve/:projectId → Planned vs actual
- GET /analytics/project-health/:projectId → AI score 0-100

## WebSocket Events (Socket.io)
- `takt:progress-updated` → `{assignment_id, progress_pct, status}`
- `takt:constraint-alert` → `{constraint_id, title, severity}`
- `takt:plan-changed` → `{plan_id, change_type}`
- `takt:trade-stacking` → `{zone_id, period, trades[]}`
- `takt:ai-suggestion` → `{type, message, action}`
- `notification:new` → `{notification}`

## Rate Limits
- /auth/*: 10/min | /ai/*: 10/min | /concierge/*: 20/min | /simulate/*: 10/min | Others: 100/min
