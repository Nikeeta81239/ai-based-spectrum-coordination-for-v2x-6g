"""
explainability.py — /api/explainability endpoints
"""

import time
from fastapi import APIRouter, HTTPException
from ..services.simulation_service import sim_service
from ..services.explainability_service import generate_explanation
from ..services.metrics_service import get_decision_log

router = APIRouter(prefix="/api/explainability", tags=["explainability"])


@router.get("/{vehicle_id}")
async def get_explanation(vehicle_id: str):
    """
    Return an explainability dict for a specific vehicle.
    Uses the latest simulation snapshot.
    """
    vehicle_data = sim_service.get_vehicle(vehicle_id)
    if vehicle_data is None:
        # Try the decision log
        log = get_decision_log()
        for entry in reversed(log):
            if entry.get("vehicle_id") == vehicle_id:
                return {**entry, "timestamp": float(time.time()), "source": "log"}
        raise HTTPException(status_code=404, detail=f"Vehicle '{vehicle_id}' not found.")

    channel_states = sim_service.get_channel_states()
    explanation = generate_explanation(vehicle_data, channel_states)
    explanation["timestamp"] = float(time.time())
    return explanation


@router.get("")
async def get_all_explanations():
    """Return explanations for all currently active vehicles (limited to 20)."""
    snap = sim_service.get_current_snapshot()
    vehicles = snap.get("vehicles", [])[:20]
    if not vehicles:
        return {"explanations": [], "message": "No active simulation vehicles."}

    channel_states = sim_service.get_channel_states()
    explanations = []
    for v in vehicles:
        exp = generate_explanation(v, channel_states)
        exp["timestamp"] = float(time.time())
        explanations.append(exp)

    return {"explanations": explanations, "count": len(explanations)}


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
        vehicle_data = vehicles[0] if vehicles else {}

    channel_states = sim_service.get_channel_states()
    xai_evidence = generate_explanation(vehicle_data, channel_states) if vehicle_data else {}
    
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
        vehicle_data = vehicles[0] if vehicles else {}

    channel_states = sim_service.get_channel_states()
    xai_evidence = generate_explanation(vehicle_data, channel_states) if vehicle_data else {}

    answer = answer_decision_question(xai_evidence, question)
    return {"question": question, "answer": answer, "vehicle_id": vehicle_id}
