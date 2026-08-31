"""
vehicles.py — /api/vehicles endpoints
"""

from fastapi import APIRouter, HTTPException
from ..services.simulation_service import sim_service

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])


@router.get("")
async def get_vehicles():
    """Return all vehicle states from the current simulation step."""
    snap = sim_service.get_current_snapshot()
    return {"vehicles": snap.get("vehicles", []), "count": len(snap.get("vehicles", []))}


@router.get("/{vehicle_id}")
async def get_vehicle(vehicle_id: str):
    """Return state for a specific vehicle."""
    vehicle = sim_service.get_vehicle(vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail=f"Vehicle '{vehicle_id}' not found.")
    return vehicle
