# hub-service -- SmartCon360 Hub

## Overview

Master orchestrator service for SmartCon360. Aggregates data from all 12 modules, calculates Project Health Score, manages module licensing, and provides cross-module analytics.

**Module:** SmartCon360 Hub | **Port:** 3018 | **Tech:** Node.js 22 / Express / Prisma | **Layer:** 1+2 | **Status:** Phase 2 -- Scaffold

## Key Endpoints

- GET /api/v1/hub/health-score
- GET /api/v1/hub/dashboard
- GET /api/v1/hub/modules
- PUT /api/v1/hub/modules/:id/license
- GET /api/v1/hub/analytics
- GET /api/v1/hub/alerts

## Cross-Module Integration

- ALL modules: Aggregates KPIs for Project Health Score
- analytics-service: Advanced cross-module analytics
- ai-concierge: Natural language cross-module queries
