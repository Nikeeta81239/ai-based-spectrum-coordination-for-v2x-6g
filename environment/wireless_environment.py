"""
wireless_environment.py
-----------------------
Converts SUMO mobility data (v2x_dataset.csv) into a full wireless environment.

For every simulation step each vehicle gets:
  - Channel availability / interference / utilisation
  - SINR and RSSI
  - Packet delivery probability
  - Application type and priority
  - Neighbour list

This module is the "world" that the RL agents interact with.
"""

import numpy as np
import pandas as pd
import math
import random
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from training.config import (
    NUM_CHANNELS, TX_POWER_DBM, NOISE_FLOOR_DBM, PATH_LOSS_EXP,
    REFERENCE_DIST_M, BANDWIDTH_MHZ, CARRIER_FREQ_GHZ,
    BASE_INTERFERENCE, COMM_RANGE_M, APP_TYPES, APP_PRIORITY,
    APP_LATENCY_REQ_MS
)

# ─────────────────────────────────────────────────────────────────────────────
# Helper: free-space + log-distance path loss (dB)
# ─────────────────────────────────────────────────────────────────────────────
def path_loss_db(distance_m: float) -> float:
    d = max(distance_m, REFERENCE_DIST_M)
    # Friis free-space at reference + log-distance exponent
    fspl_ref = 20 * math.log10(4 * math.pi * REFERENCE_DIST_M *
                               (CARRIER_FREQ_GHZ * 1e9) / 3e8)
    pl = fspl_ref + 10 * PATH_LOSS_EXP * math.log10(d / REFERENCE_DIST_M)
    return pl

def rssi_dbm(distance_m: float) -> float:
    return TX_POWER_DBM - path_loss_db(distance_m)

def sinr_db(signal_dbm: float, interference_level: float) -> float:
    """interference_level is 0-1; maps to -85 dBm … -50 dBm aggregate"""
    interf_dbm = -85 + interference_level * 35
    noise_dbm  = NOISE_FLOOR_DBM
    # Convert dBm to linear watts, sum noise+interference
    s_lin = 10 ** ((signal_dbm  - 30) / 10)
    i_lin = 10 ** ((interf_dbm  - 30) / 10)
    n_lin = 10 ** ((noise_dbm   - 30) / 10)
    sinr  = s_lin / (i_lin + n_lin)
    return 10 * math.log10(max(sinr, 1e-12))

def pdr_from_sinr(sinr_db_val: float) -> float:
    """Sigmoid mapping: SINR → Packet Delivery Ratio [0,1]"""
    return 1.0 / (1.0 + math.exp(-0.5 * (sinr_db_val - 5)))

def throughput_mbps(sinr_db_val: float, bandwidth_mhz: float = BANDWIDTH_MHZ) -> float:
    """Shannon capacity (simplified): C = B * log2(1 + SINR_linear)"""
    sinr_lin = 10 ** (sinr_db_val / 10)
    return bandwidth_mhz * math.log2(1 + sinr_lin)

def latency_ms(distance_m: float, sinr_db_val: float) -> float:
    """
    Simple latency model:
      propagation delay + queuing / processing delay (inverse of SINR quality)
    """
    prop_ms = (distance_m / 3e8) * 1000   # propagation (tiny but correct)
    proc_ms = 2.0 + 20.0 / (1 + max(sinr_db_val, 0.1))
    return prop_ms + proc_ms


