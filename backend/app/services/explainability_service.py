"""
explainability_service.py
--------------------------
Generates explainability data for a given vehicle using:
  1. Attention weights from the last simulation step
  2. Vehicle wireless state features
  3. Rule-based reason generation
"""

import os
import sys
import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

_service_dir  = os.path.dirname(__file__)
_project_root = os.path.abspath(os.path.join(_service_dir, "..", "..", ".."))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from training.config import NUM_CHANNELS, APP_TYPES


def generate_explanation(
    vehicle_data: Dict[str, Any],
    channel_states: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Generate an explainability dict for a vehicle.

    Args:
        vehicle_data:  vehicle snapshot dict (from SimulationService)
        channel_states: list of channel state dicts

    Returns:
        dict with attention, feature importance, and reasons
    """
    vid     = vehicle_data.get("vehicle_id", "unknown")
    ch_idx  = int(vehicle_data.get("selected_channel", 0))
    attn    = vehicle_data.get("attention", {})
    app_type = vehicle_data.get("app_type", "normal")
    interf  = vehicle_data.get("interference", 0.5)
    pdr     = vehicle_data.get("pdr", 0.5)
    speed   = vehicle_data.get("speed_mps", 0.0)
    density = vehicle_data.get("traffic_density", 0.0)
    n_neigh = vehicle_data.get("num_neighbours", 0)
    sinr    = vehicle_data.get("sinr_db", 0.0)
    tput    = vehicle_data.get("throughput_mbps", 0.0)
    latency = vehicle_data.get("latency_ms", 0.0)

    # ── Attention importance (normalised, from model output) ──────────────
    attn_importance = {
        "Spatial":     round(attn.get("spatial", 0.25), 4),
        "Temporal":    round(attn.get("temporal", 0.25), 4),
        "Application": round(attn.get("application", 0.25), 4),
        "Frequency":   round(attn.get("frequency", 0.25), 4),
    }
    total = sum(attn_importance.values()) or 1.0
    attn_importance = {k: round(v / total, 4) for k, v in attn_importance.items()}

    # ── Feature importance (heuristic based on wireless state) ────────────
    # Weight each feature's contribution to the channel decision
    interf_importance = min(interf * 1.5, 1.0)
    avail_importance  = 1.0 - interf
    density_importance = min(density * 1.2, 1.0)
    app_priority_map  = {"safety": 1.0, "emergency": 1.0, "traffic_info": 0.6, "normal": 0.3}
    app_importance    = app_priority_map.get(app_type, 0.3)
    speed_importance  = min(speed / 30.0, 1.0)

    raw_fi = {
        "Channel Interference":  interf_importance,
        "Channel Availability":  avail_importance,
        "Vehicle Density":       density_importance,
        "Application Priority":  app_importance,
        "Vehicle Speed":         speed_importance,
    }
    fi_total = sum(raw_fi.values()) or 1.0
    feature_importance = {k: round(v / fi_total, 4) for k, v in raw_fi.items()}

    # ── Confidence (proxy: PDR * (1 - interference)) ──────────────────────
    confidence = round(float(pdr) * (1.0 - float(interf)), 4)

    # ── Channel label ─────────────────────────────────────────────────────
    channel_label = f"Channel {ch_idx + 1}"

    # ── Reason generation ─────────────────────────────────────────────────
    reasons = _generate_reasons(
        ch_idx=ch_idx,
        channel_states=channel_states,
        interf=interf,
        app_type=app_type,
        density=density,
        n_neigh=n_neigh,
        sinr=sinr,
        pdr=pdr,
        tput=tput,
        latency=latency,
        speed=speed,
    )

    return {
        "vehicle_id":          vid,
        "selected_channel":    ch_idx,
        "channel_label":       channel_label,
        "confidence":          confidence,
        "sinr_db":             round(float(sinr), 2),
        "interference":        round(float(interf), 4),
        "pdr":                 round(float(pdr), 4),
        "speed_mps":           round(float(speed), 2),
        "latency_ms":          round(float(latency), 2),
        "throughput_mbps":     round(float(tput), 2),
        "app_type":            app_type,
        "traffic_density":     round(float(density), 4),
        "num_neighbours":      int(n_neigh),
        "attention_importance": attn_importance,
        "feature_importance":  feature_importance,
        "reasons":             reasons,
    }


def _generate_reasons(
    ch_idx: int,
    channel_states: List[Dict],
    interf: float,
    app_type: str,
    density: float,
    n_neigh: int,
    sinr: float,
    pdr: float,
    tput: float,
    latency: float,
    speed: float,
) -> List[str]:
    """Generate human-readable reasons for the spectrum decision."""
    reasons = []

    # Reason 1: Interference on selected channel
    if interf < 0.3:
        reasons.append(f"Channel {ch_idx + 1} has LOW interference ({interf:.2f}), enabling reliable communication.")
    elif interf < 0.6:
        reasons.append(f"Channel {ch_idx + 1} has MODERATE interference ({interf:.2f}), acceptable for the current application.")
    else:
        reasons.append(f"Channel {ch_idx + 1} was selected despite HIGH interference ({interf:.2f}) — no better alternative available.")

    # Reason 2: Application type
    if app_type in ("safety", "emergency"):
        reasons.append(f"Application type is '{app_type}' (HIGH priority) — strict latency requirement ({latency:.1f} ms).")
    elif app_type == "traffic_info":
        reasons.append(f"Application type is 'traffic_info' (MEDIUM priority) — throughput is important.")
    else:
        reasons.append(f"Application type is 'normal' (LOW priority) — best-effort service.")

    # Reason 3: Traffic density / neighbours
    if n_neigh == 0:
        reasons.append("No neighbouring vehicles — channel contention is minimal.")
    elif n_neigh <= 3:
        reasons.append(f"{n_neigh} neighbour(s) within communication range — low contention.")
    elif n_neigh <= 8:
        reasons.append(f"{n_neigh} neighbours within range — moderate contention managed by attention mechanism.")
    else:
        reasons.append(f"HIGH density: {n_neigh} neighbours. Attention model weighted Spatial and Frequency streams more heavily.")

    # Reason 4: SINR
    if sinr > 15:
        reasons.append(f"Strong signal quality: SINR = {sinr:.1f} dB — high throughput achievable ({tput:.1f} Mbps).")
    elif sinr > 5:
        reasons.append(f"Acceptable SINR = {sinr:.1f} dB — PDR = {pdr:.2f}.")
    else:
        reasons.append(f"Weak SINR = {sinr:.1f} dB — PDR impacted ({pdr:.2f}). Consider requesting retransmission.")

    # Reason 5: Comparison to other channels
    if channel_states:
        interfs = [(cs["channel_id"], cs["interference"]) for cs in channel_states]
        best_ch, best_i = min(interfs, key=lambda x: x[1])
        if best_ch == ch_idx:
            reasons.append(f"Channel {ch_idx + 1} has the LOWEST interference among all channels.")
        else:
            reasons.append(
                f"Channel {best_ch + 1} has lower interference ({best_i:.2f}), but "
                f"Channel {ch_idx + 1} was selected for load-balancing / stability."
            )

    return reasons
