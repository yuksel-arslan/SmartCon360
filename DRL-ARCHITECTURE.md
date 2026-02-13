# DRL-ARCHITECTURE.md — TaktFlow AI Deep Reinforcement Learning Engine

> **Status:** Phase 2-3 Specification
> **Version:** 1.0 | February 2026
> **Author:** Yuksel Arslan
> **Dependency:** OPTIONAL — The core system works without DRL. See [AI-FEATURES.md](./AI-FEATURES.md) for the 3-layer architecture.

---

## 1. DRL's Value for TaktFlow AI

### 1.1 Core Capabilities DRL Enables

| Capability | What It Means for Construction |
|------------|-------------------------------|
| **Adaptive Replanning** | When a crew is delayed, material doesn't arrive, or weather shuts down a zone, the agent instantly recommends the next best action. No manual replanning needed. |
| **Flow Optimization** | The agent learns to maximize continuous work flow across zones — the fundamental Lean Construction principle. It discovers crew-zone-sequence combinations that minimize idle time. |
| **Risk-Aware Decisions** | Trained on stochastic simulations (weather, delays, rework), the agent inherently understands uncertainty. It places buffers where they matter, not uniformly. |
| **Multi-Objective Balancing** | The reward function lets us tune the balance between speed, cost, flow continuity, and resource stability. The agent learns trade-offs humans struggle to compute. |
| **Scenario Generation** | Run the trained agent under different constraints to instantly produce feasible plan alternatives. Change the deadline, budget, or crew count and get a new optimized plan in seconds. |
| **Learning from History** | As more projects run through TaktFlow AI, the agent can be retrained on real outcomes, continuously improving its decision quality. |

### 1.2 The Construction Problem DRL Solves

Every construction professional knows this reality: the plan you make on day one is never the plan you execute. Takt planning brings structure and rhythm, but the real challenge is maintaining that rhythm when disruptions happen. DRL addresses exactly this gap.

**Without DRL:** Static Takt plan is created → Disruption occurs on site → Planner manually re-evaluates and adjusts → This takes hours or days → Meanwhile, cascading delays spread across trades and zones.

**With DRL:** Current project state is fed to the trained agent → Agent recommends optimal action in milliseconds → Planner reviews and approves (or adjusts) → Disruption is contained before it cascades.

> **Important:** Without DRL, TaktFlow AI still provides template-based plan generation, algorithmic takt calculation, trade stacking detection, and flowline visualization. DRL is an enhancement layer, not a requirement.

### 1.3 Academic Foundation

This is not experimental technology. DRL for construction scheduling has a strong and growing academic base:

- **Zhang et al. (2023, Automation in Construction):** PPO-based agents for adaptive resource flow control in construction. Demonstrated superior performance through hybrid DRL+empirical agents. DES simulator as training environment.
- **Wang et al. (2024, Automation in Construction):** DRL with Graph Convolutional Network + Valid Action Sampling for large-scale construction scheduling. Reduced project duration and computation time. Includes rescheduling capability.
- **Cai, Bian & Liu (2024, Journal of Manufacturing Systems):** PPO + GNN for Resource-Constrained Project Scheduling. Validated on PSPLIB benchmarks. Handles resource disruptions gracefully.
- **Tommelein (2017-2023, IGLC & ASCE):** Work Density Method and WoLZo algorithm — the mathematical foundation for zone optimization in Takt planning. NSF-funded research at UC Berkeley.

---

## 2. System Architecture

The DRL engine operates as a dedicated microservice (`taktflow-drl-engine`) within TaktFlow AI's architecture. It has four core components working in a training-inference cycle.

### 2.1 Components

| Component | Technology | Purpose | Stack |
|-----------|-----------|---------|-------|
| **DES Simulator** | SimPy + Gymnasium | Training environment — simulates project execution with stochastic variations | Python 3.11 |
| **PPO Agent** | Stable-Baselines3 | Learns optimal scheduling policy through interaction with simulator | Python 3.11, PyTorch 2.x |
| **WDM Engine** | NumPy + SciPy | Work density calculation and zone optimization (WoLZo) | Python 3.11 |
| **DRL API** | FastAPI + Redis | Training orchestration and real-time inference endpoint | Python 3.11 |

### 2.2 Data Flow

**Training Pipeline:**
```
Project Data → WDM Engine (creates balanced zones)
  → DES Simulator (builds Gymnasium environment)
  → PPO Agent trains over millions of steps
  → Trained Model (.pt checkpoint)
```

**Inference Pipeline:**
```
Current Project State (from frontend)
  → State Encoder (normalizes observations)
  → Trained PPO Model
  → Action (scheduling recommendation)
  → Frontend displays updated Takt grid
```

---

## 3. MDP Formulation

