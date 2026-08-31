"""
metrics.py — Performance Metrics Helpers
-----------------------------------------
Utility functions for computing and aggregating all project metrics.
Also generates training-curve plots from saved JSON logs.
"""

import numpy as np
import json
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from training.config import GRAPHS_DIR, METRICS_DIR


# -----------------------------------------------------------------------------
def plot_training_curves(metrics_path: str = None):
    """Load training metrics JSON and generate reward + loss curves."""
    if metrics_path is None:
        metrics_path = os.path.join(METRICS_DIR, "training_metrics.json")

    if not os.path.exists(metrics_path):
        print(f"[Metrics] No training metrics found at {metrics_path}")
        return

    with open(metrics_path) as f:
        data = json.load(f)

    episodes   = [d["episode"]         for d in data]
    rewards    = [d["mean_reward"]      for d in data]
    pdr_vals   = [d["mean_pdr"]         for d in data]
    tput_vals  = [d["mean_throughput"]  for d in data]
    lat_vals   = [d["mean_latency_ms"]  for d in data]
    sinr_vals  = [d["mean_sinr_db"]     for d in data]
    interf_vals= [d["mean_interf"]      for d in data]

    def smooth(y, w=10):
        return np.convolve(y, np.ones(w)/w, mode="valid")

    fig, axes = plt.subplots(3, 2, figsize=(14, 12), facecolor="#1a1a2e")
    pairs = [
        (rewards,    "Episode Reward",          "#00d4ff", "#ffaa00"),
        (pdr_vals,   "Packet Delivery Ratio",   "#2ECC71", "#1abc9c"),
        (tput_vals,  "Throughput (Mbps)",       "#3498DB", "#2980b9"),
        (lat_vals,   "Latency (ms)",            "#E74C3C", "#c0392b"),
        (sinr_vals,  "Mean SINR (dB)",          "#9B59B6", "#8e44ad"),
        (interf_vals,"Mean Interference",       "#F39C12", "#e67e22"),
    ]

    for ax, (ydata, title, col1, col2) in zip(axes.flatten(), pairs):
        ax.set_facecolor("#0f3460")
        ax.plot(episodes, ydata, color=col1, alpha=0.35, linewidth=1, label="raw")
        sw = smooth(ydata)
        if len(sw) > 0:
            sw_eps = episodes[:len(sw)]
            ax.plot(sw_eps, sw, color=col2, linewidth=2.0, label="smoothed")
        ax.set_title(title, color="white", fontsize=10)
        ax.tick_params(colors="white")
        ax.spines[:].set_color("#334")
        ax.set_xlabel("Episode", color="#aaa", fontsize=8)
        ax.legend(fontsize=7, facecolor="#1a1a2e", labelcolor="white")
        ax.grid(alpha=0.2, color="white")

    fig.suptitle("Training Progress — AI Spectrum Coordination",
                 color="white", fontsize=13, fontweight="bold")
    plt.tight_layout()
    path = os.path.join(GRAPHS_DIR, "training_curves.png")
    os.makedirs(GRAPHS_DIR, exist_ok=True)
    plt.savefig(path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close()
    print(f"[Metrics] Training curves saved -> {path}")


# -----------------------------------------------------------------------------
def plot_channel_utilisation(channel_distributions: dict):
    """
    channel_distributions: {system_name -> list of counts per channel}
    """
    from training.config import NUM_CHANNELS
    systems = list(channel_distributions.keys())
    colors  = ["#E74C3C", "#F39C12", "#3498DB", "#2ECC71"]

    fig, axes = plt.subplots(1, len(systems), figsize=(5*len(systems), 5),
                             facecolor="#1a1a2e")
    if len(systems) == 1:
        axes = [axes]

    for ax, system, col in zip(axes, systems, colors):
        dist = channel_distributions[system]
        ax.set_facecolor("#0f3460")
        ax.bar(range(len(dist)), dist, color=col, edgecolor="white", linewidth=0.5)
        ax.set_title(system, color="white")
        ax.set_xlabel("Channel", color="#aaa")
        ax.set_ylabel("Usage count", color="#aaa")
        ax.tick_params(colors="white")
        ax.spines[:].set_color("#334")

    fig.suptitle("Channel Utilisation Distribution", color="white",
                 fontsize=13, fontweight="bold")
    plt.tight_layout()
    path = os.path.join(GRAPHS_DIR, "channel_utilisation.png")
    os.makedirs(GRAPHS_DIR, exist_ok=True)
    plt.savefig(path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close()
    print(f"[Metrics] Channel utilisation plot -> {path}")


# -----------------------------------------------------------------------------
if __name__ == "__main__":
    plot_training_curves()
