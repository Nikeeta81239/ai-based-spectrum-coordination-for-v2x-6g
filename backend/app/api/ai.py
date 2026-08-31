"""
ai.py — /api/ai endpoints (model status, train, evaluate, attention)
"""

import asyncio
import logging
import os
import sys
import time
import threading
import glob
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks

from ..models.schemas import AIStatusResponse, TrainRequest, TrainResponse
from ..services.simulation_service import sim_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["ai"])

# ── In-memory training and evaluation states ──────────────────────────────────
_training_state = {
    "status": "idle",  # idle | running | done | failed
    "episode": 0,
    "total_episodes": 50,
    "best_reward": None,
    "final_reward": None,
    "message": "Model ready.",
}

_eval_state = {
    "status": "idle",  # idle | running | done | failed
    "scenario": "low",
    "message": "Evaluation ready.",
}

_project_root = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)

_training_thread = None
_eval_thread = None


def _run_training(scenario: str, episodes: int):
    """Run training in a background thread."""
    global _training_state
    _training_state["status"] = "running"
    _training_state["episode"] = 0
    _training_state["total_episodes"] = episodes
    _training_state["message"] = f"Training in progress ({scenario} scenario, {episodes} episodes)..."

    if _project_root not in sys.path:
        sys.path.insert(0, _project_root)

    try:
        import training.config as cfg
        cfg.NUM_EPISODES = episodes
        from training.train import train
        metrics = train(scenario=scenario)
        if metrics:
            _training_state["best_reward"]  = max(m["mean_reward"] for m in metrics)
            _training_state["final_reward"] = metrics[-1]["mean_reward"]
            _training_state["episode"]      = len(metrics)
        _training_state["status"]  = "done"
        _training_state["message"] = f"Training successfully completed ({episodes} episodes)."
        logger.info("[AI] Training completed.")
    except Exception as exc:
        _training_state["status"]  = "failed"
        _training_state["message"] = f"Training error: {exc}"
        logger.exception("[AI] Training failed.")


def _run_eval(scenario: str):
    """Run evaluation in a background thread."""
    global _eval_state
    _eval_state["status"] = "running"
    _eval_state["scenario"] = scenario
    _eval_state["message"] = f"Evaluating baselines for {scenario} scenario..."

    if _project_root not in sys.path:
        sys.path.insert(0, _project_root)
    try:
        from evaluation.evaluate import evaluate
        evaluate(scenario=scenario)
        _eval_state["status"] = "done"
        _eval_state["message"] = f"Evaluation completed for scenario: {scenario}"
        logger.info(f"[AI] Evaluation complete for scenario={scenario}.")
    except Exception as exc:
        _eval_state["status"] = "failed"
        _eval_state["message"] = f"Evaluation error: {exc}"
        logger.exception(f"[AI] Evaluation failed: {exc}")


# ── Endpoints ──────────────────────────────────────────────────────────────────
@router.get("/status")
async def get_ai_status():
    """Return AI model status and training/evaluation states."""
    import torch
    model_dir = os.path.join(_project_root, "models", "best")
    checkpoint_paths = glob.glob(os.path.join(model_dir, "agent_*.pt")) if os.path.isdir(model_dir) else []
    model_loaded = os.path.isfile(os.path.join(model_dir, "global_critic.pt")) or bool(checkpoint_paths)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    return {
        "model_loaded": model_loaded,
        "model_path": model_dir if model_loaded else None,
        "num_agents": len(sim_service._mas.agents) if (sim_service and sim_service._mas) else 0,
        "training_status": _training_state["status"],
        "training_message": _training_state["message"],
        "last_episode": _training_state["episode"],
        "total_episodes": _training_state["total_episodes"],
        "best_reward": _training_state["best_reward"],
        "final_reward": _training_state["final_reward"],
        "eval_status": _eval_state["status"],
        "eval_message": _eval_state["message"],
        "device": device,
    }


@router.post("/train")
async def train_model(req: TrainRequest):
    """Start model training in the background."""
    global _training_thread
    if _training_state["status"] == "running" and _training_thread and _training_thread.is_alive():
        return {
            "status": "already_running",
            "message": "Training is already in progress.",
            "episode": _training_state["episode"],
            "total_episodes": _training_state["total_episodes"],
        }

    _training_thread = threading.Thread(
        target=_run_training,
        args=(req.scenario, req.episodes or 50),
        daemon=True,
    )
    _training_thread.start()

    return {
        "status": "started",
        "message": f"Training initiated: scenario={req.scenario}, episodes={req.episodes or 50}",
        "scenario": req.scenario,
        "episodes": req.episodes or 50,
    }


@router.post("/evaluate")
async def evaluate_model(scenario: str = "low"):
    """Run baseline evaluation comparing all methods."""
    global _eval_thread
    if _eval_state["status"] == "running" and _eval_thread and _eval_thread.is_alive():
        return {
            "status": "already_running",
            "message": f"Evaluation for {scenario} is already in progress.",
        }

    _eval_thread = threading.Thread(target=_run_eval, args=(scenario,), daemon=True)
    _eval_thread.start()

    return {
        "status": "started",
        "message": f"Evaluation started for scenario: {scenario}",
        "scenario": scenario,
    }


@router.get("/attention")
async def get_attention():
    """Return the most recent attention weights for active vehicles."""
    snap = sim_service.get_current_snapshot()
    vehicles = snap.get("vehicles", [])
    if not vehicles:
        # Provide sample attention breakdown if simulation is idle
        return {
            "vehicles": [
                {
                    "vehicle_id": "veh_demo",
                    "spatial": 0.35,
                    "temporal": 0.28,
                    "application": 0.22,
                    "frequency": 0.15,
                    "timestamp": float(time.time()),
                }
            ],
            "message": "Showing demo attention weights (start simulation for live data)."
        }

    result = []
    for v in vehicles[:10]:
        attn = v.get("attention", {})
        result.append({
            "vehicle_id":  v["vehicle_id"],
            "spatial":     attn.get("spatial", 0.35),
            "temporal":    attn.get("temporal", 0.25),
            "application": attn.get("application", 0.25),
            "frequency":   attn.get("frequency", 0.15),
            "timestamp":   float(time.time()),
        })

    return {"vehicles": result}
