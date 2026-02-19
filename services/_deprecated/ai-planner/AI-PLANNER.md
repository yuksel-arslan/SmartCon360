# AI-PLANNER.md

## Overview
The intelligence layer of TaktFlow AI. Uses LLMs (Gemini 2.5 Pro) and custom ML models to generate optimized takt plans, predict delays, detect anomalies, and maintain the Project DNA learning engine.

## Tech Stack
- **Runtime:** Python 3.11
- **Framework:** FastAPI
- **AI/ML:** LangChain, Google Generative AI (Gemini 2.5 Pro), scikit-learn
- **Vector DB:** pgvector (project DNA storage)
- **Computation:** NumPy, Pandas
- **Validation:** Pydantic v2

## Port: 8002

## API Endpoints

### Generative Planning
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /ai/generate-plan | Generate optimized takt plan from project data |
| POST | /ai/optimize-plan | Optimize existing plan (trade sequence, takt time) |
| POST | /ai/suggest-zones | AI-suggested zone breakdown from LBS |
| POST | /ai/suggest-sequence | Optimal trade sequence recommendation |

### Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /ai/predict/delays | Predict potential delays |
| POST | /ai/predict/trade-stacking | Predict stacking risks |
| POST | /ai/predict/duration | Estimate trade duration for zone |
| GET | /ai/predict/project-health/:projectId | Overall health score |

### Project DNA
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /ai/dna/learn | Ingest completed takt period data |
| GET | /ai/dna/productivity/:tradeId | Get learned productivity rates |
| GET | /ai/dna/similar-projects | Find similar past projects |
| POST | /ai/dna/transfer | Transfer learnings to new project |

## AI Chains (LangChain)

### Plan Generation Chain
```
Input: project_type, LBS, trades, target_duration, constraints
  → Step 1: Analyze work content distribution
  → Step 2: Suggest zone grouping for balanced work
  → Step 3: Calculate optimal takt time
  → Step 4: Determine trade sequence with dependencies
  → Step 5: Add buffers based on risk assessment
  → Step 6: Generate 3 alternative plans (aggressive/balanced/safe)
Output: takt_plan with zones, wagons, assignments, risk_score
```

### Delay Prediction Model
```
Features: trade_type, zone_type, crew_size, season, constraint_count,
          historical_ppc, predecessor_completion_rate
Model: Gradient Boosting Classifier
Target: probability of delay (0-1)
Training: historical project data from Project DNA
```

## Environment Variables
```env
PORT=8002
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=<key>
VECTOR_DB_URL=postgresql://user:pass@localhost:5432/taktflow_vectors
AI_MODEL=gemini-2.5-pro
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=4096
```

## Dependencies
```
fastapi==0.115.*
uvicorn==0.34.*
langchain==0.3.*
langchain-google-genai==2.*
google-generativeai==0.8.*
scikit-learn==1.6.*
numpy==2.1.*
pandas==2.2.*
pgvector==0.3.*
asyncpg==0.30.*
pydantic==2.10.*
```

## Setup & Run
```bash
cd services/ai-planner
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8002
```