# ─────────────────────────────────────────────────────────────────────────────
# Channel State
# ─────────────────────────────────────────────────────────────────────────────
class ChannelState:
    """
    Tracks the state of one spectrum channel across all simulation steps.
    """
    def __init__(self, channel_id: int, base_interference: float):
        self.channel_id      = channel_id
        self.interference    = base_interference
        self.utilisation     = 0.0
        self.users           = 0
        self.available       = True

    def update(self, num_users: int, time_step: int):
        """Dynamically update channel state at each time step."""
        # Simulate time-varying interference (slow fading + fast fluctuation)
        slow_fade  = 0.05 * math.sin(2 * math.pi * time_step / 120)
        fast_fade  = random.gauss(0, 0.03)
        user_load  = min(num_users / 10.0, 0.5)   # up to 0.5 extra from congestion
        self.interference = float(np.clip(
            self.interference + slow_fade + fast_fade + user_load * 0.05, 0.0, 1.0
        ))
        self.users       = num_users
        self.utilisation = float(np.clip(num_users / max(NUM_CHANNELS, 1), 0.0, 1.0))
        self.available   = self.interference < 0.85

    def to_vector(self) -> np.ndarray:
        """[availability, interference, utilisation]"""
        return np.array([float(self.available), self.interference, self.utilisation],
                        dtype=np.float32)


# ─────────────────────────────────────────────────────────────────────────────
# Vehicle Wireless State
# ─────────────────────────────────────────────────────────────────────────────
class VehicleWirelessState:
    """
    Complete wireless state for one vehicle at one time step.
    """
    def __init__(self, vehicle_id: str):
        self.vehicle_id      = vehicle_id
        self.position        = (0.0, 0.0)  # (lon, lat)
        self.latitude        = 12.9172
        self.longitude       = 77.6228
        self.x               = 0.0
        self.y               = 0.0
        self.speed_mps       = 0.0
        self.neighbours      = []         # list of neighbour vehicle_ids
        self.num_neighbours  = 0
        self.traffic_density = 0.0        # normalised 0-1
        self.channel_states  = []         # list of ChannelState
        self.app_type        = "normal"
        self.app_priority    = 0.3
        self.assigned_channel = 0

        # Per-link wireless metrics (to nearest neighbour)
        self.rssi_dbm        = -80.0
        self.sinr_db         = 5.0
        self.pdr             = 0.5
        self.throughput_mbps = 10.0
        self.latency_ms      = 15.0

        # Temporal buffer (previous step values for temporal attention)
        self.prev_speed      = 0.0
        self.prev_interference = 0.0

    def get_spatial_features(self) -> np.ndarray:
        """[lon, lat, speed, num_neighbours] normalised"""
        lon_norm = (self.position[0] - 77.6) / 0.1   # approx normalise
        lat_norm = (self.position[1] - 12.9) / 0.1
        speed_norm = self.speed_mps / 30.0            # max ~108 km/h
        neigh_norm = min(self.num_neighbours / 20.0, 1.0)
        return np.array([lon_norm, lat_norm, speed_norm, neigh_norm], dtype=np.float32)

    def get_temporal_features(self) -> np.ndarray:
        curr_interf = self.channel_states[self.assigned_channel].interference \
                      if self.channel_states else 0.0
        speed_delta = (self.speed_mps - self.prev_speed) / 30.0
        interf_delta = curr_interf - self.prev_interference
        speed_norm   = self.speed_mps / 30.0
        return np.array([self.prev_speed / 30.0, speed_norm,
                         self.prev_interference, curr_interf], dtype=np.float32)

    def get_app_features(self) -> np.ndarray:
        """One-hot encode app type: [safety, emergency, traffic_info, normal]"""
        vec = np.zeros(4, dtype=np.float32)
        idx = APP_TYPES.index(self.app_type) if self.app_type in APP_TYPES else 3
        vec[idx] = 1.0
        return vec

    def get_freq_features(self) -> np.ndarray:
        """[avail, interf, util] for each channel → length = NUM_CHANNELS * 3"""
        vecs = [ch.to_vector() for ch in self.channel_states]
        return np.concatenate(vecs).astype(np.float32)

    def get_full_observation(self) -> np.ndarray:
        return np.concatenate([
            self.get_spatial_features(),
            self.get_temporal_features(),
            self.get_app_features(),
            self.get_freq_features(),
        ])


