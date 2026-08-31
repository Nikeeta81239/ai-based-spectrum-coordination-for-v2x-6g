"""
decision_explanation.py — Explainable AI Module
-------------------------------------------------
Every spectrum decision is explained using:
  1. Attention weight analysis (which stream mattered most?)
  2. Channel feature analysis (why was this channel chosen?)
  3. Structured natural-language explanation

Also stores all decisions to a decision log (JSON) for post-hoc analysis.
"""

import numpy as np
import json
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from training.config import NUM_CHANNELS, APP_TYPES, LOGS_DIR


# -----------------------------------------------------------------------------
class DecisionExplainer:
    """
    Given the agent's state, action, and attention weights, generates a
    human-readable explanation for the spectrum decision.

    Also writes to a persistent decision log.
    """

    STREAM_DESCRIPTIONS = {
        "spatial":      "Spatial attention (vehicle position & density)",
        "temporal":     "Temporal attention (speed & interference changes)",
        "application":  "Application attention (message type & priority)",
        "frequency":    "Frequency attention (channel availability & quality)",
    }

    def __init__(self, log_path: str = None):
        os.makedirs(LOGS_DIR, exist_ok=True)
        self.log_path = log_path or os.path.join(LOGS_DIR, "decision_log.json")
        self._log     = []

    # ------------------------------------------------------------------
    def explain(
        self,
        vehicle_id:    str,
        time_step:     float,
        obs:           np.ndarray,
        action:        int,
        reward:        float,
        attn_info:     dict,
        vs,            # VehicleWirelessState
    ) -> dict:
        """
        Generate a structured explanation for one channel selection decision.
        """
        # -- Attention stream importance --
        stream_importance = {}
        for stream, w in attn_info.items():
            if w is not None and w.size > 0:
                stream_importance[stream] = float(np.abs(w).mean())
            else:
                stream_importance[stream] = 0.0

        total = sum(stream_importance.values()) + 1e-9
        stream_pct = {k: v/total for k, v in stream_importance.items()}
        dominant   = max(stream_pct, key=stream_pct.get)

        # -- Channel state at decision time --
        ch_states = vs.channel_states
        chosen_ch = ch_states[action]
        ch_summary = [
            {
                "channel":       i,
                "interference":  ch.interference,
                "utilisation":   ch.utilisation,
                "available":     ch.available,
            }
            for i, ch in enumerate(ch_states)
        ]

        # -- Natural language reasons --
        reasons = []
        reasons.append(
            f"Channel {action} has {'low' if chosen_ch.interference < 0.3 else 'medium' if chosen_ch.interference < 0.6 else 'high'} "
            f"interference ({chosen_ch.interference:.3f})."
        )
        reasons.append(
            f"Channel utilisation is {chosen_ch.utilisation:.1%} "
            f"({'uncrowded' if chosen_ch.utilisation < 0.4 else 'moderately used' if chosen_ch.utilisation < 0.7 else 'highly congested'})."
        )
        if vs.app_type in ("safety", "emergency"):
            reasons.append(
                f"Application type is '{vs.app_type}' — high priority, "
                f"requiring a reliable low-interference channel."
            )
        if vs.num_neighbours > 5:
            reasons.append(
                f"Vehicle density is high ({vs.num_neighbours} neighbours) "
                f"— spectrum coordination is critical."
            )
        reasons.append(
            f"Dominant attention stream: {self.STREAM_DESCRIPTIONS[dominant]} "
            f"({stream_pct[dominant]:.1%} importance)."
        )

        explanation = {
            "vehicle_id":         vehicle_id,
            "time_step":          time_step,
            "selected_channel":   action,
            "reward":             reward,
            "sinr_db":            vs.sinr_db,
            "pdr":                vs.pdr,
            "throughput_mbps":    vs.throughput_mbps,
            "latency_ms":         vs.latency_ms,
            "app_type":           vs.app_type,
            "num_neighbours":     vs.num_neighbours,
            "attention_importance": stream_pct,
            "dominant_attention": dominant,
            "channel_summary":    ch_summary,
            "reasons":            reasons,
        }

        self._log.append(explanation)
        return explanation

    # ------------------------------------------------------------------
    def format_text(self, explanation: dict) -> str:
        lines = [
            f"--- Decision Explanation ---------------------------",
            f"  Vehicle    : {explanation['vehicle_id']}",
            f"  Time Step  : {explanation['time_step']} s",
            f"  Selected   : Channel {explanation['selected_channel']}",
            f"  Reward     : {explanation['reward']:+.3f}",
            f"  SINR       : {explanation['sinr_db']:.1f} dB",
            f"  PDR        : {explanation['pdr']:.3f}",
            f"  Throughput : {explanation['throughput_mbps']:.1f} Mbps",
            f"  Latency    : {explanation['latency_ms']:.1f} ms",
            f"  App Type   : {explanation['app_type']}",
            f"  Neighbours : {explanation['num_neighbours']}",
            f"",
            f"  Attention Importance:",
        ]
        for stream, pct in explanation["attention_importance"].items():
            bar = "#" * int(pct * 20)
            lines.append(f"    {stream:12s}: {bar:<20} {pct:.1%}")
        lines.append(f"")
        lines.append(f"  Reasons:")
        for i, r in enumerate(explanation["reasons"], 1):
            lines.append(f"    {i}. {r}")
        lines.append(f"-------------------------------------------------")
        return "\n".join(lines)

    # ------------------------------------------------------------------
    def save_log(self):
        with open(self.log_path, "w") as f:
            json.dump(self._log, f, indent=2)
        print(f"[XAI] Decision log saved -> {self.log_path} ({len(self._log)} entries)")

    def get_recent(self, n: int = 5) -> list:
        return self._log[-n:]


# -----------------------------------------------------------------------------
# Quick test
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    import numpy as np
    from environment.wireless_environment import WirelessEnvironment, ChannelState
    from training.config import NUM_CHANNELS, BASE_INTERFERENCE

    class _FakeVS:
        sinr_db        = 12.3
        pdr            = 0.87
        throughput_mbps= 45.0
        latency_ms     = 18.2
        app_type       = "safety"
        num_neighbours = 7
        channel_states = [ChannelState(i, BASE_INTERFERENCE[i]) for i in range(NUM_CHANNELS)]

    xai  = DecisionExplainer()
    fake_attn = {
        "spatial":     np.random.rand(1, 4, 1, 1),
        "temporal":    np.random.rand(1, 4, 1, 1),
        "application": np.random.rand(1, 4, 1, 1),
        "frequency":   np.random.rand(1, 4, 1, 1),
    }
    exp = xai.explain("veh_0", 42.0, np.zeros(20), 2, 1.35, fake_attn, _FakeVS())
    print(xai.format_text(exp))
