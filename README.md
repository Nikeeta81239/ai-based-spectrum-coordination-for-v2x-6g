# AI-Based Privacy-Aware Dynamic Spectrum Coordination for 6G V2X Networks Using Multi-Agent Deep Reinforcement Learning

Final-Year Engineering Project Implementation.

---

## Project Overview

This project presents a complete, full-stack simulation system for **Dynamic Spectrum Coordination** in **6G Vehicle-to-Everything (V2X)** networks. Multiple autonomous vehicles act as intelligent agents in a **Multi-Agent Deep Reinforcement Learning (MARL)** environment using PyTorch.

### Key Architecture Components:
1. **Mobility Simulation:** Realistic vehicle trajectories generated via **Eclipse SUMO** (Silk Board, Bengaluru highway network).
2. **Wireless Channel Modeling:** Physical layer simulation modeling SINR, RSSI, Packet Delivery Ratio (PDR), latency, and inter-vehicle co-channel interference.
3. **Multi-Head Attention Mechanism:** Four distinct attention heads (**Spatial, Temporal, Application, Frequency**) fuse multi-modal environmental features.
4. **Dual-Critic MARL (CTDE):** 
   - **Global Critic:** Used during centralised training to capture joint network states.
   - **Local Critic:** Deployed on individual vehicle agents for privacy-aware, local inference without explicit state broadcasting.
5. **Explainable AI (XAI):** Real-time attention weight visualisations, feature importance scores, and human-readable decision rationales.
6. **FastAPI & React Dashboard:** Live WebSocket streaming of vehicle locations, spectrum occupancy, and real-time comparative performance charts.

---

## Folder Tree

```
major_project/
├── backend/
│   ├── main.py                     # FastAPI application entry point
│   ├── requirements.txt            # Python dependencies
│   ├── app/
│   │   ├── api/                    # REST endpoints (simulation, vehicles, spectrum, ai, metrics, etc.)
│   │   ├── core/                   # Settings & database initialization
│   │   ├── models/                 # SQLAlchemy & Pydantic schemas
│   │   ├── services/               # Simulation, metrics & XAI logic
│   │   └── websocket/              # WebSocket broadcast endpoint (/ws/simulation)
│   ├── tests/                      # PyTest & Unittest test suite
│   └── simulation/                 # SUMO & TraCI process controllers
├── frontend/
│   ├── package.json                # React/Vite dependencies
│   ├── vite.config.js              # Vite server & proxy configuration
│   └── src/
│       ├── api/                    # Axios API client
│       ├── components/             # Reusable UI cards, tables, maps & charts
│       ├── hooks/                  # Live WebSocket useSimulation hook
│       ├── pages/                  # Dashboard, Simulation, Vehicles, AIModel, etc.
│       └── styles/                 # Tailwind CSS & custom glassmorphism styles
├── sumo/
│   ├── network/                    # SUMO net.xml files (Bengaluru road network)
│   ├── routes/                     # SUMO route definitions (.rou.xml)
│   └── scenarios/                  # Scenario sumo.sumocfg files
├── scripts/                        # Train, evaluate, and simulation CLI launchers
├── training/                       # MARL PyTorch models, attention heads & training loop
├── evaluation/                     # Baseline comparison algorithms (Random, Greedy, Round Robin)
├── data/raw/                       # V2X mobility dataset CSV
├── models/best/                    # PyTorch model checkpoints
└── README.md
```

---

## Running Backend & Frontend (Native Setup)

### Step 1: Backend Server (FastAPI)
```powershell
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
*API documentation: http://localhost:8000/docs*

### Step 2: Frontend Dashboard (React + Vite)
```powershell
cd frontend
npm run dev
```
*Web Dashboard: http://localhost:5173*

---

## Training & Evaluation CLI Commands

### Train the MARL Model
```powershell
python scripts/train.py --episodes 100 --scenario low
```

### Run Baseline Evaluation
```powershell
python scripts/evaluate.py --scenario low
```

### Run Simulation Loop in CLI
```powershell
python scripts/run_simulation.py
```