The Takt planning problem is modeled as a Markov Decision Process. At each takt step, the agent observes the current state, selects an action, and receives a reward measuring how well flow, cost, and risk objectives are met.

### 3.1 State Space

The state vector captures everything the agent needs to make an informed scheduling decision:

| State Component | Dims | Type | What It Captures |
|----------------|------|------|-----------------|
| Zone Status Matrix | Z × T | [0, 1] | Completion percentage per zone per trade. The core progress snapshot. |
| Crew State | T × 3 | [0, 1] | Each crew's current location, size (normalized), and efficiency factor. |
| Work Density Map | Z × T | [0, 1] | Remaining work density per zone-trade cell. From Tommelein's WDM. |
| Buffer Status | Z | {0, 1, 2} | Capacity buffer state per zone: consumed / partial / full. |
| Takt Progress | 1 | [0, 1] | Current takt step relative to total. Tells agent how far along the project is. |
| Precedence Flags | T | {0, 1} | Is each trade blocked by an unfinished predecessor? Hard constraint signal. |
| External Factors | 3 | [0, 1] | Weather severity, supply chain delay risk, crew fatigue level. |

**Example Dimensions:** Project with 10 zones, 8 trades: (10×8) + (8×3) + (10×8) + 10 + 1 + 8 + 3 = 206 dimensions. PPO handles this comfortably (validated up to 1000+ in literature).

### 3.2 Action Space

| Action | Type | Range | Construction Meaning |
|--------|------|-------|---------------------|
| Crew → Zone | Discrete | T × Z one-hot | Assign each trade to a specific zone this takt |
| Takt Duration | Discrete | {-1, 0, +1} days | Speed up, maintain, or slow down the rhythm |
| Crew Sizing | Discrete | {-1, 0, +1} per crew | Scale resources up or down per trade |
| Buffer Insert | Binary | {0, 1} per zone | Add a capacity buffer to absorb variation |
| Zone Defer | Binary | {0, 1} per zone | Skip a zone this takt, handle it next round |

### 3.3 Reward Function

```
R(t) = w1 * flow_score
     + w2 * takt_compliance
     + w3 * cost_efficiency
     + w4 * resource_stability
     - penalty_violations
```

**Components:**
```
flow_score         = 1 - (idle_crews / total_crews)        # maximize continuous work
takt_compliance    = 1 - |actual_dur - takt| / takt        # stick to the rhythm
cost_efficiency    = 1 - (actual_cost / budget_cost)       # stay within budget
resource_stability = 1 / (1 + std(crew_size_changes))      # avoid disruptive changes
```

**Hard Penalties:**
```
-10 * precedence_violations    # trade started before predecessor finished
 -5 * zone_overlap_count       # two crews in same zone simultaneously
```

**Weight Rationale:**

| Weight | Value | Rationale |
|--------|-------|-----------|
| w1 — Flow | 0.35 | Highest priority. Continuous flow is the essence of Takt planning. |
| w2 — Takt Compliance | 0.25 | Maintaining the rhythm. Takt is a heartbeat — deviations signal instability. |
| w3 — Cost | 0.20 | Budget awareness without sacrificing flow. Prevents over-resourcing. |
| w4 — Resource Stability | 0.20 | From 44 years of site experience: crews hate sudden changes. Stable crews = better productivity. |

---

## 4. Discrete Event Simulator (DES)

The DES is where the PPO agent learns. It simulates construction project execution at the takt-step level with realistic stochastic variations. Following Zhang et al. (2023), it implements the OpenAI Gymnasium interface so any RL algorithm can plug in.

### 4.1 Gymnasium Environment

```python
class TaktSimulator(gymnasium.Env):
    """Construction Takt Planning environment for DRL training."""

    def __init__(self, project_config: ProjectConfig):
        self.observation_space = spaces.Box(
            low=0.0, high=1.0, shape=(state_dim,), dtype=np.float32
        )
        self.action_space = spaces.MultiDiscrete([
            n_zones,      # crew-zone assignment per trade
            3,            # takt adjust {-1, 0, +1}
            3,            # crew size adjust
            2,            # buffer insert
        ])
        self.des_engine = SimPyEngine(project_config)
        self.wdm = WorkDensityMap(project_config.floor_plan)

    def step(self, action) -> tuple[obs, reward, done, truncated, info]:
        self.des_engine.apply_action(action)    # Execute decision
        self.des_engine.advance_takt()           # Simulate one takt period
        reward = self._compute_reward()           # Evaluate outcome
        done = self.des_engine.project_complete()
        return self._get_obs(), reward, done, False, self._get_info()

    def reset(self, seed=None) -> tuple[obs, info]:
        self.des_engine.reset(stochastic=True)   # New random conditions
        return self._get_obs(), {}
```

### 4.2 Stochastic Variations

