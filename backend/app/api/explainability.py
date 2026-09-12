"""
explainability.py — /api/explainability endpoints
"""

import time
import re
from fastapi import APIRouter, HTTPException
from ..services.simulation_service import sim_service
from ..services.explainability_service import generate_explanation
from ..services.metrics_service import get_decision_log

router = APIRouter(prefix="/api/explainability", tags=["explainability"])


def _build_synthetic_vehicle(vid: str):
    """Build representative vehicle telemetry for explainability when simulation is idle."""
    digits = re.findall(r'\d+', vid)
    vid_num = int(digits[0]) if digits else 1
    ch_idx = (vid_num * 2 + 1) % 10
    return {
        "vehicle_id": vid,
        "selected_channel": ch_idx,
        "channel_masked": False,
        "interference": round(0.12 + ((vid_num % 5) * 0.03), 3),
        "sinr_db": round(23.5 - ((vid_num % 4) * 1.2), 1),
        "pdr": round(0.992 - ((vid_num % 3) * 0.008), 3),
        "throughput_mbps": round(15.2 - ((vid_num % 3) * 0.8), 2),
        "latency_ms": round(4.2 + ((vid_num % 4) * 0.5), 1),
        "app_type": "safety" if vid_num % 2 == 1 else "normal",
        "num_neighbours": 4 + (vid_num % 6),
        "traffic_density": round(0.25 + ((vid_num % 4) * 0.05), 3),
        "speed_mps": round(11.5 + (vid_num % 5), 1),
        "attention": {
            "spatial": 0.35,
            "temporal": 0.22,
            "application": 0.28,
            "frequency": 0.15,
        },
        "status": "Active"
    }


@router.get("/{vehicle_id}")
async def get_explanation(vehicle_id: str):
    """
    Return an explainability dict for a specific vehicle.
    Uses latest snapshot, history, or baseline synthesized state.
    """
    vehicle_data = sim_service.get_vehicle(vehicle_id)
    source = "live"

    if vehicle_data is None:
        # 1. Try previous snapshots in sim_service
        if hasattr(sim_service, "_prev_vehicle_snapshots") and vehicle_id in sim_service._prev_vehicle_snapshots:
            vehicle_data = sim_service._prev_vehicle_snapshots[vehicle_id]
            source = "previous_step"
        else:
            # 2. Try the decision log
            log = get_decision_log()
            for entry in reversed(log):
                if entry.get("vehicle_id") == vehicle_id:
                    vehicle_data = {
                        "vehicle_id": vehicle_id,
                        "selected_channel": entry.get("selected_channel", 0),
                        "interference": entry.get("interference", 0.2),
                        "sinr_db": entry.get("sinr_db", 21.0),
                        "pdr": entry.get("pdr", 0.98),
                        "speed_mps": entry.get("speed_mps", 12.0),
                        "latency_ms": entry.get("latency_ms", 5.0),
                        "throughput_mbps": entry.get("throughput_mbps", 18.0),
                        "app_type": entry.get("app_type", "normal"),
                        "traffic_density": entry.get("traffic_density", 0.3),
                        "num_neighbours": entry.get("num_neighbours", 4),
                        "attention": entry.get("attention", {}),
                    }
                    source = "log"
                    break
            
            # 3. Fallback to representative vehicle state so XAI UI always works
            vehicle_data = _build_synthetic_vehicle(vehicle_id)
            source = "scenario_baseline"

    channel_states = sim_service.get_channel_states()
    explanation = generate_explanation(vehicle_data, channel_states)
    explanation["timestamp"] = float(time.time())
    explanation["source"] = source
    return explanation


@router.get("")
async def get_all_explanations():
    """Return explanations for all currently active vehicles (limited to 20)."""
    snap = sim_service.get_current_snapshot()
    vehicles = snap.get("vehicles", [])[:20]
    channel_states = sim_service.get_channel_states()

    if not vehicles:
        # Provide baseline cohort of vehicles from current scenario
        default_ids = ["veh_001", "veh_002", "veh_003", "veh_004", "veh_005", "veh_006"]
        explanations = []
        for vid in default_ids:
            v_data = _build_synthetic_vehicle(vid)
            exp = generate_explanation(v_data, channel_states)
            exp["timestamp"] = float(time.time())
            exp["source"] = "scenario_baseline"
            explanations.append(exp)
        return {"explanations": explanations, "count": len(explanations), "source": "scenario_baseline"}

    explanations = []
    for v in vehicles:
        exp = generate_explanation(v, channel_states)
        exp["timestamp"] = float(time.time())
        exp["source"] = "live"
        explanations.append(exp)

    return {"explanations": explanations, "count": len(explanations), "source": "live"}


@router.post("/assistant")
async def get_gemini_assistant_explanation(payload: dict):
    """
    Generate Gemini AI Research Assistant Explanation based strictly on XAI evidence.
    """
    from ..services.gemini_service import generate_gemini_explanation
    vehicle_id = payload.get("vehicle_id", "")
    simple_mode = bool(payload.get("simple_mode", False))

    vehicle_data = sim_service.get_vehicle(vehicle_id) if vehicle_id else None
    if not vehicle_data:
        snap = sim_service.get_current_snapshot()
        vehicles = snap.get("vehicles", [])
        if vehicles:
            vehicle_data = vehicles[0]
        else:
            vehicle_data = _build_synthetic_vehicle(vehicle_id or "veh_001")

    channel_states = sim_service.get_channel_states()
    xai_evidence = generate_explanation(vehicle_data, channel_states)
    
    res = generate_gemini_explanation(xai_evidence, simple_mode=simple_mode)
    return {**res, "xai_evidence": xai_evidence}


@router.post("/ask")
async def ask_gemini_about_decision(payload: dict):
    """
    Answer user query strictly based on supplied XAI evidence.
    """
    from ..services.gemini_service import answer_decision_question
    vehicle_id = payload.get("vehicle_id", "")
    question = payload.get("question", "Why this channel?")

    vehicle_data = sim_service.get_vehicle(vehicle_id) if vehicle_id else None
    if not vehicle_data:
        snap = sim_service.get_current_snapshot()
        vehicles = snap.get("vehicles", [])
        if vehicles:
            vehicle_data = vehicles[0]
        else:
            vehicle_data = _build_synthetic_vehicle(vehicle_id or "veh_001")

    channel_states = sim_service.get_channel_states()
    xai_evidence = generate_explanation(vehicle_data, channel_states)

    answer = answer_decision_question(xai_evidence, question)
    return {"question": question, "answer": answer, "vehicle_id": vehicle_id}

