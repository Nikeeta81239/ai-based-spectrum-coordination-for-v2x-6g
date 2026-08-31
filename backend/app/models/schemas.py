"""
schemas.py — Pydantic v2 request/response models.
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ── Health ────────────────────────────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str


# ── Simulation ────────────────────────────────────────────────────────────────
class SimulationStartRequest(BaseModel):
    scenario: str = Field(default="low", description="Traffic scenario name")
    num_vehicles: Optional[int] = Field(default=None, ge=1, le=500)
    duration_steps: Optional[int] = Field(default=None, ge=10, le=5000)
    speed_multiplier: Optional[float] = Field(default=1.0, ge=0.1, le=10.0)
    ai_mode: Optional[str] = Field(default="marl", description="AI Decision Mode: marl, random, fixed, greedy")


class SimulationStatusResponse(BaseModel):
    status: str
    scenario: Optional[str]
    current_step: int
    total_steps: int
    num_vehicles: int
    elapsed_seconds: float
    run_id: Optional[int]


class SimulationCurrentResponse(BaseModel):
    time_step: float
    num_vehicles: int
    vehicles: List[Dict[str, Any]]
    channels: List[Dict[str, Any]]
    metrics: Dict[str, float]


# ── Vehicles ──────────────────────────────────────────────────────────────────
class VehicleResponse(BaseModel):
    vehicle_id: str
    latitude: float
    longitude: float
    speed_mps: float
    selected_channel: int
    interference: float
    sinr_db: float
    pdr: float
    throughput_mbps: float
    latency_ms: float
    app_type: str
    num_neighbours: int
    traffic_density: float


# ── Spectrum ──────────────────────────────────────────────────────────────────
class ChannelResponse(BaseModel):
    channel_id: int
    label: str
    interference: float
    utilisation: float
    available: bool
    num_users: int
    estimated_quality: float   # 0-1


class SpectrumStatusResponse(BaseModel):
    channels: List[ChannelResponse]
    overloaded_channels: List[int]
    best_channel: int
    timestamp: float


# ── AI / Model ────────────────────────────────────────────────────────────────
class AIStatusResponse(BaseModel):
    model_loaded: bool
    model_path: Optional[str]
    num_agents: int
    training_status: str   # not_started | running | done | failed
    last_episode: int
    best_reward: Optional[float]
    device: str


class TrainRequest(BaseModel):
    scenario: str = Field(default="low")
    episodes: int = Field(default=50, ge=1, le=2000)
    num_vehicles: Optional[int] = Field(default=None)


class TrainResponse(BaseModel):
    status: str
    message: str
    training_run_id: Optional[int]


class AttentionResponse(BaseModel):
    vehicle_id: str
    spatial: float
    temporal: float
    application: float
    frequency: float
    timestamp: float


# ── Metrics ───────────────────────────────────────────────────────────────────
class MetricPoint(BaseModel):
    time_step: float
    mean_interference: float
    mean_throughput_mbps: float
    mean_latency_ms: float
    mean_pdr: float
    mean_sinr_db: float
    spectral_efficiency: float
    mean_reward: float
    comm_overhead: float


class MetricsResponse(BaseModel):
    run_id: Optional[int]
    points: List[MetricPoint]
    summary: Dict[str, float]


class ComparisonResponse(BaseModel):
    scenario: str
    methods: List[str]
    results: Dict[str, Dict[str, float]]


# ── Explainability ────────────────────────────────────────────────────────────
class ExplainabilityResponse(BaseModel):
    vehicle_id: str
    selected_channel: int
    channel_label: str
    confidence: float
    attention_importance: Dict[str, float]
    feature_importance: Dict[str, float]
    reasons: List[str]
    timestamp: float


# ── Scenarios ─────────────────────────────────────────────────────────────────
class ScenarioInfo(BaseModel):
    name: str
    label: str
    description: str
    num_vehicles: int
    density_factor: float


class ScenarioRunRequest(BaseModel):
    scenario: str
    methods: Optional[List[str]] = Field(
        default=["random", "greedy", "proposed"]
    )
    steps: int = Field(default=100, ge=10, le=2000)


class ScenarioRunResponse(BaseModel):
    scenario: str
    steps_run: int
    results: Dict[str, Dict[str, float]]
    run_id: int


# ── WebSocket messages ────────────────────────────────────────────────────────
class WSMessage(BaseModel):
    type: str   # "state" | "metric" | "error" | "status"
    data: Dict[str, Any]
    timestamp: float