The simulator injects controlled randomness that mirrors real construction variability. This is what makes the trained agent robust — it has "seen" thousands of disruption patterns before encountering a real one.

| Variation | Distribution | Parameters | Real-world Source |
|-----------|-------------|------------|-------------------|
| Task Duration | Log-normal | μ=planned, σ=0.15 | Crew productivity varies day-to-day. Log-normal captures right-skewed nature (delays more common than early finishes). |
| Material Delay | Bernoulli + Exp | p=0.08, λ=2 days | 8% chance of delay per delivery, averaging 2 days when it happens. |
| Crew Absence | Binomial | p=0.05/worker/day | 5% daily absence rate per worker. Illness, weather, personal. |
| Rework | Bernoulli | p=0.03 per zone | 3% rework probability per completed zone-trade. Quality failure sends work back. |
| Weather | Markov Chain | 3-state transition | Good/Fair/Bad states with transition probabilities. Bad weather reduces outdoor productivity by 40-80%. |

---

## 5. PPO Agent Configuration

### 5.1 Why PPO

Proximal Policy Optimization (Schulman et al., 2017) is the algorithm of choice. It brings three qualities that matter for construction scheduling:

1. **Stable training** — the clipped surrogate prevents catastrophic policy collapse
2. **Sample efficiency** — reuses collected experience for multiple gradient updates
3. **Minimal hyperparameter sensitivity** — the default ε=0.2 works across most domains

It is OpenAI's default RL algorithm and the most commonly used in construction scheduling research.

### 5.2 Hyperparameters

| Parameter | Default | Sweep Range | Notes |
|-----------|---------|-------------|-------|
| Learning Rate | 3e-4 | 1e-4 – 1e-3 | Linear decay to 0 over training. |
| Clip Range (ε) | 0.2 | 0.1 – 0.3 | Controls policy deviation. 0.2 is standard. |
| GAE Lambda (λ) | 0.95 | 0.9 – 0.99 | Higher = less bias, more variance. |
| Discount (γ) | 0.99 | 0.95 – 0.999 | High because construction projects are long-horizon. |
| Batch Size | 2048 | 512 – 4096 | Steps collected before each policy update. |
| Epochs per Update | 10 | 3 – 15 | Reuse count for gradient updates. |
| Entropy Coeff. | 0.01 | 0.0 – 0.05 | Encourages exploration. |
| Total Timesteps | 2M | 500K – 5M | 2-4K episodes sufficient for convergence. |

### 5.3 Network Architecture

```
# Phase 2: Simple MLP (proven baseline)
Policy Network (Actor):
  state_dim -> Dense(256, ReLU) -> Dense(128, ReLU) -> action_dim (softmax)

Value Network (Critic):
  state_dim -> Dense(256, ReLU) -> Dense(128, ReLU) -> 1 (linear)

# Phase 3 Enhancement: Add GCN for structural awareness
GCN Layer (optional):
  Precedence graph (adjacency matrix) -> GCN(64) -> GCN(32)
  Output: graph-embedded features concatenated with state
  -> feeds into Actor/Critic heads above
  Reference: Wang et al. 2024 - GCN + DRL for scheduling
```

---

## 6. Work Density Method (WDM)

The WDM is the mathematical foundation for zone creation. Developed by Tommelein at UC Berkeley (2017-2023, NSF-funded), it provides a rigorous method to divide a work space into balanced zones. In TaktFlow AI, WDM preprocesses project data to create the spatial structure the DRL agent operates on.

### 6.1 Pipeline

```
Input:  Floor plan + trade work quantities per room/area
Step 1: Work Density — Calculate labor-hours/m² per trade per grid cell
Step 2: WoLZo — Optimize zone boundaries to minimize peak workload across all trades
Step 3: Takt Derivation — Peak workload determines minimum achievable takt time
Output: Balanced zones + recommended takt time → feeds into DRL state space
```

### 6.2 WoLZo Solver

The Workload Leveling and Zoning (WoLZo) problem is NP-hard (Jabbari et al., 2020). The solver uses exact methods for small instances and heuristic search for larger projects:

```python
class WoLZoSolver:
    def solve(self, work_density_maps: dict[str, np.ndarray],
              n_zones: int, floor_plan: FloorPlan) -> list[Zone]:
        """Find zone boundaries minimizing max workload peak."""
        if n_zones <= 5 and floor_plan.grid_size <= 36:
            return self._exact_solve(...)      # Branch & bound
        else:
            return self._heuristic_solve(...)   # Metaheuristic for large

        # Output: list of Zone objects with boundaries and
        # work density values per trade, ready for DRL state space
```

---

## 7. Microservice: taktflow-drl-engine

