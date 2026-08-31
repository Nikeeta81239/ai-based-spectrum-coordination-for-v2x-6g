"""
metrics.py — /api/metrics endpoints
"""

from fastapi import APIRouter, HTTPException
from ..services import metrics_service as ms
from ..services.simulation_service import sim_service
from training.config import TRAFFIC_SCENARIOS

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("")
async def get_metrics():
    """Return metric history from the current/last simulation run."""
    history = sim_service.get_metric_history()
    if not history:
        return {"history": [], "summary": {}, "source": "simulation"}

    import numpy as np
    summary = {}
    for key in ["mean_interference", "mean_throughput_mbps", "mean_latency_ms",
                "mean_pdr", "mean_sinr_db", "spectral_efficiency", "mean_reward",
                "comm_overhead", "baseline_messages", "proposed_messages"]:
        vals = [h[key] for h in history if key in h]
        summary[key] = float(np.mean(vals)) if vals else 0.0

    return {"history": history, "summary": summary, "source": "simulation"}


@router.get("/privacy")
async def get_privacy_metrics():
    """Return signalling counts derived from the active simulation history."""
    history = sim_service.get_metric_history()
    if not history:
        return {
            "available": False,
            "baseline_messages": 0,
            "proposed_messages": 0,
            "reduction": 0.0,
            "steps": 0,
        }

    baseline = sum(point.get("baseline_messages", 0) for point in history)
    proposed = sum(point.get("proposed_messages", 0) for point in history)
    reduction = (baseline - proposed) / baseline if baseline else 0.0
    return {
        "available": True,
        "baseline_messages": int(baseline),
        "proposed_messages": int(proposed),
        "reduction": float(reduction),
        "steps": len(history),
        "unit": "modelled signalling messages",
    }


@router.get("/comparison")
async def get_comparison(scenario: str = "low"):
    """Return comparison results across all methods for a given scenario."""
    data = ms.get_comparison_data(scenario)
    if data is None:
        raise HTTPException(
            status_code=404,
            detail=f"No evaluation results found for scenario '{scenario}'. Run evaluate first."
        )
    return data


@router.get("/training")
async def get_training_metrics():
    """Return per-episode training metrics."""
    metrics = ms.get_training_metrics()
    if metrics is None:
        raise HTTPException(status_code=404, detail="No training metrics found. Run training first.")
    summary = ms.get_training_summary()
    return {"metrics": metrics, "summary": summary}
