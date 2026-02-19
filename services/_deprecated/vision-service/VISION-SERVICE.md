# vision-service -- VisionAI

## Overview

AI-powered visual progress tracking service for SmartCon360. Uses Gemini Vision to analyze site photos for progress detection, defect identification, and before/after comparison.

**Module:** VisionAI | **Port:** 8008 | **Tech:** Python 3.11 / FastAPI / Gemini Vision | **Layer:** 2 | **Status:** Phase 3 -- Scaffold

## Key Endpoints

- POST /api/v1/vision/upload
- POST /api/v1/vision/analyze
- GET /api/v1/vision/photos
- GET /api/v1/vision/defects
- GET /api/v1/vision/progress

## Cross-Module Integration

- QualityGate: Defect detection -> auto-NCR creation
- TaktFlow: Progress detection -> takt progress update
- CommHub: Visual progress reports distribution