# ─────────────────────────────────────────────────────────────────────────────
# Wireless Environment (main class used by the RL agents)
# ─────────────────────────────────────────────────────────────────────────────
class WirelessEnvironment:
    """
    Loads the v2x_dataset.csv, groups by time step, and at each step builds
    the full wireless state for every vehicle.

    Usage:
        env = WirelessEnvironment("data/raw/v2x_dataset.csv")
        for step_data in env:
            # step_data is dict: {vehicle_id -> VehicleWirelessState}
    """

    def __init__(
        self,
        csv_path: str,
        scenario_density_factor: float = 1.0,
        max_vehicles: int | None = None,
        speed_multiplier: float = 1.0,
    ):
        self.csv_path = csv_path
        self.density_factor = scenario_density_factor
        self.max_vehicles = max_vehicles
        self.speed_multiplier = speed_multiplier
        self._load_data()
        self.time_steps  = sorted(self.df["time"].unique())
        self.current_idx = 0
        self.channels    = [ChannelState(i, BASE_INTERFERENCE[i])
                            for i in range(NUM_CHANNELS)]
        # Track which channel each vehicle is using (for utilisation)
        self.channel_users: dict[int, int] = {i: 0 for i in range(NUM_CHANNELS)}
        # Per-vehicle previous-step state
        self._prev_states: dict[str, VehicleWirelessState] = {}

    # ------------------------------------------------------------------
    def _load_data(self):
        raw = pd.read_csv(self.csv_path)
        raw.columns = [c.lower().strip() for c in raw.columns]

        # ── Detect format ──────────────────────────────────────────────
        if "vehicle_id" in raw.columns:
            # Already per-vehicle format
            self.df = raw
        elif "vehicle_1" in raw.columns and "vehicle_2" in raw.columns:
            # Pair format from create_v2x_dataset.py → melt into per-vehicle
            rows = []
            for _, r in raw.iterrows():
                t = float(r["time"])
                for side in ("1", "2"):
                    vid  = str(r[f"vehicle_{side}"])
                    vtyp = str(r.get(f"vehicle_{side}_type", "car"))
                    lat  = float(r.get(f"vehicle_{side}_latitude",
                                       r.get(f"vehicle_{side}_lat", 12.92)))
                    lon  = float(r.get(f"vehicle_{side}_longitude",
                                       r.get(f"vehicle_{side}_lon", 77.63)))
                    spd  = float(r.get(f"vehicle_{side}_speed", 10.0))
                    rows.append({
                        "time":         t,
                        "vehicle_id":   vid,
                        "vehicle_type": vtyp,
                        "latitude":     lat,
                        "longitude":    lon,
                        "speed_mps":    spd,
                    })
            self.df = pd.DataFrame(rows).drop_duplicates(["time","vehicle_id"])
        else:
            raise ValueError(
                f"Unrecognised CSV format. Columns found: {list(raw.columns)}"
            )

        # ── Build fast lookup: time -> list of vehicle dicts ──────────
        if self.max_vehicles is not None:
            if self.max_vehicles < 1:
                raise ValueError("max_vehicles must be at least 1")
            selected_ids = set(self.df["vehicle_id"].drop_duplicates().head(self.max_vehicles))
            self.df = self.df[self.df["vehicle_id"].isin(selected_ids)].copy()

        self._time_lookup: dict[float, list[dict]] = {}
        for _, row in self.df.iterrows():
            t   = float(row["time"])
            rec = {
                "vehicle_id":   str(row["vehicle_id"]),
                "vehicle_type": str(row.get("vehicle_type", "car")),
                "latitude":     float(row.get("latitude", 12.92)),
                "longitude":    float(row.get("longitude", 77.63)),
                "speed_mps":    float(row.get("speed_mps", 10.0)),
            }
            self._time_lookup.setdefault(t, []).append(rec)
        print(f"[WirelessEnv]  Lookup table built for {len(self._time_lookup)} time steps.")

    # ------------------------------------------------------------------
    def reset(self):
        self.current_idx = 0
        self.channels    = [ChannelState(i, BASE_INTERFERENCE[i])
                            for i in range(NUM_CHANNELS)]
        self.channel_users = {i: 0 for i in range(NUM_CHANNELS)}
        self._prev_states  = {}
        return self._build_step_state()

    # ------------------------------------------------------------------
    def step(self, actions: dict):
        """
        Advance one time step.
        actions: {vehicle_id -> channel_index (int)}

        Returns: (states, rewards, done, info)
        """
        if self.current_idx >= len(self.time_steps) - 1:
            return {}, {}, True, {}

        # Apply actions (update channel users)
        self.channel_users = {i: 0 for i in range(NUM_CHANNELS)}
        for vid, ch in actions.items():
            ch = int(np.clip(ch, 0, NUM_CHANNELS - 1))
            self.channel_users[ch] = self.channel_users.get(ch, 0) + 1

        # Update channel states with new user counts
        t = self.time_steps[self.current_idx]
        for ch in self.channels:
            ch.update(self.channel_users[ch.channel_id], int(t))

        self.current_idx += 1
        new_states = self._build_step_state()
        rewards    = self._compute_rewards(new_states, actions)
        done       = self.current_idx >= len(self.time_steps) - 1
        info       = {"time": self.time_steps[self.current_idx]
                      if not done else self.time_steps[-1]}
        return new_states, rewards, done, info

    # ------------------------------------------------------------------
    def _build_step_state(self) -> dict:
        """Build VehicleWirelessState for every vehicle at current time step."""
        t        = self.time_steps[self.current_idx]
        records  = self._time_lookup.get(t, [])   # fast O(1) lookup

        states  = {}
        all_pos = {}   # vehicle_id -> (lon, lat)

        for rec in records:
            all_pos[rec["vehicle_id"]] = (rec["longitude"], rec["latitude"])

        for rec in records:
            vid   = rec["vehicle_id"]
            vtype = rec["vehicle_type"]
            speed = rec["speed_mps"] * self.density_factor ** 0.1 * self.speed_multiplier

            vs = VehicleWirelessState(vid)
            vs.position       = all_pos[vid]
            vs.longitude      = float(all_pos[vid][0])
            vs.latitude       = float(all_pos[vid][1])
            vs.x              = float(all_pos[vid][0])
            vs.y              = float(all_pos[vid][1])
            vs.speed_mps      = speed
            vs.channel_states = list(self.channels)   # shared refs (read-only)

            # ── neighbours within COMM_RANGE_M ──
            neighbours = []
            lon1, lat1 = vs.position
            for other_id, (lon2, lat2) in all_pos.items():
                if other_id == vid:
                    continue
                dist = _haversine_m(lat1, lon1, lat2, lon2)
                if dist <= COMM_RANGE_M:
                    neighbours.append((other_id, dist))
            vs.neighbours      = [n[0] for n in neighbours]
            vs.num_neighbours  = len(neighbours)
            vs.traffic_density = min(vs.num_neighbours / 20.0, 1.0) * self.density_factor

            # ── wireless metrics to closest neighbour ──
            if neighbours:
                closest_dist = min(n[1] for n in neighbours)
                prev         = self._prev_states.get(vid)
                ch_idx       = prev.assigned_channel if prev else 0
                interf       = self.channels[ch_idx].interference
                vs.rssi_dbm        = rssi_dbm(closest_dist)
                vs.sinr_db         = sinr_db(vs.rssi_dbm, interf)
                vs.pdr             = pdr_from_sinr(vs.sinr_db)
                vs.throughput_mbps = throughput_mbps(vs.sinr_db)
                vs.latency_ms      = latency_ms(closest_dist, vs.sinr_db)
            else:
                vs.rssi_dbm        = -95.0
                vs.sinr_db         = -5.0
                vs.pdr             = 0.1
                vs.throughput_mbps = 1.0
                vs.latency_ms      = 100.0

            # ── application type ──
            vs.app_type     = _assign_app_type(vtype, t)
            vs.app_priority = APP_PRIORITY[vs.app_type]

            # ── temporal features ──
            prev = self._prev_states.get(vid)
            if prev:
                vs.prev_speed        = prev.speed_mps
                vs.prev_interference = prev.channel_states[prev.assigned_channel].interference \
                                       if prev.channel_states else 0.0
            else:
                vs.prev_speed        = speed
                vs.prev_interference = 0.1

            states[vid] = vs

        self._prev_states = dict(states)
        return states


    # ------------------------------------------------------------------
    def _compute_rewards(self, states: dict, actions: dict) -> dict:
        from training.config import REWARD_WEIGHTS, APP_LATENCY_REQ_MS
        rewards = {}
        for vid, vs in states.items():
            ch_idx = actions.get(vid, 0)
            ch     = self.channels[int(ch_idx)]

            # ── individual components ──
            spec_eff   = vs.throughput_mbps / (BANDWIDTH_MHZ * 10)   # 0-1 approx
            interference = ch.interference
            lat_req    = APP_LATENCY_REQ_MS[vs.app_type]
            lat_norm   = min(vs.latency_ms / lat_req, 3.0)           # >1 is bad
            pdr        = vs.pdr
            throughput = vs.throughput_mbps / 100.0                   # normalise
            # comm overhead proxy: how many users share this channel
            overhead   = ch.users / max(len(states), 1)
            # fairness: penalise monopolising one channel
            fair_bonus = 1.0 - ch.utilisation
            # privacy: reward for keeping channel switch rate low (local decision)
            priv_bonus = 1.0  # simplified

            r = (
                REWARD_WEIGHTS["spectral_efficiency"] * spec_eff
              + REWARD_WEIGHTS["interference"]        * interference
              + REWARD_WEIGHTS["latency"]             * (lat_norm - 1.0)
              + REWARD_WEIGHTS["packet_delivery"]     * pdr
              + REWARD_WEIGHTS["throughput"]          * throughput
              + REWARD_WEIGHTS["comm_overhead"]       * overhead
              + REWARD_WEIGHTS["fairness"]            * fair_bonus
              + REWARD_WEIGHTS["privacy"]             * priv_bonus
            )
            rewards[vid] = float(r) * vs.app_priority   # scale by app priority
        return rewards

    # ------------------------------------------------------------------
    def __iter__(self):
        return self

    def __next__(self):
        if self.current_idx >= len(self.time_steps):
            raise StopIteration
        state = self._build_step_state()
        self.current_idx += 1
        return state

    @property
    def observation_dim(self) -> int:
        return 4 + 4 + 4 + NUM_CHANNELS * 3   # spatial+temporal+app+freq

    @property
    def action_dim(self) -> int:
        return NUM_CHANNELS

    def build_states_from_sumo(self, sumo_vehicles: dict) -> dict:
        """
        Converts live TraCI SUMO vehicle telemetry into real VehicleWirelessState objects.
        Connects real SUMO mobility:
          - Spatial features: real x, y, speed, real SUMO neighbors
          - Temporal features: real speed and acceleration history
          - Channel features: real dynamic 28GHz sub-band states
          - Application features: app priority (safety/URLLC, emergency, traffic, normal)
        """
        states = {}
        t = getattr(self, "current_idx", 0)

        for vid, sdata in sumo_vehicles.items():
            speed = float(sdata.get("speed_mps", 10.0))
            x_m = float(sdata.get("x", 0.0))
            y_m = float(sdata.get("y", 0.0))
            lat = float(sdata.get("latitude", 12.9172))
            lon = float(sdata.get("longitude", 77.6228))

            vs = VehicleWirelessState(vid)
            vs.x = x_m
            vs.y = y_m
            vs.latitude = lat
            vs.longitude = lon
            vs.position = (lon, lat)  # (lon, lat) used for spatial features
            vs.speed_mps = speed
            vs.lane = sdata.get("lane", "lane_0")
            vs.edge = sdata.get("edge", "edge_silk_board")
            vs.heading = float(sdata.get("heading", 0.0))
            vs.vehicle_type = sdata.get("vehicle_type", "car")
            vs.length = float(sdata.get("length", 4.5))
            vs.width = float(sdata.get("width", 1.8))
            vs.waiting_time = float(sdata.get("waiting_time", 0.0))
            vs.channel_states = list(self.channels)

            neighbors = sdata.get("neighboring_vehicles", [])
            vs.neighbours = neighbors
            vs.num_neighbours = len(neighbors)
            vs.traffic_density = min(vs.num_neighbours / 20.0, 1.0) * getattr(self, "density_factor", 1.0)

            # Wireless link metrics to nearest real SUMO neighbor
            if neighbors:
                min_dist = COMM_RANGE_M
                x1, y1 = vs.position
                for other_id in neighbors:
                    other_sdata = sumo_vehicles.get(other_id)
                    if other_sdata:
                        x2, y2 = float(other_sdata.get("x", 0.0)), float(other_sdata.get("y", 0.0))
                        d = math.hypot(x1 - x2, y1 - y2)
                        if d < min_dist:
                            min_dist = max(REFERENCE_DIST_M, d)

                prev = self._prev_states.get(vid)
                ch_idx = prev.assigned_channel if prev else 0
                interf = self.channels[ch_idx].interference
                vs.rssi_dbm = rssi_dbm(min_dist)
                vs.sinr_db = sinr_db(vs.rssi_dbm, interf)
                vs.pdr = pdr_from_sinr(vs.sinr_db)
                vs.throughput_mbps = throughput_mbps(vs.sinr_db)
                vs.latency_ms = latency_ms(min_dist, vs.sinr_db)
            else:
                vs.rssi_dbm = -95.0
                vs.sinr_db = -5.0
                vs.pdr = 0.1
                vs.throughput_mbps = 1.0
                vs.latency_ms = 100.0

            # App type based on SUMO vehicle type
            vtype = sdata.get("vehicle_type", "car")
            vs.app_type = _assign_app_type(vtype, t)
            vs.app_priority = APP_PRIORITY[vs.app_type]

            # Temporal history from real SUMO speeds
            prev = self._prev_states.get(vid)
            if prev:
                vs.prev_speed = prev.speed_mps
                vs.prev_interference = (
                    prev.channel_states[prev.assigned_channel].interference
                    if prev.channel_states else 0.0
                )
            else:
                vs.prev_speed = speed
                vs.prev_interference = 0.1

            states[vid] = vs

        self._prev_states = dict(states)
        return states


