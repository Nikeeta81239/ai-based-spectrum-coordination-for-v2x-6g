"""
main.py — FastAPI Application Entry Point
==========================================

Runs the backend server, registers CORS, database startup hooks, API routers,
and WebSocket endpoints.

Run command:
    uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
"""

import os
import sys
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Add project root to sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app.core.config import settings
from backend.app.core.database import init_db
from backend.app.api import (
    simulation, vehicles, spectrum, ai, metrics, explainability, scenarios
)
from backend.app.websocket import simulation_socket

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("backend.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database tables...")
    await init_db()
    logger.info("Database initialized.")
    yield
    logger.info("Shutting down backend server...")


app = FastAPI(
    title="6G V2X AI Spectrum Coordination API",
    description="Backend API for Privacy-Aware Dynamic Spectrum Coordination using MARL and Multi-Head Attention.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS Middleware ────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev / demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include Routers ───────────────────────────────────────────────────────────
app.include_router(simulation.router)
app.include_router(vehicles.router)
app.include_router(spectrum.router)
app.include_router(ai.router)
app.include_router(metrics.router)
app.include_router(explainability.router)
app.include_router(scenarios.router)
app.include_router(simulation_socket.router)


@app.get("/api/health")
async def health_check():
    import time
    return {
        "status": "healthy",
        "service": "6G V2X Spectrum Coordination Backend",
        "version": "1.0.0",
        "timestamp": time.time(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True
    )
