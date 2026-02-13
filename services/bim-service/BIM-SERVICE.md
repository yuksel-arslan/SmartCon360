# BIM-SERVICE.md

## Overview
Parses IFC (Industry Foundation Classes) files to extract building structure, automatically suggest LBS zones, and link BIM elements to takt plan assignments. Supports IFC 2x3 and IFC 4.

## Tech Stack
- **Runtime:** Python 3.11
- **Framework:** FastAPI
- **IFC Parser:** ifcopenshell
- **3D Processing:** trimesh, numpy
- **File Storage:** S3-compatible

## Port: 8005

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /bim/upload | Upload IFC file |
| GET | /bim/:fileId/structure | Extract building structure |
| POST | /bim/:fileId/suggest-zones | AI zone suggestions from IFC |
| GET | /bim/:fileId/elements | List BIM elements |
| POST | /bim/link | Link BIM element to takt assignment |
| GET | /bim/:fileId/quantities | Extract quantities (BOQ) |

## Environment Variables
```env
PORT=8005
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
S3_BUCKET=taktflow-bim
MAX_FILE_SIZE_MB=500
```

## Setup & Run
```bash
cd services/bim-service
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8005
```
