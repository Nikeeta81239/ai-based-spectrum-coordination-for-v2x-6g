"""
scenarios.py — /api/scenarios endpoints
"""

import os
import sys
import time
import logging
import threading
from fastapi import APIRouter, HTTPException, BackgroundTasks

from ..models.schemas import ScenarioRunRequest, ScenarioRunResponse
from ..services.simulation_service import sim_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])

_project_root = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)

# ── Scenario definitions ───────────────────────────────────────────────────────
SCENARIOS = {
    "low": {
        "name": "low",
        "label": "Low Density",
        "description": "Standard urban flow. Baseline spectrum coordination performance.",
        "num_vehicles": 21,
        "density_factor": 1.0,
    },
    "medium": {
        "name": "medium",
        "label": "Medium Density",
        "description": "Higher vehicle density — increased contention for channels.",
        "num_vehicles": 50,
        "density_factor": 1.5,
    },
    "high": {
        "name": "high",
        "label": "High Density",
        "description": "Dense urban traffic. Significant spectrum coordination challenge.",
        "num_vehicles": 100,
        "density_factor": 2.5,
    },
    "very_high": {
        "name": "very_high",
        "label": "Very High Density",
        "description": "Extreme vehicle density — stress test for the AI system.",
        "num_vehicles": 200,
        "density_factor": 4.0,
    },
    "congestion": {
        "name": "congestion",
        "label": "Congestion",
        "description": "Slow-moving congested traffic. High density, low speed.",
        "num_vehicles": 300,
        "density_factor": 6.0,
    },
}

# ── In-memory comparison results ───────────────────────────────────────────────
_run_results: dict = {}

# ── Benchmark status tracking ──────────────────────────────────────────────────
# scenario → { status, steps_done, total_steps, started_at, completed_at, error }
_benchmark_status: dict = {}


def _run_scenario_comparison(scenario: str, methods: list, steps: int):
    """Run scenario comparison in a background thread."""
    if _project_root not in sys.path:
        sys.path.insert(0, _project_root)

    _benchmark_status[scenario] = {
        "status": "running",
        "steps_done": 0,
        "total_steps": steps,
        "started_at": time.time(),
        "completed_at": None,
        "error": None,
    }

    try:
        import torch
        from environment.wireless_environment import WirelessEnvironment
        from agents.multi_agent import MultiAgentSystem
        from evaluation.baselines import (
            RandomAllocation, GreedyAllocation, RoundRobinAllocation,
            compute_metrics_from_states
        )
        from training.config import TRAFFIC_SCENARIOS, MOBILITY_CSV
        import numpy as np

        csv_path = os.path.join(_project_root, MOBILITY_CSV)
        density  = TRAFFIC_SCENARIOS.get(scenario, {}).get("density_factor", 1.0)
        device   = torch.device("cpu")

        results = {}
        total_methods = len(methods)

        for m_idx, method in enumerate(methods):
            env    = WirelessEnvironment(csv_path, scenario_density_factor=density)
            states = env.reset()
            done   = False
            step   = 0

            metrics_acc = {
                "mean_interference": [], "mean_throughput_mbps": [],
                "mean_latency_ms": [], "mean_pdr": [], "mean_sinr_db": [],
                "spectral_efficiency": [], "comm_overhead": [],
            }

            if method == "random":
                allocator = RandomAllocation()
            elif method == "greedy":
                allocator = GreedyAllocation()
            elif method == "round_robin":
                allocator = RoundRobinAllocation()
            else:
                # Proposed AI
                mas = MultiAgentSystem(device)
                model_dir = os.path.join(_project_root, "models", "best")
                if os.path.isdir(model_dir):
                    gc_path = os.path.join(model_dir, "global_critic.pt")
                    if os.path.exists(gc_path):
                        mas.load_global_critic(gc_path)
                allocator = None

            while not done and step < steps:
                if allocator is not None:
                    actions = allocator.select_channels(states)
                else:
                    actions, _, _ = mas.step_actions(states, deterministic=True)

                m = compute_metrics_from_states(states, actions)
                for k in metrics_acc:
                    if k in m:
                        metrics_acc[k].append(m[k])

                next_states, _, done, _ = env.step(actions)
                states = next_states if next_states else {}
                if not states:
                    break
                step += 1

                # Update progress: spread steps evenly across methods
                steps_so_far = m_idx * steps + step
                _benchmark_status[scenario]["steps_done"] = steps_so_far

            results[method] = {k: float(np.mean(v)) if v else 0.0 for k, v in metrics_acc.items()}

        # Map internal method keys to display names
        key_map = {
            "proposed": "Proposed MAPPO",
            "random": "Random",
            "greedy": "Greedy (Max-SINR)",
            "round_robin": "Round Robin",
        }
        named_results = {key_map.get(k, k): v for k, v in results.items()}

        # Attach run metadata
        snap = sim_service.get_current_snapshot()
        actual_vehicles = len(snap.get("vehicles", []))
        named_results["_meta"] = {
            "scenario": scenario,
            "steps": steps,
            "actual_vehicles": actual_vehicles or SCENARIOS.get(scenario, {}).get("num_vehicles", 0),
            "timestamp": time.time(),
            "model_checkpoint": "models/best",
            "source": "live",
        }

        _run_results[scenario] = named_results
        _benchmark_status[scenario].update({
            "status": "completed",
            "steps_done": steps * len(methods),
            "completed_at": time.time(),
        })
        logger.info(f"[Scenarios] Benchmark complete for scenario={scenario}")

    except Exception as exc:
        logger.exception(f"[Scenarios] Benchmark failed: {exc}")
        _benchmark_status[scenario].update({
            "status": "error",
            "error": str(exc),
            "completed_at": time.time(),
        })


