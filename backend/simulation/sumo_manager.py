"""
sumo_manager.py — SUMO & TraCI Process Controller
Handles launching, controlling, and shutting down SUMO / TraCI safely.
"""

import os
import sys
import subprocess
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class SumoManager:
    def __init__(
        self,
        sumo_home: Optional[str] = None,
        sumo_binary: str = "sumo",
        config_path: Optional[str] = None,
        step_length: float = 1.0,
    ):
        self.sumo_home = sumo_home or os.environ.get("SUMO_HOME", "")
        self.sumo_binary = sumo_binary
        self.config_path = config_path
        self.step_length = step_length
        self.traci = None
        self.is_running = False

    def check_sumo_installed(self) -> bool:
        """Verify if SUMO is accessible in PATH or via SUMO_HOME."""
        if not self.sumo_home and not os.environ.get("SUMO_HOME"):
            logger.warning("SUMO_HOME environment variable is not set.")
        try:
            res = subprocess.run([self.sumo_binary, "--version"], capture_output=True, text=True)
            return res.returncode == 0
        except FileNotFoundError:
            return False

    def start(self, gui: bool = False, config_file: Optional[str] = None) -> bool:
        """Start SUMO process via TraCI."""
        cfg = config_file or self.config_path
        if not cfg or not os.path.exists(cfg):
            logger.error(f"SUMO config file not found: {cfg}")
            return False

        try:
            import traci
            self.traci = traci
            binary = "sumo-gui" if gui else self.sumo_binary
            cmd = [binary, "-c", cfg, "--step-length", str(self.step_length), "--start"]
            self.traci.start(cmd)
            self.is_running = True
            logger.info(f"Started TraCI simulation with config: {cfg}")
            return True
        except ImportError:
            logger.error("Python traci module is not installed. Install with `pip install traci`.")
            return False
        except Exception as e:
            logger.error(f"Failed to start TraCI: {e}")
            return False

    def step(self) -> Dict[str, Any]:
        """Advance SUMO by one step and collect vehicle positions and speeds."""
        if not self.is_running or not self.traci:
            return {}

        self.traci.simulationStep()
        vehicles = {}
        veh_ids = self.traci.vehicle.getIDList()

        for vid in veh_ids:
            x, y = self.traci.vehicle.getPosition(vid)
            lon, lat = self.traci.simulation.convertGeo(x, y)
            speed = self.traci.vehicle.getSpeed(vid)
            edge = self.traci.vehicle.getRoadID(vid)
            vehicles[vid] = {
                "vehicle_id": vid,
                "position": (lon, lat),
                "speed_mps": speed,
                "edge": edge,
            }

        return vehicles

    def stop(self):
        """Safely close TraCI connection."""
        if self.is_running and self.traci:
            try:
                self.traci.close()
            except Exception as e:
                logger.warning(f"Error while closing TraCI: {e}")
            self.is_running = False
            logger.info("TraCI simulation stopped.")
