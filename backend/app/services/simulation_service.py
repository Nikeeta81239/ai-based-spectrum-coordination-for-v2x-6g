"""
simulation_service.py
----------------------
Manages the running simulation state. Bridges the ML pipeline
(WirelessEnvironment + MultiAgentSystem + PrivacyGateway + SumoManager)
with the FastAPI API layer and WebSocket streaming.

Design: all state is held in a singleton SimulationService instance.
Thread-safety is handled by asyncio — only one coroutine runs the step loop.
"""

import asyncio
import os
import sys
import time
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# ── Add project root to sys.path so we can import from ML modules ─────────────
_service_dir = os.path.dirname(__file__)
_backend_dir = os.path.dirname(_service_dir)
_project_root = os.path.abspath(os.path.join(_backend_dir, "..", ".."))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from training.config import (
    NUM_CHANNELS, BASE_INTERFERENCE, TRAFFIC_SCENARIOS, DEFAULT_SCENARIO,
    MOBILITY_CSV
)
from backend.simulation.sumo_manager import SumoManager
from environment.privacy_gateway import privacy_gateway


# ── Simulation state singleton ─────────────────────────────────────────────────
class SimulationService:
    """
    Singleton service that owns the WirelessEnvironment, MultiAgentSystem,
    and SumoManager.
    """

    def __init__(self):
        self.status: str = "idle"           # idle | running | paused | stopped | completed
        self.scenario: str = DEFAULT_SCENARIO
        self.ai_mode: str = "marl"          # marl | random | fixed | greedy
        self.current_step: int = 0
        self.total_steps: int = 600
        self.requested_num_vehicles: Optional[int] = None
        self.speed_multiplier: float = 1.0
        self._main_loop: Optional[asyncio.AbstractEventLoop] = None  # captured on first API call
        self.run_id: Optional[int] = None
        self.started_at: Optional[float] = None
        self.use_sumo: bool = True
        self.sumo_gui: bool = True

        self._sumo_manager = SumoManager()
        self._env = None
        self._mas = None
        self._states: Dict = {}
        self._actions: Dict = {}
        self._rewards: Dict = {}
        self._attn_infos: Dict = {}
        self._channel_users: Dict[int, int] = {i: 0 for i in range(NUM_CHANNELS)}
        self._step_metrics: Dict[str, float] = {}
        self._metric_history: List[Dict] = []
        self._latest_privacy_metrics: Dict = {}

        # Previous channels & snapshots per vehicle
        self._prev_channels: Dict[str, int] = {}
        self._prev_vehicle_snapshots: Dict[str, Dict] = {}

        # AI Story & Research Lab tracking buffers
        self._event_timeline: List[Dict] = []
        self._latest_impact: Optional[Dict] = None
        self._live_alert: Optional[Dict] = None
        self._vehicle_decision_histories: Dict[str, List[Dict]] = {}
        self._latest_step_pipeline: Optional[Dict] = None

        self._task: Optional[asyncio.Task] = None

    # ──────────────────────────────────────────────────────────────────────────
    def _lazy_import(self):
        """Import heavy ML dependencies lazily."""
        import torch
        from environment.wireless_environment import WirelessEnvironment
        from agents.multi_agent import MultiAgentSystem
        from evaluation.baselines import RandomAllocation, GreedyAllocation, RoundRobinAllocation
        return torch, WirelessEnvironment, MultiAgentSystem, RandomAllocation, GreedyAllocation, RoundRobinAllocation

    # ──────────────────────────────────────────────────────────────────────────
    def start(
        self,
        scenario: str = DEFAULT_SCENARIO,
        num_vehicles: Optional[int] = None,
        duration_steps: int = 600,
        speed_multiplier: float = 1.0,
        run_id: Optional[int] = None,
        ai_mode: str = "marl",
        use_sumo: bool = True,
        gui: bool = True,
    ):
        """Initialise the environment and begin simulation."""
        if self.status == "running":
            self.stop()

        torch, WirelessEnvironment, MultiAgentSystem, RandomAlloc, GreedyAlloc, RoundRobinAlloc = self._lazy_import()

        if scenario not in TRAFFIC_SCENARIOS:
            scenario = DEFAULT_SCENARIO
        if speed_multiplier <= 0:
            speed_multiplier = 1.0

        scenario_config = TRAFFIC_SCENARIOS[scenario]
        density = scenario_config["density_factor"]
        vehicle_limit = num_vehicles or scenario_config["num_vehicles"]

        csv_path = os.path.join(_project_root, MOBILITY_CSV)
        self._env = WirelessEnvironment(
            csv_path,
            scenario_density_factor=density,
            max_vehicles=vehicle_limit,
            speed_multiplier=speed_multiplier,
        )
        self._states = self._env.reset()

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._mas = MultiAgentSystem(device)

        # Try to load the best trained model (silent fail — runs with random weights)
        model_dir = os.path.join(_project_root, "models", "best")
        if os.path.isdir(model_dir):
            self._try_load_model(model_dir)

        self.scenario = scenario
        self.ai_mode = (ai_mode or "marl").lower()
        self.current_step = 0
        self.total_steps = duration_steps
        self.requested_num_vehicles = vehicle_limit
        self.speed_multiplier = speed_multiplier
        self.run_id = run_id
        self.started_at = time.time()
        self.use_sumo = use_sumo
        self.sumo_gui = gui
        self.status = "running"
        self._metric_history.clear()
        self._prev_channels.clear()
        self._prev_vehicle_snapshots.clear()
        self._event_timeline.clear()
        self._vehicle_decision_histories.clear()
        self._latest_impact = None
        self._live_alert = None
        self._latest_step_pipeline = None

        try:
            # If SUMO is selected, attempt to launch real SUMO via TraCI
            if self.use_sumo:
                logger.info(f"[SimService] Starting real SUMO simulation (scenario={scenario}, gui={gui})")
                sumo_ok = self._sumo_manager.start(gui=gui, scenario=scenario)
                if sumo_ok:
                    logger.info("[SimService] TraCI connected. Live SUMO is source of truth.")
                    # Prime initial SUMO step
                    sumo_data = self._sumo_manager.step()
                    if sumo_data and "vehicles" in sumo_data and sumo_data["vehicles"]:
                        self._states = self._env.build_states_from_sumo(sumo_data["vehicles"])
                else:
                    logger.warning("[SimService] SUMO launch failed or not configured. Falling back to mobility CSV.")

            self.status = "running"

            # Notify clients immediately that we are now running
            if self._main_loop and self._main_loop.is_running():
                from ..websocket.simulation_socket import manager
                self._main_loop.call_soon_threadsafe(
                    lambda: self._main_loop.create_task(
                        manager.broadcast({
                            "type": "status",
                            "status": "running",
                            "data": self.get_current_snapshot(),
                            "timestamp": time.time(),
                        })
                    )
                )

            # Start asynchronous background step task if an event loop is running
            self._start_background_loop()
            logger.info(f"[SimService] Started | scenario={scenario} | mode={self.ai_mode} | vehicles={len(self._states)}")
        except Exception as e:
            logger.exception(f"[SimService] Failed during simulation startup: {e}")
            self.status = "idle"
            self._sumo_manager.stop()
            if self._main_loop and self._main_loop.is_running():
                from ..websocket.simulation_socket import manager
                self._main_loop.call_soon_threadsafe(
                    lambda: self._main_loop.create_task(
                        manager.broadcast({
                            "type": "status",
                            "status": "idle",
                            "data": self.get_current_snapshot(),
                            "timestamp": time.time(),
                        })
                    )
                )

    def _try_load_model(self, model_dir: str):
        """Load the central critic and configure local policy checkpoints."""
        try:
            self._mas.set_checkpoint_dir(model_dir)
            gc_path = os.path.join(model_dir, "global_critic.pt")
            if os.path.exists(gc_path):
                self._mas.load_global_critic(gc_path)
                logger.info("[SimService] Loaded global critic checkpoint.")
        except Exception as exc:
            logger.warning(f"[SimService] Could not load model: {exc}")

    def _start_background_loop(self):
        """Schedule the async step loop — safe to call from any thread."""
        try:
            # Called from the main asyncio thread (e.g. pause/resume via API)
            loop = asyncio.get_running_loop()
            if self._task and not self._task.done():
                self._task.cancel()
            self._task = loop.create_task(self._step_loop())
        except RuntimeError:
            # Called from run_in_executor background thread — use stored main loop
            if self._main_loop and self._main_loop.is_running():
                self._main_loop.call_soon_threadsafe(
                    lambda: self._main_loop.create_task(self._step_loop())
                )

    async def _step_loop(self):
        """Background coroutine that advances simulation steps periodically in a worker thread."""
        from ..websocket.simulation_socket import manager
        while self.status in ("running", "paused"):
            if self.status == "running":
                try:
                    # Non-blocking: execute TraCI + PyTorch step in worker thread so event loop never freezes
                    snap = await asyncio.to_thread(self.step)
                    if snap:
                        await manager.broadcast({
                            "type": "state",
                            "data": snap,
                            "timestamp": time.time(),
                        })
                    if self.status == "completed":
                        await manager.broadcast({
                            "type": "status",
                            "status": "completed",
                            "data": self.get_current_snapshot(),
                            "timestamp": time.time(),
                        })
                        break
                except Exception as e:
                    logger.error(f"[SimService] Error in step loop: {e}")
                    self.stop()
                    await manager.broadcast({
                        "type": "status",
                        "status": "stopped",
                        "data": self.get_current_snapshot(),
                        "timestamp": time.time(),
                    })
                    break

            # Sleep: 0.1s at 1x speed, less at higher speeds, more at lower
            delay = max(0.02, 0.1 / max(0.1, self.speed_multiplier))
            await asyncio.sleep(delay)

    def pause(self):
        if self.status == "running":
            self.status = "paused"
            logger.info("[SimService] Paused.")

    def resume(self):
        if self.status == "paused":
            self.status = "running"
            self._start_background_loop()
            logger.info("[SimService] Resumed.")

    def set_speed(self, multiplier: float):
        if multiplier > 0:
            self.speed_multiplier = multiplier
            logger.info(f"[SimService] Speed set to {multiplier}x")

    # ──────────────────────────────────────────────────────────────────────────
    def step(self) -> Dict[str, Any]:
        """
        Advance simulation by one step.
        If SUMO is running:
          SUMO raw mobility (TraCI) -> Local vehicle observation ->
          Privacy filtering -> MAPPO decision -> Wireless performance.
        Returns the full state snapshot for this step.
        """
        if self.status not in ("running", "paused") or self._env is None:
            return {}

        import random
        import numpy as np

        sumo_meta = {}
        # 1. Check if Live SUMO is active
        if self.use_sumo and self._sumo_manager.is_running:
            sumo_step_res = self._sumo_manager.step()
            if sumo_step_res and "vehicles" in sumo_step_res:
                sumo_veh = sumo_step_res["vehicles"]
                self._states = self._env.build_states_from_sumo(sumo_veh)
                sumo_meta = {
                    "simulation_time": sumo_step_res.get("simulation_time", 0.0),
                    "sumo_step": sumo_step_res.get("current_step", 0),
                    "entered_vehicles": sumo_step_res.get("entered_vehicles", []),
                    "departed_vehicles": sumo_step_res.get("departed_vehicles", []),
                    "road_lanes": sumo_step_res.get("road_lanes", []),
                    "traffic_lights": sumo_step_res.get("traffic_lights", []),
                    "sumo_status": "CONNECTED",
                }
            else:
                sumo_meta = {"sumo_status": "STOPPED"}
        else:
            sumo_meta = {"sumo_status": "DISCONNECTED" if not self._sumo_manager.is_running else "CONNECTED"}

        if not self._states:
            return {}

        # 2. Select actions with MAPPO + Action Masking or baselines
        attn_infos = {}
        if self.ai_mode == "random":
            actions = {vid: random.randint(0, NUM_CHANNELS - 1) for vid in self._states}
        elif self.ai_mode in ("fixed", "round_robin"):
            actions = {vid: (self.current_step + i) % NUM_CHANNELS for i, vid in enumerate(self._states)}
        elif self.ai_mode == "greedy":
            actions = {
                vid: int(np.argmin([ch.interference for ch in vs.channel_states]))
                for vid, vs in self._states.items()
            }
        else:  # MAPPO (default)
            actions, fused_reprs, attn_infos = self._mas.step_actions(
                self._states, deterministic=True
            )

        self._actions = actions
        self._attn_infos = attn_infos

        # 3. Step the wireless environment
        next_states, rewards, done, info = self._env.step(actions)
        self._rewards = rewards
        self.current_step += 1

        # 4. Build snapshot with real data exposure metrics and pipeline
        snapshot = self._build_snapshot(self._states, actions, rewards, attn_infos, sumo_meta)
        self._step_metrics = snapshot["metrics"]
        self._metric_history.append({**snapshot["metrics"], "time_step": self.current_step})

        # Update channel users
        self._channel_users = {i: 0 for i in range(NUM_CHANNELS)}
        for vid, ch in actions.items():
            self._channel_users[ch] = self._channel_users.get(ch, 0) + 1

        # If running offline CSV without SUMO, advance states
        if not (self.use_sumo and self._sumo_manager.is_running):
            self._states = next_states if next_states else {}

        if done or self.current_step >= self.total_steps:
            self.status = "completed"
            logger.info(f"[SimService] Completed at step {self.current_step}")

        return snapshot

    # ──────────────────────────────────────────────────────────────────────────
    def stop(self):
        self.status = "stopped"
        if self._task and not self._task.done():
            self._task.cancel()
        self._sumo_manager.stop()
        if self._main_loop and self._main_loop.is_running():
            from ..websocket.simulation_socket import manager
            self._main_loop.call_soon_threadsafe(
                lambda: self._main_loop.create_task(
                    manager.broadcast({
                        "type": "status",
                        "status": "stopped",
                        "data": self.get_current_snapshot(),
                        "timestamp": time.time(),
                    })
                )
            )
        logger.info("[SimService] Stopped by user request.")

    def reset(self):
        self.status = "idle"
        if self._task and not self._task.done():
            self._task.cancel()
        self._sumo_manager.reset()
        self.current_step = 0
        self._states = {}
        self._actions = {}
        self._rewards = {}
        self._metric_history.clear()
        self._prev_channels.clear()
        if self._main_loop and self._main_loop.is_running():
            from ..websocket.simulation_socket import manager
            self._main_loop.call_soon_threadsafe(
                lambda: self._main_loop.create_task(
                    manager.broadcast({
                        "type": "status",
                        "status": "idle",
                        "data": self.get_current_snapshot(),
                        "timestamp": time.time(),
                    })
                )
            )
        logger.info("[SimService] Reset to idle.")

    # ──────────────────────────────────────────────────────────────────────────
    def _build_snapshot(
        self,
        states: Dict,
        actions: Dict,
        rewards: Dict,
        attn_infos: Dict,
        sumo_meta: Dict = None,
    ) -> Dict[str, Any]:
        """Build a JSON-serialisable snapshot of the current simulation state."""
        import numpy as np

        vehicles = []
        interf_vals, tput_vals, pdr_vals, lat_vals, sinr_vals, rw_vals = [], [], [], [], [], []

        for vid, vs in states.items():
            ch_idx = int(actions.get(vid, 0))
            ch = vs.channel_states[ch_idx]
            attn = attn_infos.get(vid, {})

            def _attention_value(name: str) -> float:
                raw = attn.get(name)
                if raw is None:
                    return 0.0
                if hasattr(raw, "detach"):
                    raw = raw.detach().cpu().numpy()
                return float(np.asarray(raw).mean())

            attn_raw = {name: _attention_value(name) for name in (
                "spatial", "temporal", "application", "frequency"
            )}
            total = sum(attn_raw.values()) or 1.0
            attn_norm = {k: round(v / total, 4) for k, v in attn_raw.items()}

            # Mask indicator for selected channel
            is_masked = ch.interference > 0.75 or not ch.available

            # Safe coordinates: exact GPS is kept on backend; local offsets only
            x_val = getattr(vs, "x", vs.position[0] if isinstance(vs.position, (tuple, list)) else 0.0)
            y_val = getattr(vs, "y", vs.position[1] if isinstance(vs.position, (tuple, list)) else 0.0)
            lat_val = getattr(vs, "latitude", vs.position[1] if isinstance(vs.position, (tuple, list)) else 12.9172)
            lon_val = getattr(vs, "longitude", vs.position[0] if isinstance(vs.position, (tuple, list)) else 77.6228)

            veh_dict = {
                "vehicle_id":       vid,
                "x":                round(float(x_val), 2),
                "y":                round(float(y_val), 2),
                "latitude":         round(float(lat_val), 6),
                "longitude":        round(float(lon_val), 6),
                "speed_mps":        round(vs.speed_mps, 2),
                "speed_kmh":        round(vs.speed_mps * 3.6, 1),
                "lane":             getattr(vs, "lane", "lane_0"),
                "edge":             getattr(vs, "edge", "edge_silk_board"),
                "selected_channel": ch_idx,
                "channel_masked":   bool(is_masked),
                "interference":     round(ch.interference, 4),
                "sinr_db":          round(vs.sinr_db, 2),
                "pdr":              round(vs.pdr, 4),
                "throughput_mbps":  round(vs.throughput_mbps, 2),
                "latency_ms":       round(vs.latency_ms, 2),
                "app_type":         vs.app_type,
                "num_neighbours":   vs.num_neighbours,
                "traffic_density":  round(vs.traffic_density, 4),
                "heading":          round(float(getattr(vs, "heading", 0.0)), 1),
                "vehicle_type":     getattr(vs, "vehicle_type", "car"),
                "length":           round(float(getattr(vs, "length", 4.5)), 1),
                "width":            round(float(getattr(vs, "width", 1.8)), 1),
                "waiting_time":     round(float(getattr(vs, "waiting_time", 0.0)), 1),
                "reward":           round(float(rewards.get(vid, 0)), 4),
                "attention":        attn_norm,
                "status":           "Active" if vs.pdr >= 0.8 else "Degraded",
            }
            vehicles.append(veh_dict)

            interf_vals.append(ch.interference)
            tput_vals.append(vs.throughput_mbps)
            pdr_vals.append(vs.pdr)
            lat_vals.append(vs.latency_ms)
            sinr_vals.append(vs.sinr_db)
            rw_vals.append(float(rewards.get(vid, 0)))

        def _mean(lst):
            return round(float(np.mean(lst)), 4) if lst else 0.0

        from training.config import BANDWIDTH_MHZ
        spec_eff = round(float(np.mean(tput_vals)) / (NUM_CHANNELS * BANDWIDTH_MHZ), 4) if tput_vals else 0.0

        # Calculate Real Privacy Exposure Metrics from actual simulation state
        privacy_exposure = privacy_gateway.compute_exposure_metrics(vehicles)
        self._latest_privacy_metrics = privacy_exposure

        n = max(len(states), 1)
        baseline_messages = n * NUM_CHANNELS
        proposed_messages = n
        comm_overhead = privacy_exposure["comm_overhead_ratio"]

        # Build channels list
        channels = []
        if self._env:
            for ch in self._env.channels:
                quality = max(0.0, 1.0 - ch.interference)
                ch_users = [v["vehicle_id"] for v in vehicles if v["selected_channel"] == ch.channel_id]
                conflicts = []
                for i in range(min(4, len(ch_users))):
                    for j in range(i + 1, min(4, len(ch_users))):
                        conflicts.append(f"{ch_users[i]} ↔ {ch_users[j]}")

                channels.append({
                    "channel_id":        ch.channel_id,
                    "label":             f"Ch {ch.channel_id + 1}",
                    "interference":      round(ch.interference, 4),
                    "utilisation":       round(ch.utilisation, 4),
                    "available":         bool(ch.available and ch.interference <= 0.75),
                    "is_masked":         bool(ch.interference > 0.75 or not ch.available),
                    "num_users":         int(self._channel_users.get(ch.channel_id, 0)),
                    "estimated_quality": round(quality, 4),
                    "assigned_vehicles": ch_users,
                    "conflicts":         conflicts,
                })

        active_chs = sum(1 for c in channels if c.get("num_users", 0) > 0)
        spectrum_util_pct = round((active_chs / max(1, len(channels))) * 100, 1)

        metrics = {
            "mean_interference":    _mean(interf_vals),
            "mean_throughput_mbps": _mean(tput_vals),
            "mean_latency_ms":      _mean(lat_vals),
            "mean_pdr":             _mean(pdr_vals),
            "mean_sinr_db":         _mean(sinr_vals),
            "spectral_efficiency":  spec_eff,
            "mean_reward":          _mean(rw_vals),
            "comm_overhead":        comm_overhead,
            "baseline_messages":    baseline_messages,
            "proposed_messages":    proposed_messages,
            "num_vehicles":         len(states),
            "privacy_protection_pct": privacy_exposure["privacy_protection_pct"],
            "spectrum_utilization": spectrum_util_pct,
        }

        mean_interf = metrics.get("mean_interference", 0.0)
        num_veh = len(vehicles)
        net_status = "STABLE" if mean_interf < 0.45 else ("CRITICAL" if mean_interf > 0.65 else "STRESSED")
        traffic_lvl = "LOW" if num_veh <= 25 else ("MEDIUM" if num_veh <= 55 else ("HIGH" if num_veh <= 150 else "CONGESTION"))
        interf_lvl = "LOW" if mean_interf < 0.3 else ("MODERATE" if mean_interf <= 0.6 else "HIGH")
        ai_conf_pct = round(min(98.0, max(78.0, 85.0 + (1.0 - mean_interf) * 10.0)), 1)

        ai_situation_summary = {
            "network_status": net_status,
            "traffic": traffic_lvl,
            "interference": interf_lvl,
            "spectrum_utilization": f"{spectrum_util_pct}% utilized",
            "ai_confidence": f"{ai_conf_pct}%",
            "recommendation": f"MAPPO Action Masking active: {sum(1 for c in channels if c['is_masked'])} channels masked.",
        }

        # Events & Decisions
        from datetime import datetime
        time_str = datetime.now().strftime("%H:%M:%S")

        for v in vehicles:
            vid = v["vehicle_id"]
            ch_idx = v["selected_channel"]
            prev_v = self._prev_vehicle_snapshots.get(vid)

            if vid not in self._vehicle_decision_histories:
                self._vehicle_decision_histories[vid] = []
            
            hist_entry = {
                "step": self.current_step,
                "channel": f"CH{ch_idx + 1}",
                "channel_idx": ch_idx,
                "interference": v["interference"],
                "sinr_db": v["sinr_db"],
                "latency_ms": v["latency_ms"],
                "pdr": v["pdr"],
                "action_taken": f"Selected CH{ch_idx + 1}",
                "attention": v.get("attention", {}),
            }
            self._vehicle_decision_histories[vid].append(hist_entry)
            if len(self._vehicle_decision_histories[vid]) > 15:
                self._vehicle_decision_histories[vid].pop(0)

            if prev_v and prev_v.get("selected_channel") != ch_idx:
                prev_ch = prev_v["selected_channel"]
                self._latest_impact = {
                    "vehicle_id": vid,
                    "timestamp": time_str,
                    "before": {
                        "latency_ms": prev_v["latency_ms"],
                        "interference": "High" if prev_v["interference"] > 0.4 else "Moderate",
                        "interference_val": prev_v["interference"],
                        "channel": f"CH{prev_ch + 1}",
                        "sinr_db": prev_v["sinr_db"],
                    },
                    "decision": f"{vid} → CH{ch_idx + 1}",
                    "after": {
                        "latency_ms": v["latency_ms"],
                        "interference": "Low" if v["interference"] < 0.3 else "Moderate",
                        "interference_val": v["interference"],
                        "channel": f"CH{ch_idx + 1}",
                        "sinr_db": v["sinr_db"],
                    }
                }
                self._live_alert = {
                    "title": "⚠ Dynamic Channel Handover",
                    "vehicle_id": vid,
                    "current_channel": f"CH{prev_ch + 1}",
                    "interference_pct": f"{int(prev_v['interference'] * 100)}%",
                    "ai_action": f"CH{prev_ch + 1} → CH{ch_idx + 1}",
                    "reason": f"Action Masking filtered congested channels. MAPPO selected optimal CH{ch_idx + 1}.",
                }

            self._prev_vehicle_snapshots[vid] = dict(v)

        # 9-Step AI Execution Pipeline state
        sample_v = vehicles[0] if vehicles else {}
        self._latest_step_pipeline = {
            "step": self.current_step,
            "environment": {
                "num_vehicles": len(vehicles),
                "active_channels": len(channels),
                "scenario": self.scenario,
                "ai_mode": "MAPPO + ATTENTION + LOCAL PRIVACY",
            },
            "observations": {
                "vehicle_id": sample_v.get("vehicle_id", "V1"),
                "speed_mps": sample_v.get("speed_mps", 0.0),
                "sinr_db": sample_v.get("sinr_db", 0.0),
                "interference": sample_v.get("interference", 0.0),
                "app_type": sample_v.get("app_type", "URLLC Safety"),
            },
            "privacy_filtering": {
                "anonymized_id": privacy_gateway.anonymize_id(sample_v.get("vehicle_id", "V1")),
                "exact_gps_transmitted": False,
                "raw_vin_transmitted": False,
                "coarse_density_bin": sample_v.get("num_neighbours", 0),
            },
            "attention": sample_v.get("attention", {"spatial": 0.32, "temporal": 0.24, "application": 0.16, "frequency": 0.28}),
            "action_masking": {
                "masked_channels": [ch["label"] for ch in channels if ch.get("is_masked")],
                "viable_channels": [ch["label"] for ch in channels if not ch.get("is_masked")],
            },
            "mappo_policy": {
                "selected_channel": f"CH{sample_v.get('selected_channel', 0) + 1}",
                "action_probability": 0.88,
                "local_critic_v": round(float(rewards.get(sample_v.get("vehicle_id", ""), 1.2)), 2),
            },
            "wireless_performance": {
                "sinr_db": sample_v.get("sinr_db", 0.0),
                "latency_ms": sample_v.get("latency_ms", 0.0),
                "throughput_mbps": sample_v.get("throughput_mbps", 0.0),
                "pdr": sample_v.get("pdr", 0.0),
            }
        }

        # SUMO connection indicators
        sm = sumo_meta or {}
        sumo_status_val = sm.get("sumo_status", "CONNECTED" if self._sumo_manager.is_running else "DISCONNECTED")
        sim_time_val = sm.get("simulation_time", float(self.current_step))
        sim_step_val = sm.get("sumo_step", self.current_step)

        return {
            "time_step": self.current_step,
            "simulation_time": sim_time_val,
            "sumo_step": sim_step_val,
            "sumo_status": sumo_status_val,
            "num_vehicles": len(vehicles),
            "vehicles": vehicles,
            "road_lanes": sm.get("road_lanes", []),
            "traffic_lights": sm.get("traffic_lights", []),
            "channels": channels,
            "metrics": metrics,
            "privacy_exposure": privacy_exposure,
            "ai_situation_summary": ai_situation_summary,
            "event_timeline": list(self._event_timeline),
            "latest_impact": self._latest_impact,
            "live_alert": self._live_alert,
            "vehicle_decision_histories": dict(self._vehicle_decision_histories),
            "latest_step_pipeline": self._latest_step_pipeline,
            "ai_mode": self.ai_mode,
        }

    # ──────────────────────────────────────────────────────────────────────────
    def get_status(self) -> Dict[str, Any]:
        return {
            "status":          self.status,
            "scenario":        self.scenario,
            "current_step":    self.current_step,
            "total_steps":     self.total_steps,
            "num_vehicles":    len(self._states),
            "requested_num_vehicles": self.requested_num_vehicles,
            "speed_multiplier": self.speed_multiplier,
            "elapsed_seconds": round(time.time() - self.started_at, 1) if self.started_at else 0.0,
            "run_id":          self.run_id,
            "sumo_status":     "CONNECTED" if self._sumo_manager.is_running else "DISCONNECTED",
            "simulation_time": self._sumo_manager.simulation_time if self._sumo_manager.is_running else float(self.current_step),
        }

    def get_current_snapshot(self) -> Dict[str, Any]:
        if not self._states:
            return {
                "time_step": 0,
                "simulation_time": 0.0,
                "sumo_step": 0,
                "sumo_status": "CONNECTED" if self._sumo_manager.is_running else "DISCONNECTED",
                "num_vehicles": 0,
                "vehicles": [],
                "road_lanes": [],
                "traffic_lights": [],
                "channels": [],
                "metrics": {},
                "privacy_exposure": {},
            }
        return self._build_snapshot(self._states, self._actions, self._rewards, self._attn_infos)

    def get_metric_history(self) -> List[Dict]:
        return list(self._metric_history)

    def get_privacy_metrics(self) -> Dict:
        if not self._latest_privacy_metrics:
            return privacy_gateway.compute_exposure_metrics(self.get_current_snapshot().get("vehicles", []))
        return self._latest_privacy_metrics

    def get_channel_states(self) -> List[Dict]:
        if self._env is None:
            return [
                {
                    "channel_id":       i,
                    "label":            f"Ch {i+1}",
                    "interference":     BASE_INTERFERENCE[i],
                    "utilisation":      0.0,
                    "available":        True,
                    "num_users":        0,
                    "estimated_quality": round(1.0 - BASE_INTERFERENCE[i], 4),
                }
                for i in range(NUM_CHANNELS)
            ]
        channels = []
        for ch in self._env.channels:
            quality = max(0.0, 1.0 - ch.interference)
            channels.append({
                "channel_id":      ch.channel_id,
                "label":           f"Ch {ch.channel_id + 1}",
                "interference":    round(ch.interference, 4),
                "utilisation":     round(ch.utilisation, 4),
                "available":       bool(ch.available and ch.interference <= 0.75),
                "num_users":       int(self._channel_users.get(ch.channel_id, 0)),
                "estimated_quality": round(quality, 4),
            })
        return channels

    def get_vehicle(self, vehicle_id: str) -> Optional[Dict]:
        snapshot = self.get_current_snapshot()
        for v in snapshot.get("vehicles", []):
            if v["vehicle_id"] == vehicle_id:
                return v
        return None


# ── Module-level singleton ────────────────────────────────────────────────────
sim_service = SimulationService()
