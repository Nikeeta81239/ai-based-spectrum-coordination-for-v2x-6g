"""
database_models.py — SQLAlchemy ORM models (tables stored in SQLite).
"""

from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, JSON, Text
from ..core.database import Base


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id            = Column(Integer, primary_key=True, index=True)
    scenario      = Column(String(64), nullable=False)
    num_vehicles  = Column(Integer, nullable=False)
    num_channels  = Column(Integer, default=6)
    status        = Column(String(32), default="idle")   # idle | running | stopped | completed
    started_at    = Column(DateTime, default=datetime.utcnow)
    stopped_at    = Column(DateTime, nullable=True)
    total_steps   = Column(Integer, default=0)
    notes         = Column(Text, nullable=True)


class VehicleSnapshot(Base):
    __tablename__ = "vehicle_snapshots"

    id              = Column(Integer, primary_key=True, index=True)
    run_id          = Column(Integer, nullable=False, index=True)
    time_step       = Column(Float, nullable=False)
    vehicle_id      = Column(String(64), nullable=False)
    latitude        = Column(Float)
    longitude       = Column(Float)
    speed_mps       = Column(Float)
    selected_channel = Column(Integer)
    interference    = Column(Float)
    sinr_db         = Column(Float)
    pdr             = Column(Float)
    throughput_mbps = Column(Float)
    latency_ms      = Column(Float)
    app_type        = Column(String(32))


class SpectrumDecision(Base):
    __tablename__ = "spectrum_decisions"

    id           = Column(Integer, primary_key=True, index=True)
    run_id       = Column(Integer, nullable=False, index=True)
    time_step    = Column(Float, nullable=False)
    vehicle_id   = Column(String(64), nullable=False)
    channel      = Column(Integer, nullable=False)
    interference = Column(Float)
    reward       = Column(Float)
    attn_weights = Column(JSON, nullable=True)   # {spatial, temporal, app, freq}
    reasons      = Column(JSON, nullable=True)   # list of strings


class MetricRecord(Base):
    __tablename__ = "metric_records"

    id                  = Column(Integer, primary_key=True, index=True)
    run_id              = Column(Integer, nullable=False, index=True)
    time_step           = Column(Float, nullable=False)
    mean_interference   = Column(Float)
    mean_throughput_mbps = Column(Float)
    mean_latency_ms     = Column(Float)
    mean_pdr            = Column(Float)
    mean_sinr_db        = Column(Float)
    spectral_efficiency = Column(Float)
    channel_switching   = Column(Float)
    comm_overhead       = Column(Float)
    mean_reward         = Column(Float)


class TrainingRun(Base):
    __tablename__ = "training_runs"

    id           = Column(Integer, primary_key=True, index=True)
    scenario     = Column(String(64), nullable=False)
    episodes     = Column(Integer, nullable=False)
    status       = Column(String(32), default="not_started")  # not_started | running | done | failed
    started_at   = Column(DateTime, nullable=True)
    finished_at  = Column(DateTime, nullable=True)
    best_reward  = Column(Float, nullable=True)
    final_reward = Column(Float, nullable=True)
    metrics_path = Column(String(256), nullable=True)


class ScenarioRun(Base):
    __tablename__ = "scenario_runs"

    id           = Column(Integer, primary_key=True, index=True)
    scenario     = Column(String(64), nullable=False)
    method       = Column(String(64), nullable=False)   # random | greedy | proposed
    num_vehicles = Column(Integer)
    metrics      = Column(JSON, nullable=True)          # dict of metric values
    run_at       = Column(DateTime, default=datetime.utcnow)
