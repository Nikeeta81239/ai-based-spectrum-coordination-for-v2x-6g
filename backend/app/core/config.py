"""
config.py — Backend configuration using pydantic-settings.
Reads from environment variables / .env file.
"""

import os
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    # ── Server ────────────────────────────────────────────────────────────
    BACKEND_HOST: str = Field(default="0.0.0.0", env="BACKEND_HOST")
    BACKEND_PORT: int = Field(default=8000, env="BACKEND_PORT")
    DEBUG: bool = Field(default=True, env="DEBUG")

    # ── Database ─────────────────────────────────────────────────────────
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./v2x_spectrum.db",
        env="DATABASE_URL"
    )

    # ── SUMO ─────────────────────────────────────────────────────────────
    SUMO_HOME: str = Field(default="", env="SUMO_HOME")
    SUMO_BINARY: str = Field(default="sumo", env="SUMO_BINARY")
    SUMO_CONFIG: str = Field(default="sumo/scenarios/normal.sumocfg", env="SUMO_CONFIG")
    SIMULATION_STEP: float = Field(default=1.0, env="SIMULATION_STEP")
    DEFAULT_VEHICLES: int = Field(default=21, env="DEFAULT_VEHICLES")
    DEFAULT_CHANNELS: int = Field(default=6, env="DEFAULT_CHANNELS")

    # ── Paths ─────────────────────────────────────────────────────────────
    MODEL_PATH: str = Field(default="models/best", env="MODEL_PATH")
    MOBILITY_CSV: str = Field(default="data/raw/v2x_dataset.csv", env="MOBILITY_CSV")
    METRICS_DIR: str = Field(default="results/metrics", env="METRICS_DIR")
    LOGS_DIR: str = Field(default="results/logs", env="LOGS_DIR")

    # ── CORS ──────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000",
                             "http://127.0.0.1:5173"]

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_value(cls, value):
        """Accept common deployment labels as well as ordinary boolean values.

        Some Windows developer environments set ``DEBUG=release`` globally.
        Treat that as disabled debug mode instead of preventing the API from
        starting at configuration-validation time.
        """
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "production", "prod", "off"}:
                return False
            if normalized in {"development", "dev", "debug", "on"}:
                return True
        return value

    model_config = {"env_file": ".env", "case_sensitive": True, "extra": "ignore"}


settings = Settings()


# ── Resolve project root (backend is one level inside project-root) ──────────
_backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
PROJECT_ROOT = os.path.abspath(
    os.path.join(_backend_dir, "..")
)


def abs_path(relative: str) -> str:
    """Resolve a project-relative path to an absolute path."""
    return os.path.join(PROJECT_ROOT, relative)
