"""
simulation.py — /api/simulation endpoints
"""

import time
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..models.schemas import (
    SimulationStartRequest, SimulationStatusResponse, SimulationCurrentResponse
)
from ..services.simulation_service import sim_service
from ..models import database_models as dbm

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/simulation", tags=["simulation"])


# ── DB helper ──────────────────────────────────────────────────────────────────
async def _create_run_record(db: AsyncSession, scenario: str, num_vehicles: int) -> int:
    try:
        run = dbm.SimulationRun(
            scenario=scenario,
            num_vehicles=num_vehicles,
            status="running",
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)
        return run.id
    except Exception as exc:
        logger.warning(f"Could not persist simulation run record: {exc}")
        await db.rollback()
        return 0


# ── Endpoints ──────────────────────────────────────────────────────────────────
@router.get("/status", response_model=SimulationStatusResponse)
async def get_status():
    """Return current simulation status."""
    return sim_service.get_status()


@router.post("/start")
async def start_simulation(
    req: SimulationStartRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Start or restart a simulation run."""
    try:
        run_id = await _create_run_record(db, req.scenario, req.num_vehicles or 21)
        sim_service.start(
            scenario=req.scenario,
            num_vehicles=req.num_vehicles,
            duration_steps=req.duration_steps or 600,
            speed_multiplier=req.speed_multiplier or 1.0,
            run_id=run_id,
            ai_mode=req.ai_mode or "marl",
        )
        return {
            "status": "running",
            "run_id": run_id,
            "scenario": req.scenario,
            "message": "Simulation started successfully."
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Failed to start simulation")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pause")
async def pause_simulation():
    """Pause the running simulation."""
    sim_service.pause()
    return {"status": "paused", "message": "Simulation paused."}


@router.post("/resume")
async def resume_simulation():
    """Resume paused simulation."""
    sim_service.resume()
    return {"status": "running", "message": "Simulation resumed."}


@router.post("/speed")
async def set_simulation_speed(multiplier: float = 1.0):
    """Set simulation speed multiplier."""
    sim_service.set_speed(multiplier)
    return {"status": sim_service.status, "speed_multiplier": multiplier}


@router.post("/stop")
async def stop_simulation(db: AsyncSession = Depends(get_db)):
    """Stop the running simulation."""
    sim_service.stop()
    return {"status": "stopped", "message": "Simulation stopped."}


@router.post("/reset")
async def reset_simulation():
    """Reset the simulation to idle state."""
    sim_service.reset()
    return {"status": "idle", "message": "Simulation reset."}


@router.get("/current", response_model=SimulationCurrentResponse)
async def get_current():
    """Get the current simulation state snapshot."""
    snap = sim_service.get_current_snapshot()
    return snap


@router.post("/step")
async def advance_step():
    """Advance simulation by one step."""
    snap = sim_service.step()
    return snap
