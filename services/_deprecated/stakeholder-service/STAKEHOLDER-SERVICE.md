# stakeholder-service -- StakeHub

## Overview

Stakeholder management service for SmartCon360. Manages stakeholder register, RACI authority matrix, decision log, and engagement tracking.

**Module:** StakeHub | **Port:** 3016 | **Tech:** Node.js 22 / Express / Prisma | **Layer:** 1 | **Status:** Phase 2 -- Scaffold

## Key Endpoints

- GET/POST /api/v1/stakeholders/register
- GET/POST /api/v1/stakeholders/raci
- GET/POST /api/v1/stakeholders/decisions
- GET /api/v1/stakeholders/org-chart

## Cross-Module Integration

- CommHub: Stakeholder notification preferences
- ClaimShield: Claim escalation to stakeholders
- Hub: Stakeholder engagement score in Project Health Score
