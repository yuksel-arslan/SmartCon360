# sustainability-service -- GreenSite

## Overview

Environmental sustainability and ESG tracking service for SmartCon360. Tracks carbon emissions, waste management, energy consumption, and LEED/BREEAM certification progress.

**Module:** GreenSite | **Port:** 3017 | **Tech:** Node.js 22 / Express / Prisma | **Layer:** 1 | **Status:** Phase 2 -- Scaffold

## Key Endpoints

- GET/POST /api/v1/sustainability/carbon
- GET/POST /api/v1/sustainability/waste
- GET/POST /api/v1/sustainability/energy
- GET/PUT /api/v1/sustainability/certification
- GET/POST /api/v1/sustainability/incidents
- GET /api/v1/sustainability/dashboard

## Cross-Module Integration

- CostPilot: Carbon offset costs, waste disposal costs
- SafeZone: Environmental incidents linked
- Hub: ESG score in Project Health Score