# ── Endpoints ──────────────────────────────────────────────────────────────────
@router.get("")
async def list_scenarios():
    """List all available scenarios with live vehicle counts if simulation is running."""
    snap = sim_service.get_current_snapshot()
    live_vehicles = len(snap.get("vehicles", []))
    sim_scenario = sim_service.scenario

    scenarios_out = []
    for sc in SCENARIOS.values():
        entry = dict(sc)
        if sim_service.status == "running" and sim_scenario == sc["name"] and live_vehicles > 0:
            entry["live_vehicles"] = live_vehicles
        scenarios_out.append(entry)

    return {"scenarios": scenarios_out}


@router.post("/run")
async def run_scenario(req: ScenarioRunRequest, background_tasks: BackgroundTasks):
    """Run a scenario benchmark comparison in the background."""
    if req.scenario not in SCENARIOS:
        raise HTTPException(status_code=400, detail=f"Unknown scenario: {req.scenario}")

    # Prevent double-run
    existing = _benchmark_status.get(req.scenario, {})
    if existing.get("status") == "running":
        return {
            "status": "already_running",
            "scenario": req.scenario,
            "steps_done": existing.get("steps_done", 0),
            "message": "Benchmark already running for this scenario.",
        }

    methods = req.methods or ["random", "greedy", "round_robin", "proposed"]
    steps = req.steps or 100

    t = threading.Thread(
        target=_run_scenario_comparison,
        args=(req.scenario, methods, steps),
        daemon=True,
    )
    t.start()

    return {
        "status": "started",
        "scenario": req.scenario,
        "methods": methods,
        "steps": steps,
        "message": f"Benchmark started. Poll /api/scenarios/{req.scenario}/benchmark-status for progress.",
    }


@router.get("/{scenario}/benchmark-status")
async def get_benchmark_status(scenario: str):
    """Return current benchmark run status for a scenario."""
    if scenario not in SCENARIOS:
        raise HTTPException(status_code=400, detail=f"Unknown scenario: {scenario}")

    status = _benchmark_status.get(scenario, {"status": "idle", "steps_done": 0, "total_steps": 0})
    return {"scenario": scenario, **status}


@router.get("/{scenario}/results")
async def get_scenario_results(scenario: str):
    """Return benchmark results for a scenario (only real data, no hardcoded fallback)."""
    if scenario in _run_results:
        return {"scenario": scenario, "results": _run_results[scenario], "source": "live"}

    # Try loading from evaluation JSON file
    from ..services.metrics_service import get_evaluation_results
    import os as _os
    from training.config import METRICS_DIR
    eval_path = _os.path.join(_project_root, METRICS_DIR, f"evaluation_{scenario}.json")
    if _os.path.exists(eval_path):
        data = get_evaluation_results(scenario)
        if data:
            return {"scenario": scenario, "results": data, "source": "file"}

    # No real data available — return empty so frontend shows "awaiting benchmark"
    return {"scenario": scenario, "results": {}, "source": "none"}


@router.post("/findings")
async def generate_research_findings(payload: dict):
    """
    Generate Gemini Research Summary strictly based on measured scenario benchmark results.
    """
    from ..services.gemini_service import generate_research_summary
    scenario = payload.get("scenario", "high")
    exp_id = payload.get("experiment_id", f"EXP-{int(time.time())}")

    results = _run_results.get(scenario)
    if not results:
        from ..services.metrics_service import get_evaluation_results
        results = get_evaluation_results(scenario) or {}

    exp_data = {
        "experiment_id": exp_id,
        "scenario": scenario,
        "results": results,
        "runs": 100,
    }
    return generate_research_summary(exp_data)
