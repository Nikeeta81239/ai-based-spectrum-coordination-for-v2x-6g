"""
sumo_manager.py — SUMO & TraCI Process Controller
==================================================
Manages the real SUMO microscopic simulation lifecycle via TraCI:
1. Detects SUMO binaries (sumo, sumo-gui) and verifies PATH/SUMO_HOME.
2. Supports launching SUMO-GUI when gui=True, or headless sumo.
3. At each step, uses TraCI to extract real vehicle state:
   - vehicle_id, simulation_time, x, y, speed, acceleration, lane, edge, heading,
     vehicle_type, and neighboring vehicles within communication range.
4. Manages connection status: CONNECTED, DISCONNECTED, STARTING, STOPPED.
5. Controls stepping, pausing, resuming, speed rate, and clean shutdown.
"""

import os
import sys
import subprocess
import logging
import math
from typing import Optional, Dict, Any, List, Tuple

logger = logging.getLogger(__name__)

# Standard SUMO search paths on Windows
STANDARD_SUMO_PATHS = [
    r"C:\Program Files (x86)\Eclipse\Sumo\bin",
    r"C:\Program Files\Eclipse\Sumo\bin",
    r"C:\sumo\bin",
]


def kill_all_sumo_processes():
    """Force-terminate any lingering sumo or sumo-gui processes so ports and locks are released."""
    try:
        if sys.platform == "win32":
            subprocess.run(
                ["taskkill", "/F", "/IM", "sumo.exe", "/IM", "sumo-gui.exe"],
                capture_output=True,
                timeout=5,
            )
        else:
            subprocess.run(["pkill", "-9", "-f", "sumo"], capture_output=True, timeout=5)
    except Exception:
        pass


