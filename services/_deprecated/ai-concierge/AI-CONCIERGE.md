# AI-CONCIERGE.md

## Overview
Natural language interface for TaktFlow AI. Users ask questions in plain language (text or voice) and the concierge detects intent, orchestrates calls to relevant services, and synthesizes a human-friendly response.

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **AI:** Google Generative AI (Gemini 2.0 Flash) for intent detection + response generation
- **RAG:** In-memory document store with TF-IDF similarity (Layer 1) + Gemini embeddings (Layer 2)
- **WebSocket:** Socket.io (streaming responses)

## Port: 3008

## 3-Layer Intelligence

| Layer | Capability | Dependency |
|-------|-----------|------------|
| Layer 1 | Keyword intent detection, template responses, TF-IDF RAG retrieval | None |
| Layer 2 | Gemini AI intent detection, AI-generated responses, Gemini embedding RAG | GEMINI_API_KEY |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /concierge/ask | Ask a question (text) |
| GET | /concierge/history | Conversation history |
| DELETE | /concierge/history | Clear history |
| POST | /concierge/rag/ingest | Add documents to RAG store |
| GET | /concierge/rag/status | RAG store status |

## Intent Detection

| Intent | Example Queries | Orchestrates |
|--------|----------------|--------------|
| TAKT_QUERY | "When does MEP start in Zone C?" | takt-engine |
| WHAT_IF | "Move painters 1 takt earlier" | simulation-service |
| CONSTRAINT_CHECK | "What constraints are open?" | constraint-service |
| PPC_QUERY | "Why did PPC drop?" | progress-service |
| REPORT_GENERATE | "Generate weekly report" | reporting-service |
| RESOURCE_QUERY | "How many workers next week?" | resource-service |
| GENERAL_CHAT | "What is takt planning?" | Direct AI response |

## RAG (Retrieval-Augmented Generation)

The concierge uses a document store to maintain project context that enhances AI responses:

```
User query → Intent Detection → Service Orchestration
                                        ↓
                              RAG Document Retrieval
                                        ↓
                              Context Assembly (service data + RAG docs + conversation history)
                                        ↓
                              Gemini AI Response Generation (or template fallback)
```

**Document categories:** plan, constraint, progress, resource, knowledge

**Seeded knowledge:** 16 project-specific documents covering takt plan details, progress metrics, constraint data, resource allocation, simulation results, and domain knowledge (takt planning, LPS, flowline concepts).

**Ingestion:** External services can push documents via `POST /concierge/rag/ingest` to keep the context fresh.

## Response Format
```json
{
  "answer": "MEP Rough-in starts in Zone C during Takt Period T7 (March 17). There is 1 open constraint: shop drawing approval (C-041).",
  "sources": ["takt-engine", "constraint-service"],
  "suggestions": ["Show flowline", "View constraint details"],
  "confidence": 0.92
}
```

## Environment Variables
```env
PORT=3008
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=<key>
TAKT_ENGINE_URL=http://localhost:8001
CONSTRAINT_URL=http://localhost:3004
PROGRESS_URL=http://localhost:3005
SIMULATION_URL=http://localhost:8003
RESOURCE_URL=http://localhost:3006
REPORTING_URL=http://localhost:8004
```

## Setup & Run
```bash
cd services/ai-concierge
npm install && npm run dev
```
