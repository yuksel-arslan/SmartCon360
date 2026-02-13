# REPORTING-SERVICE.md

## Overview
Generates AI-powered reports in PDF, PPTX, and DOCX formats. Uses Gemini for narrative generation and Jinja2 templates for document rendering. Supports weekly progress, executive summary, variance analysis, and custom reports.

## Tech Stack
- **Runtime:** Python 3.11
- **Framework:** FastAPI
- **AI:** Google Generative AI (Gemini 2.5 Flash)
- **Templating:** Jinja2
- **PDF:** WeasyPrint / reportlab
- **PPTX:** python-pptx
- **DOCX:** python-docx
- **Charts:** matplotlib

## Port: 8004
## Schema: `report`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /reports/generate | Generate a report |
| GET | /reports/:id | Get report metadata |
| GET | /reports/:id/download | Download report file |
| GET | /reports/list/:projectId | List project reports |
| DELETE | /reports/:id | Delete report |

## Report Types
- `weekly_progress` — Takt performance, PPC, constraints, lookahead
- `executive_summary` — High-level project status for stakeholders
- `variance_analysis` — Root cause analysis of deviations
- `custom` — User-defined sections and data

## Environment Variables
```env
PORT=8004
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
GEMINI_API_KEY=<key>
S3_BUCKET=taktflow-reports
S3_REGION=us-east-1
```

## Setup & Run
```bash
cd services/reporting-service
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8004
```