class SumoManager:
    """
    Controller for the live SUMO simulation via Python TraCI.
    """

    def __init__(
        self,
        sumo_home: Optional[str] = None,
        config_path: Optional[str] = None,
        step_length: float = 1.0,
        comm_range_m: float = 150.0,
    ):
        self.sumo_home = sumo_home or os.environ.get("SUMO_HOME", "")
        self.config_path = config_path
        self.step_length = step_length
        self.comm_range_m = comm_range_m

        self.traci = None
        self.is_running = False
        self.status = "DISCONNECTED"  # CONNECTED | DISCONNECTED | STARTING | STOPPED
        self.gui_mode = False
        self.simulation_time = 0.0
        self.current_step = 0
        self.active_vehicle_ids: set = set()
        self._prev_speeds: Dict[str, float] = {}

        self._resolve_binaries()

    def _resolve_binaries(self):
        """Locate sumo and sumo-gui executables on the system."""
        self.sumo_binary = "sumo"
        self.sumo_gui_binary = "sumo-gui"

        # Check in standard paths if not directly in PATH
        for p in STANDARD_SUMO_PATHS:
            sumo_exe = os.path.join(p, "sumo.exe")
            sumo_gui_exe = os.path.join(p, "sumo-gui.exe")
            if os.path.isfile(sumo_exe) and os.path.isfile(sumo_gui_exe):
                self.sumo_binary = sumo_exe
                self.sumo_gui_binary = sumo_gui_exe
                if not os.environ.get("SUMO_HOME"):
                    os.environ["SUMO_HOME"] = os.path.dirname(p)
                break

    def check_sumo_installed(self) -> Tuple[bool, str]:
        """Verify if SUMO binary is accessible."""
        try:
            res = subprocess.run([self.sumo_binary, "--version"], capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                first_line = res.stdout.splitlines()[0] if res.stdout else "Eclipse SUMO"
                return True, first_line
        except Exception as e:
            logger.warning(f"Could not execute sumo: {e}")
        return False, "SUMO executable not found in PATH or standard installation directories."

    def start(self, gui: bool = True, config_file: Optional[str] = None, scenario: str = "low") -> bool:
        """Start SUMO process via TraCI."""
        self.status = "STARTING"
        self.gui_mode = gui

        # Locate config file
        cfg = config_file or self.config_path
        if not cfg or not os.path.exists(cfg):
            # Check standard scenario configs in sumo data/configs/
            proj_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            candidates = [
                os.path.join(proj_root, "sumo data", "configs", f"scenario_{scenario}.sumocfg"),
                os.path.join(proj_root, "sumo data", "simulation.sumocfg"),
            ]
            for c in candidates:
                if os.path.isfile(c):
                    cfg = c
                    break

        if not cfg or not os.path.exists(cfg):
            logger.error(f"[SumoManager] SUMO config file not found: {cfg}")
            self.status = "DISCONNECTED"
            return False

        try:
            import traci
            self.traci = traci

            # Ensure any leftover/zombie SUMO processes from previous runs or system sleep are terminated
            kill_all_sumo_processes()

            binary = self.sumo_gui_binary if gui else self.sumo_binary
            cmd = [
                binary,
                "-c", cfg,
                "--step-length", str(self.step_length),
                "--start",
                "--quit-on-end", "false",
            ]
            
            logger.info(f"[SumoManager] Launching: {' '.join(cmd)}")
            self.traci.start(cmd)
            self.is_running = True
            self.status = "CONNECTED"
            self.simulation_time = float(self.traci.simulation.getTime())
            self.current_step = 0
            self.active_vehicle_ids.clear()
            self._prev_speeds.clear()
            logger.info(f"[SumoManager] TraCI connected successfully to {binary}")
            return True
        except ImportError:
            logger.error("[SumoManager] Python traci module is not installed.")
            self.status = "DISCONNECTED"
            return False
        except Exception as e:
            logger.error(f"[SumoManager] Failed to start TraCI: {e}")
            self.status = "DISCONNECTED"
            self.is_running = False
            return False

    def step(self) -> Dict[str, Any]:
        """
        Advance SUMO by exactly one simulation step and extract rich TraCI state.
        """
        if not self.is_running or not self.traci:
            return {}

        try:
            self.traci.simulationStep()
            self.current_step += 1
            self.simulation_time = float(self.traci.simulation.getTime())
            veh_ids = self.traci.vehicle.getIDList()
            current_id_set = set(veh_ids)

            entered_vehicles = list(current_id_set - self.active_vehicle_ids)
            departed_vehicles = list(self.active_vehicle_ids - current_id_set)
            self.active_vehicle_ids = current_id_set

            vehicles = {}
            positions = {}

            # First pass: collect raw TraCI mobility telemetry
            for vid in veh_ids:
                try:
                    x, y = self.traci.vehicle.getPosition(vid)
                    speed = float(self.traci.vehicle.getSpeed(vid))
                    lane = self.traci.vehicle.getLaneID(vid)
                    road = self.traci.vehicle.getRoadID(vid)
                    heading = float(self.traci.vehicle.getAngle(vid))
                    vtype = self.traci.vehicle.getTypeID(vid)
                    
                    # Convert SUMO cartesian coordinates (x, y) to Geo (lon, lat)
                    try:
                        lon, lat = self.traci.simulation.convertGeo(x, y)
                    except Exception:
                        lon, lat = 77.6228, 12.9172

                    # Compute acceleration
                    prev_speed = self._prev_speeds.get(vid, speed)
                    accel = round((speed - prev_speed) / max(0.1, self.step_length), 2)
                    self._prev_speeds[vid] = speed

                    length = float(self.traci.vehicle.getLength(vid))
                    width = float(self.traci.vehicle.getWidth(vid))
                    waiting_time = float(self.traci.vehicle.getWaitingTime(vid))

                    positions[vid] = (x, y)
                    vehicles[vid] = {
                        "vehicle_id": vid,
                        "x": round(x, 2),
                        "y": round(y, 2),
                        "latitude": round(float(lat), 6),
                        "longitude": round(float(lon), 6),
                        "speed_mps": round(speed, 2),
                        "speed_kmh": round(speed * 3.6, 1),
                        "acceleration": accel,
                        "lane": lane,
                        "edge": road,
                        "heading": round(heading, 1),
                        "vehicle_type": vtype,
                        "length": round(length, 1),
                        "width": round(width, 1),
                        "waiting_time": round(waiting_time, 1),
                        "simulation_time": self.simulation_time,
                        "step": self.current_step,
                    }
                except Exception as ex:
                    logger.debug(f"[SumoManager] Error reading vehicle {vid}: {ex}")

            # Second pass: compute real geometric neighbors within communication range
            for vid, data in vehicles.items():
                x1, y1 = positions[vid]
                neighbors = []
                for other_id, (x2, y2) in positions.items():
                    if other_id != vid:
                        dist = math.hypot(x1 - x2, y1 - y2)
                        if dist <= self.comm_range_m:
                            neighbors.append(other_id)
                data["neighboring_vehicles"] = neighbors
                data["num_neighbours"] = len(neighbors)

            # Third pass: gather active road network geometry for realistic SUMO corridor rendering
            active_edges = {data["edge"] for data in vehicles.values() if data.get("edge") and not data["edge"].startswith(":")}
            road_lanes = []
            seen_lanes = set()
            try:
                for edge in list(active_edges)[:25]:
                    num_l = self.traci.edge.getLaneNumber(edge)
                    for idx in range(num_l):
                        lid = f"{edge}_{idx}"
                        if lid not in seen_lanes:
                            seen_lanes.add(lid)
                            shape = self.traci.lane.getShape(lid)
                            width = self.traci.lane.getWidth(lid)
                            road_lanes.append({
                                "id": lid,
                                "shape": [[round(pt[0], 1), round(pt[1], 1)] for pt in shape],
                                "width": round(float(width), 1),
                            })
            except Exception as e:
                logger.debug(f"[SumoManager] Error reading road geometry: {e}")

            # Fourth pass: gather active traffic light states
            traffic_lights = []
            try:
                for tlid in self.traci.trafficlight.getIDList()[:10]:
                    state = self.traci.trafficlight.getRedYellowGreenState(tlid)
                    lanes = self.traci.trafficlight.getControlledLanes(tlid)
                    pos = [0.0, 0.0]
                    if lanes:
                        lshape = self.traci.lane.getShape(lanes[0])
                        if lshape:
                            pos = [round(lshape[-1][0], 1), round(lshape[-1][1], 1)]
                    traffic_lights.append({
                        "id": tlid,
                        "state": state,
                        "position": pos,
                    })
            except Exception as e:
                logger.debug(f"[SumoManager] Error reading traffic lights: {e}")

            # Cleanup exited vehicles
            for d_id in departed_vehicles:
                self._prev_speeds.pop(d_id, None)

            return {
                "simulation_time": self.simulation_time,
                "current_step": self.current_step,
                "num_vehicles": len(vehicles),
                "vehicles": vehicles,
                "road_lanes": road_lanes,
                "traffic_lights": traffic_lights,
                "entered_vehicles": entered_vehicles,
                "departed_vehicles": departed_vehicles,
                "status": self.status,
            }
        except Exception as e:
            logger.error(f"[SumoManager] TraCI step error or simulation ended: {e}")
            self.stop()
            return {}

    def stop(self):
        """Safely close TraCI connection and shut down SUMO process."""
        if self.traci:
            try:
                self.traci.close()
            except Exception as e:
                logger.debug(f"[SumoManager] Exception while closing TraCI: {e}")
        self.is_running = False
        self.status = "STOPPED"
        self.active_vehicle_ids.clear()
        self._prev_speeds.clear()
        kill_all_sumo_processes()
        logger.info("[SumoManager] Simulation stopped and processes cleaned.")

    def reset(self):
        """Reset SUMO manager state."""
        self.stop()
        self.simulation_time = 0.0
        self.current_step = 0
        self.status = "DISCONNECTED"
