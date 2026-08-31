# Final Project Report & Comprehensive Walkthrough

## PROJECT TITLE:
**AI-Based Privacy-Aware Dynamic Spectrum Coordination for 6G V2X Networks Using Multi-Agent Deep Reinforcement Learning**

---

## 1. Executive Summary

This project delivers a complete, full-stack, simulation-based intelligent spectrum coordination system designed for **6G Vehicle-to-Everything (V2X)** communication networks. Autonomous vehicles act as intelligent agents in a **Multi-Agent Deep Reinforcement Learning (MARL)** environment using PyTorch, optimizing dynamic spectrum allocation while preserving vehicle privacy and delivering explainable decisions (XAI).

Both the **FastAPI Backend (`http://localhost:8000`)** and **React/Vite Frontend (`http://localhost:5173`)** are active and running natively.

---

## 2. Completed Project Architecture & Folder Structure

```
major_project/
├── backend/
│   ├── main.py                     # FastAPI application entry point & CORS
│   ├── requirements.txt            # Python dependencies
│   ├── app/
│   │   ├── api/                    # REST routers: simulation, vehicles, spectrum, ai, metrics, XAI, scenarios
│   │   ├── core/                   # Centralized settings & async SQLAlchemy SQLite database setup
│   │   ├── models/                 # Database ORM models & Pydantic schemas
│   │   ├── services/               # Simulation service, metrics service, XAI generator
│   │   └── websocket/              # WebSocket streaming (/ws/simulation)
│   ├── tests/                      # Unittest test suite (test_attention.py, test_api.py)
│   └── simulation/                 # SUMO & TraCI process controllers
├── frontend/
│   ├── package.json                # Vite, React, Recharts, Leaflet, Tailwind CSS
│   ├── vite.config.js              # Vite server & API/WS proxies
│   └── src/
│       ├── api/                    # Axios API client module
│       ├── components/             # Reusable UI cards, tables, maps, controls, heatmaps & charts
│       ├── hooks/                  # Live WebSocket hook (useSimulation.js)
│       ├── pages/                  # 9 Pages: Dashboard, Simulation, Vehicles, Spectrum, AIModel, Explainability, Privacy, Scenarios, Results
│       └── styles/                 # Tailwind CSS & glassmorphism styling
├── sumo/
│   ├── network/                    # SUMO network definition files (Bengaluru highway)
│   ├── routes/                     # SUMO traffic route definitions (.rou.xml)
│   └── scenarios/                  # Sumo scenario configurations (.sumocfg)
├── scripts/                        # CLI wrapper scripts (train.py, evaluate.py, run_simulation.py)
├── training/                       # DRL training loop, config & PyTorch environment
├── agents/                         # MultiAgentSystem, Actor, GlobalCritic, LocalCritic
├── attention/                      # MultiStreamAttention (Spatial, Temporal, App, Frequency)
├── evaluation/                     # Baseline allocators (Random, Greedy, Round Robin)
├── explainability/                 # Attention weight & feature importance visualizers
└── README.md                       # Comprehensive setup and execution documentation
```

---

## 3. Key AI/ML Architectural Highlights

### A. Multi-Head Attention Mechanism (`attention/multi_head_attention.py`)
Synthesizes four distinct environmental streams into a fused 64-dimensional feature representation:
1. **Spatial Attention**: Maps vehicle coordinates and neighbor count.
2. **Temporal Attention**: Captures velocity vectors and motion history.
3. **Application Attention**: Categorizes communication priority (*Safety/Emergency*, *Traffic Info*, *Normal*).
4. **Frequency Attention**: Analyzes 6-channel co-channel interference and spectrum availability.

### B. Dual-Critic Architecture (CTDE)
* **Global Critic (`agents/global_critic.py`)**: Evaluates global joint states during centralized offline training to optimize network-wide coordination.
* **Local Critic (`agents/local_critic.py`)**: Deployed on individual vehicle agents during online inference, relying exclusively on local observations to maintain privacy and eliminate overhead.

### C. Explainable AI (XAI)
Provides transparent, interpretable spectrum allocation decisions per vehicle:
* Attention weight heatmaps across Spatial, Temporal, Application, and Frequency heads.
* Feature importance rankings (Interference, Density, Speed, Priority).
* Rule-based natural language rationales (e.g., *"Channel 2 selected: emergency priority requires low-latency channel with minimal interference"*).

---

## 4. Frontend Navigation & Pages Summary

| Page | Path | Functionality |
|---|---|---|
| **Dashboard** | `/` | System overview, active agent counter, average latency/throughput stats, Leaflet live map, spectrum bar chart, and real-time metric trends. |
| **Simulation** | `/simulation` | Interactive controls (Start, Stop, Reset, Scenario selector, vehicle density, duration) with live SUMO map tracking. |
| **Vehicles** | `/vehicles` | Granular table of active vehicle agents, speed, app type, selected channel, SINR (dB), PDR (%), throughput, and latency. |
| **Spectrum** | `/spectrum` | Real-time channel utilization, interference levels, estimated quality, and overloaded channel warnings. |
| **AI Model** | `/ai-model` | Neural network pipeline visualizer, training status, checkpoint information, and background training trigger. |
| **Explainability** | `/explainability` | Deep inspection of decision rationales, attention weight distributions, and feature importance per vehicle. |
| **Privacy** | `/privacy` | Message overhead reduction metrics comparing baseline centralized sharing vs local critic deployment. |
| **Scenarios** | `/scenarios` | Benchmark runner for *Low Traffic*, *Medium Density*, *High Density*, *Congestion*, and *Accident* scenarios. |
| **Results** | `/results` | Comparative performance analysis (Proposed vs Random, Fixed, Greedy) with CSV data export. |

---

## 5. Execution Commands

### Active Background Servers
- **Backend (FastAPI)**: Running at `http://localhost:8000` (Docs: `http://localhost:8000/docs`)
- **Frontend (React)**: Running at `http://localhost:5173`

### Manual CLI Execution Commands
```powershell
# 1. Run backend server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# 2. Run frontend dev server
cd frontend; npm run dev

# 3. Run unit tests
python backend/tests/test_attention.py
python backend/tests/test_api.py

# 4. Run DRL training CLI
python scripts/train.py --episodes 100 --scenario low

# 5. Run baseline evaluation CLI
python scripts/evaluate.py --scenario low
```
