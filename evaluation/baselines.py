"""
baselines.py — Baseline Spectrum Allocation Strategies
-------------------------------------------------------
Three strategies:

1. RandomAllocation    — random channel per vehicle per step
2. GreedyAllocation    — channel with lowest current interference
3. ProposedAI          — the trained multi-agent attention-DRL system
                         (used in evaluate.py for fair comparison)
"""

import numpy as np
import random
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from training.config import NUM_CHANNELS


# -----------------------------------------------------------------------------
class RandomAllocation:
    """
    Baseline 1: uniformly random channel selection.
    Communication overhead: HIGH (no coordination at all)
    """
    name = "Random Allocation"

    def __init__(self):
        self.comm_overhead_per_step = 0.0   # no signalling needed

    def select_channels(self, states: dict) -> dict:
        """Returns {vehicle_id -> channel_int}"""
        return {vid: random.randint(0, NUM_CHANNELS - 1) for vid in states}

    def comm_overhead(self, num_vehicles: int) -> float:
        return 0.0   # truly no coordination overhead


# -----------------------------------------------------------------------------
class GreedyAllocation:
    """
    Baseline 2: every vehicle independently picks the channel with the
    lowest current interference.

    Communication overhead: MEDIUM (vehicles broadcast interference readings)
    """
    name = "Greedy Allocation"

    def select_channels(self, states: dict) -> dict:
        actions = {}
        for vid, vs in states.items():
            interf = [ch.interference for ch in vs.channel_states]
            actions[vid] = int(np.argmin(interf))
        return actions

    def comm_overhead(self, num_vehicles: int) -> float:
        """
        Each vehicle broadcasts interference readings for all channels once.
        Overhead proportional to N * NUM_CHANNELS messages.
        Normalised to [0,1] scale.
        """
        raw = num_vehicles * NUM_CHANNELS
        return min(raw / 200.0, 1.0)


# -----------------------------------------------------------------------------
class RoundRobinAllocation:
    """
    Bonus baseline: assigns channels in a round-robin fashion.
    """
    name = "Round Robin"

    def __init__(self):
        self._counter = 0

    def select_channels(self, states: dict) -> dict:
        actions = {}
        for i, vid in enumerate(states):
            actions[vid] = (self._counter + i) % NUM_CHANNELS
        self._counter += 1
        return actions

    def comm_overhead(self, num_vehicles: int) -> float:
        return min(num_vehicles / 100.0, 0.5)


# -----------------------------------------------------------------------------
# Shared overhead model for the proposed AI system
# -----------------------------------------------------------------------------
def proposed_comm_overhead(num_vehicles: int) -> float:
    """
    AI system: vehicles only share compressed local embeddings (not full state).
    Significantly lower than greedy or continuous sharing.
    Overhead ~ N * reduced_feature_count.
    """
    # Each vehicle shares a 4-dim local summary vs NUM_CHANNELS*3 for greedy
    reduced_dim = 4
    raw = num_vehicles * reduced_dim
    return min(raw / 200.0, 1.0)


# -----------------------------------------------------------------------------
# Metrics calculation helpers (used by evaluate.py)
# -----------------------------------------------------------------------------
def compute_metrics_from_states(states: dict, actions: dict) -> dict:
    """
    Given vehicle wireless states and channel actions,
    compute aggregate performance metrics.
    """
    from environment.wireless_environment import sinr_db, throughput_mbps, pdr_from_sinr

    sinr_vals, tput_vals, pdr_vals, lat_vals, interf_vals = [], [], [], [], []

    for vid, vs in states.items():
        ch_idx = actions.get(vid, 0)
        ch     = vs.channel_states[int(ch_idx)]
        interf_vals.append(ch.interference)
        sinr_vals.append(vs.sinr_db)
        tput_vals.append(vs.throughput_mbps)
        pdr_vals.append(vs.pdr)
        lat_vals.append(vs.latency_ms)

    # Channel utilisation (Jain's Fairness Index)
    ch_counts = np.zeros(NUM_CHANNELS)
    for a in actions.values():
        ch_counts[int(a)] += 1
    n, s, s2 = len(states), ch_counts.sum(), (ch_counts**2).sum()
    fairness  = (s**2 / (NUM_CHANNELS * s2)) if s2 > 0 else 1.0

    # Spectral efficiency = mean(throughput) / (NUM_CHANNELS * BANDWIDTH_MHZ)
    from training.config import BANDWIDTH_MHZ
    spec_eff = np.mean(tput_vals) / (NUM_CHANNELS * BANDWIDTH_MHZ) if tput_vals else 0.0

    return {
        "mean_sinr_db":         float(np.mean(sinr_vals))  if sinr_vals  else 0.0,
        "mean_throughput_mbps": float(np.mean(tput_vals))  if tput_vals  else 0.0,
        "mean_pdr":             float(np.mean(pdr_vals))   if pdr_vals   else 0.0,
        "mean_latency_ms":      float(np.mean(lat_vals))   if lat_vals   else 0.0,
        "mean_interference":    float(np.mean(interf_vals))if interf_vals else 0.0,
        "spectral_efficiency":  float(spec_eff),
        "fairness_index":       float(fairness),
        "channel_distribution": ch_counts.tolist(),
    }
