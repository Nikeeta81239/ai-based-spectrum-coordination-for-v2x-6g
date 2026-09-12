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
    use_curr = (scenario.lower() == "curriculum")
    _training_state["message"] = f"MAPPO Training in progress ({'Curriculum 20->300' if use_curr else scenario}, {episodes} episodes)..."

    if _project_root not in sys.path:
        sys.path.insert(0, _project_root)

    def on_step(ep, total, metric):
        _training_state["episode"] = ep
        _training_state["total_episodes"] = total
        _training_state["last_reward"] = metric.get("mean_reward")
        _training_state["message"] = f"Episode {ep}/{total}: Reward={metric.get('mean_reward', 0):.2f}, PDR={metric.get('mean_pdr', 0)*100:.1f}%"

    try:
        import training.config as cfg
        cfg.NUM_EPISODES = episodes
        from training.train import train
        metrics = train(scenario=scenario if not use_curr else "low", use_curriculum=use_curr, step_callback=on_step)
        if metrics:
            _training_state["best_reward"]  = max(m["mean_reward"] for m in metrics)
            _training_state["final_reward"] = metrics[-1]["mean_reward"]
            _training_state["episode"]      = len(metrics)
        _training_state["status"]  = "done"
        _training_state["message"] = f"MAPPO Training successfully completed ({len(metrics) if metrics else episodes} episodes)."
        logger.info("[AI] MAPPO Training completed.")
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


@router.post("/stop")
async def stop_ai():
    """Reset training or evaluation states if interrupted."""
    global _training_state, _eval_state
    _training_state["status"] = "idle"
    _training_state["message"] = "Training reset to idle."
    _eval_state["status"] = "idle"
    _eval_state["message"] = "Evaluation reset to idle."
    return {"status": "reset", "message": "AI training and evaluation status reset to idle."}


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

@router.get("/checkpoints")
async def get_checkpoints():
    """Return list of real saved PyTorch checkpoint directories and metadata."""
    import json
    models_dir = os.path.join(_project_root, "models")
    metrics_path = os.path.join(_project_root, "results", "metrics", "training_metrics.json")

    training_lookup = {}
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r") as mf:
                m_list = json.load(mf)
                for m in m_list:
                    training_lookup[m.get("episode")] = m
        except Exception:
            pass

    checkpoints = []
    if os.path.isdir(models_dir):
        for entry in sorted(os.listdir(models_dir)):
            full_p = os.path.join(models_dir, entry)
            if os.path.isdir(full_p):
                pts = glob.glob(os.path.join(full_p, "*.pt"))
                has_gc = os.path.exists(os.path.join(full_p, "global_critic.pt"))
                is_best = (entry == "best")
                if is_best:
                    ep_num = 50
                    stage_name = "Production Deployment (Best Converged)"
                elif entry.startswith("ep") and entry[2:].isdigit():
                    ep_num = int(entry[2:])
                    if ep_num <= 5:
                        stage_name = "Early Exploration"
                    elif ep_num <= 20:
                        stage_name = "Curriculum Stabilization"
                    elif ep_num <= 40:
                        stage_name = "High Density Refinement"
                    else:
                        stage_name = "Convergence Tuning"
                else:
                    ep_num = 0
                    stage_name = "Custom Checkpoint"

                m = training_lookup.get(ep_num, {})
                checkpoints.append({
                    "id": entry,
                    "name": f"Checkpoint {entry.upper()}",
                    "stage": stage_name,
                    "episode": ep_num,
                    "is_best": is_best,
                    "is_loaded": is_best,  # by default models/best is loaded
                    "file_summary": f"global_critic.pt + {len([p for p in pts if 'agent_' in p])} Agents",
                    "agent_count": len([p for p in pts if "agent_" in p]),
                    "has_global_critic": has_gc,
                    "total_size_mb": round(sum(os.path.getsize(p) for p in pts) / (1024 * 1024), 2) if pts else 0.0,
                    "path": full_p,
                    "reward": m.get("mean_reward"),
                    "pdr": m.get("mean_pdr"),
                    "sinr_db": m.get("mean_sinr_db"),
                    "throughput_mbps": m.get("mean_throughput"),
                    "latency_ms": m.get("mean_latency_ms"),
                })

    # Sort so best and chronological episodes appear naturally
    checkpoints.sort(key=lambda c: (not c["is_best"], c["episode"]))
    return {"checkpoints": checkpoints}


@router.post("/checkpoints/load")
async def load_checkpoint(checkpoint_id: str = "best"):
    """Load a specific saved model checkpoint folder into the simulation agent system."""
    models_dir = os.path.join(_project_root, "models", checkpoint_id)
    if not os.path.isdir(models_dir):
        raise HTTPException(status_code=404, detail=f"Checkpoint directory '{checkpoint_id}' not found.")

    try:
        sim_service._try_load_model(models_dir)
        return {
            "status": "loaded",
            "checkpoint_id": checkpoint_id,
            "path": models_dir,
            "message": f"Successfully loaded weights from models/{checkpoint_id}"
        }
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Error loading checkpoint: {ex}")

