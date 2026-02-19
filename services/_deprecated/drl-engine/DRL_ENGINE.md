# DRL Engine Service

> **Port:** 8007
> **Stack:** Python 3.11, FastAPI, PyTorch 2.x, Stable-Baselines3, SimPy, Gymnasium
> **Layer:** 3 (Optional — system works without this service)
> **Full Architecture:** See [/DRL-ARCHITECTURE.md](/DRL-ARCHITECTURE.md)

## Overview

The DRL (Deep Reinforcement Learning) engine provides adaptive takt planning through a trained PPO agent. It operates as an optional Layer 3 enhancement — the core system (Layer 1) functions independently.

## Components

| Component | Purpose |
|-----------|---------|
| **DES Simulator** | SimPy + Gymnasium training environment with stochastic construction variations |
| **PPO Agent** | Proximal Policy Optimization for learning optimal scheduling policy |
| **WDM Engine** | Work Density Method + WoLZo solver for mathematical zone optimization |
| **DRL API** | FastAPI service for training orchestration and real-time inference |

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/drl/train` | Start async training job |
| GET | `/api/v1/drl/train/{id}/status` | Training progress + metrics |
| POST | `/api/v1/drl/predict` | Get next scheduling action |
| POST | `/api/v1/drl/simulate` | Run full project simulation |
| POST | `/api/v1/wdm/optimize-zones` | WoLZo zone optimization |
| GET | `/api/v1/drl/models` | List trained models |
| POST | `/api/v1/drl/models/{id}/activate` | Set model for inference |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Service port (default: 8007) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis for job queue and model cache |
| `MODEL_STORAGE_PATH` | No | Local path for .pt checkpoints (default: `./trained_models`) |
| `WANDB_API_KEY` | No | Weights & Biases for training metrics |
| `WANDB_PROJECT` | No | WandB project name (default: `taktflow-drl`) |

## Directory Structure

```
drl-engine/
├── app/
│   ├── main.py                 # FastAPI entry point
│   ├── config.py               # Settings, env vars
│   ├── routers/
│   │   ├── drl.py              # Training & inference endpoints
│   │   ├── wdm.py              # Work Density Method endpoints
│   │   └── health.py           # Health check
│   ├── core/
│   │   ├── simulator.py        # TaktSimulator (Gymnasium env)
│   │   ├── des_engine.py       # SimPy-based DES core
│   │   ├── ppo_agent.py        # PPO wrapper (Stable-Baselines3)
│   │   ├── reward.py           # Reward function implementation
│   │   └── state.py            # State encoder & normalizer
│   ├── wdm/
│   │   ├── work_density.py     # Work density calculation
│   │   ├── wolzo_solver.py     # WoLZo zone optimizer
│   │   └── floor_plan.py       # Floor plan parser
│   ├── models/
│   │   ├── schemas.py          # Pydantic request/response
│   │   └── db_models.py        # SQLAlchemy ORM models
│   └── utils/
│       ├── metrics.py          # Flow efficiency calculators
│       └── visualization.py    # Training curve generation
├── tests/
├── trained_models/             # .pt checkpoints (gitignored)
├── requirements.txt
├── Dockerfile
└── DRL_ENGINE.md
```

## Implementation Phase

This service is implemented in **Phase 3** (DRL & BIM — Layer 3 Foundation):
- Phase 2A: DES Simulator + WDM Engine + Reward Function
- Phase 2B: PPO Training + Baseline Evaluation
- Phase 2C: FastAPI service + Frontend integration

**Status:** Specification complete. Implementation pending Phase 3.
