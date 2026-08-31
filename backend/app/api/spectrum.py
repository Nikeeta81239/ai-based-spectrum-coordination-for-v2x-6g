"""
spectrum.py — /api/spectrum endpoints
"""

from fastapi import APIRouter
from ..services.simulation_service import sim_service
from training.config import NUM_CHANNELS

router = APIRouter(prefix="/api/spectrum", tags=["spectrum"])


@router.get("")
async def get_spectrum():
    """Return overall spectrum status."""
    channels = sim_service.get_channel_states()
    overloaded = [ch["channel_id"] for ch in channels if ch["interference"] > 0.6]
    best = min(channels, key=lambda c: c["interference"])["channel_id"] if channels else 0
    return {
        "channels": channels,
        "overloaded_channels": overloaded,
        "best_channel": best,
        "num_channels": NUM_CHANNELS,
    }


@router.get("/channels")
async def get_channels():
    """Return detailed state for every channel."""
    return sim_service.get_channel_states()
