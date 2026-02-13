# FLOWLINE-SERVICE.md

## Overview
Computes and serves flowline chart data for visualization. Transforms takt plan data into renderable line segments, handles planned vs actual comparison, buffer visualization, and critical path highlighting.

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **Computation:** Custom algorithms for flowline geometry
- **Cache:** Redis (computed flowline data)

## Port: 3003

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /flowline/:planId | Get flowline data for a plan |
| GET | /flowline/:planId/comparison | Planned vs actual overlay |
| GET | /flowline/:planId/buffers | Buffer status data |
| GET | /flowline/:planId/critical-path | Critical chain highlight data |
| GET | /flowline/:planId/export/svg | Export as SVG |
| GET | /flowline/:planId/export/png | Export as PNG |

## Output Format
```json
{
  "zones": [{"id": "uuid", "name": "Zone A", "y_index": 0}],
  "wagons": [
    {
      "trade_id": "uuid",
      "trade_name": "Structure",
      "color": "#3B82F6",
      "segments": [
        {"zone_index": 0, "x_start": 0, "x_end": 5, "y": 0, "status": "completed"},
        {"zone_index": 1, "x_start": 5, "x_end": 10, "y": 1, "status": "in_progress"}
      ]
    }
  ],
  "today_x": 25,
  "total_periods": 11
}
```

## Environment Variables
```env
PORT=3003
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=60
```

## Dependencies
- express, ioredis, pino, uuid

## Setup & Run
```bash
cd services/flowline-service
npm install && npm run dev
```