# ─────────────────────────────────────────────────────────────────────────────
# Utility functions
# ─────────────────────────────────────────────────────────────────────────────
def _haversine_m(lat1, lon1, lat2, lon2) -> float:
    R = 6_371_000
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lon2 - lon1)
    a  = math.sin(dφ/2)**2 + math.cos(φ1)*math.cos(φ2)*math.sin(dλ/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def _assign_app_type(vehicle_type: str, time_step: float) -> str:
    """
    Assign a communication application type based on vehicle type and time.
    Buses/trucks sometimes carry safety messages; emergency is rare.
    """
    r = random.random()
    if vehicle_type in ("bus", "truck"):
        if r < 0.05:   return "emergency"
        if r < 0.30:   return "safety"
        if r < 0.60:   return "traffic_info"
        return "normal"
    elif vehicle_type == "motorcycle":
        if r < 0.03:   return "emergency"
        if r < 0.20:   return "safety"
        return "normal"
    else:  # car
        if r < 0.02:   return "emergency"
        if r < 0.25:   return "safety"
        if r < 0.50:   return "traffic_info"
        return "normal"


# ─────────────────────────────────────────────────────────────────────────────
# Quick self-test
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys, os
    csv = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "v2x_dataset.csv")
    if not os.path.exists(csv):
        print(f"[WirelessEnv] CSV not found at {csv} — copy your v2x_dataset.csv there.")
        sys.exit(1)

    env = WirelessEnvironment(csv)
    states = env.reset()
    print(f"\n[WirelessEnv] Vehicles at step 0: {len(states)}")
    for vid, vs in list(states.items())[:3]:
        print(f"  Vehicle {vid}: speed={vs.speed_mps:.1f} m/s  "
              f"neighbours={vs.num_neighbours}  "
              f"SINR={vs.sinr_db:.1f} dB  "
              f"PDR={vs.pdr:.2f}  "
              f"app={vs.app_type}")
        print(f"    obs_dim={vs.get_full_observation().shape}")