| Property | Value |
|----------|-------|
| Service Name | taktflow-drl-engine |
| Port | **8007** |
| Stack | Python 3.11, FastAPI, PyTorch 2.x, Stable-Baselines3, SimPy, Gymnasium |
| Database | PostgreSQL (shared) + Redis (model cache, job queue, training metrics) |
| Model Storage | S3-compatible bucket for trained .pt files (~50-200 MB each) |
| Monitoring | WandB for training curves, Prometheus for inference latency |

### 7.1 API Endpoints

| Method | Endpoint | Purpose | Response |
|--------|----------|---------|----------|
| POST | /api/v1/drl/train | Start async training job | `{ job_id, status }` |
| GET | /api/v1/drl/train/{id}/status | Training progress + metrics | `{ progress, reward_curve }` |
| POST | /api/v1/drl/predict | Get next scheduling action | `{ action, confidence, rationale }` |
| POST | /api/v1/drl/simulate | Run full project simulation | `{ plan, timeline, metrics }` |
| POST | /api/v1/wdm/optimize-zones | WoLZo zone optimization | `{ zones[], takt_time }` |
| GET | /api/v1/drl/models | List trained models | `{ models[], active_model }` |
| POST | /api/v1/drl/models/{id}/activate | Set model for inference | `{ model_id, activated }` |

---

## 8. Directory Structure

```
services/drl-engine/
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
│   ├── test_simulator.py
│   ├── test_reward.py
│   ├── test_wdm.py
│   └── test_api.py
├── trained_models/             # .pt checkpoints (gitignored)
├── requirements.txt
├── Dockerfile
├── DRL_ENGINE.md               # Service documentation
└── docker-compose.yml
```

---

## 9. Implementation Roadmap

### Phase 2A: Foundation (Weeks 1-4)

- **DES Simulator:** SimPy-based engine with Gymnasium interface. Supports project config input and stochastic variations.
- **WDM Engine:** Work density calculation from floor plan data. WoLZo solver for zone optimization.
- **State & Action Space:** State encoder normalizing all inputs to [0,1]. Action decoder translating agent outputs to scheduling decisions.
- **Reward Function:** Flow-centric reward with configurable weights. Unit tests validating each component.
- **Deliverable:** Working simulator that runs random-policy episodes and logs metrics.

### Phase 2B: PPO Training (Weeks 5-8)

- **PPO Integration:** Stable-Baselines3 PPO with custom policy network. WandB logging for training curves.
- **Training Pipeline:** Hyperparameter sweep across key parameters. Reproducible training with seed control.
- **Baseline Evaluation:** Compare trained agent vs random policy and vs simple heuristic (earliest-available-zone). Target: 30%+ improvement over heuristic.
- **Model Management:** Save/load .pt checkpoints. Model versioning with metadata (project type, training config).
- **Deliverable:** Trained agent that demonstrably outperforms heuristic baseline on flow efficiency.

### Phase 2C: API & Integration (Weeks 9-12)

- **FastAPI Service:** All endpoints from Section 7.1. Async training with Redis job queue. Model hot-loading for inference.
- **Frontend Integration:** DRL action recommendations displayed in Takt grid UI. Confidence scores and action rationale.
- **WDM API:** Zone optimization endpoint accepting floor plan data and returning balanced zones.
- **Documentation:** DRL_ENGINE.md with complete service specification.
- **Deliverable:** End-to-end DRL microservice integrated with TaktFlow AI frontend.

### Phase 3: Advanced Capabilities (Future)

- **GCN Integration:** Graph neural network layer for learning structural relationships between trades and zones from precedence data.
- **Multi-Agent RL:** Separate PPO agent per trade, coordinated via MAPPO. For large-scale projects with 15+ trades.
- **Transfer Learning:** Pre-trained models fine-tuned to new project types. Residential model adapted for commercial, etc.
- **Online Learning:** Agent continues learning from real project outcomes via feedback loop with site data.
- **Explainability:** Action rationale generation — why the agent recommends a specific crew-zone assignment.

---

## 10. References

1. Zhang, Y. et al. (2023). Adaptive control of resource flow via online DRL. *Automation in Construction*, 148.
2. Wang, L. et al. (2024). Automated construction scheduling using DRL with valid action sampling. *Automation in Construction*, 158.
3. Cai, Z., Bian, J. & Liu, Z. (2024). DRL for RCPSP with resource disruptions. *Journal of Manufacturing Systems*.
4. Jabbari, A., Tommelein, I.D. & Kaminsky, P.M. (2020). Workload leveling based on work space zoning for takt planning. *Automation in Construction*, 118.
5. Tommelein, I.D. (2017). Collaborative takt time planning of non-repetitive work. *IGLC 25*.
6. Singh, V.V. & Tommelein, I.D. (2023). Visual workload leveling and zoning using WDM. *ASCE J. Constr. Eng. Manage.*
7. Schulman, J. et al. (2017). Proximal policy optimization algorithms. OpenAI. arXiv:1707.06347.
