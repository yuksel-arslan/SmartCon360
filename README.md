# TaktFlow AI

**AI-Powered Takt Planning Platform for Construction**

Combines Takt Time Construction, Location-Based Management (LBMS), and Last Planner System (LPS) with artificial intelligence.

## Quick Start

```bash
# 1. Clone and setup
cp .env.example .env

# 2. Start infrastructure
docker-compose up -d postgres redis

# 3. Start backend services
cd services/auth-service && npm install && npm run dev
cd services/project-service && npm install && npm run dev
cd services/takt-engine && pip install -r requirements.txt && uvicorn src.main:app --reload --port 8001
cd services/api-gateway && npm install && npm run dev

# 4. Start frontend
cd frontend && npm install && npm run dev
```

Open http://localhost:3100

## Architecture

15 microservices · Node.js 22 + Python 3.11 · Next.js 15 · Tailwind CSS 4 · PostgreSQL · Redis

See [CLAUDE.md](./CLAUDE.md) for full architecture details.

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](./CLAUDE.md) | Project context for Claude Code |
| [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) | Complete database schema |
| [API.md](./API.md) | API specification |
| Each service has its own .md | Detailed service documentation |

## Tech Stack

**Backend:** Express.js, FastAPI, Prisma, LangChain, Socket.io
**Frontend:** Next.js 15, TypeScript 5, Tailwind CSS 4, Framer Motion, D3.js, Zustand
**AI:** Gemini 2.5 Pro/Flash, pgvector, scikit-learn
**Infra:** Docker, PostgreSQL, Redis, Vercel, Railway

## License

Proprietary — TaktFlow AI © 2026
