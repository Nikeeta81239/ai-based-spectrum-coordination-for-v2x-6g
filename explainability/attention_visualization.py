"""
attention_visualization.py — Attention Weight Visualization
-------------------------------------------------------------
Creates visual heatmaps and radar charts of the multi-stream attention weights.
Used for the Explainable AI component.
"""

import numpy as np
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from training.config import GRAPHS_DIR, NUM_CHANNELS


def plot_stream_importance(
    stream_importances: list[dict],   # list of {stream: importance} per step
    output_path: str = None,
):
    """
    Plot how each attention stream's importance evolves over time.
    stream_importances: collected at each step, e.g.
        [{"spatial":0.3, "temporal":0.25, "application":0.2, "frequency":0.25}, ...]
    """
    os.makedirs(GRAPHS_DIR, exist_ok=True)
    streams = ["spatial", "temporal", "application", "frequency"]
    colors  = ["#00d4ff", "#ff6b6b", "#ffd93d", "#6bcb77"]
    steps   = list(range(len(stream_importances)))

    fig, ax = plt.subplots(figsize=(12, 5), facecolor="#1a1a2e")
    ax.set_facecolor("#0f3460")

    for stream, col in zip(streams, colors):
        vals = [d.get(stream, 0) for d in stream_importances]
        ax.plot(steps, vals, color=col, linewidth=2, label=stream.capitalize())
        ax.fill_between(steps, vals, alpha=0.1, color=col)

    ax.set_xlabel("Simulation Step", color="white")
    ax.set_ylabel("Attention Importance", color="white")
    ax.set_title("Attention Stream Importance Over Time", color="white", fontsize=12)
    ax.legend(facecolor="#1a1a2e", labelcolor="white")
    ax.tick_params(colors="white")
    ax.spines[:].set_color("#334")
    ax.grid(alpha=0.2, color="white")

    path = output_path or os.path.join(GRAPHS_DIR, "attention_importance_over_time.png")
    plt.tight_layout()
    plt.savefig(path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close()
    print(f"[XAI] Attention importance plot -> {path}")


def plot_channel_selection_heatmap(
    vehicle_actions: list[dict],   # [{vehicle_id: channel_int}, ...] per step
    output_path: str = None,
):
    """
    Heatmap of which channel each vehicle selected across time steps.
    """
    all_vehicles = sorted(set(vid for d in vehicle_actions for vid in d))
    steps        = len(vehicle_actions)

    matrix = np.full((len(all_vehicles), steps), -1, dtype=float)
    for t, d in enumerate(vehicle_actions):
        for i, vid in enumerate(all_vehicles):
            if vid in d:
                matrix[i, t] = d[vid]

    os.makedirs(GRAPHS_DIR, exist_ok=True)
    fig, ax = plt.subplots(figsize=(14, max(4, len(all_vehicles) * 0.3)),
                           facecolor="#1a1a2e")
    ax.set_facecolor("#0f3460")
    im = ax.imshow(
        matrix, aspect="auto", cmap="viridis",
        vmin=0, vmax=NUM_CHANNELS - 1, interpolation="nearest"
    )
    cbar = plt.colorbar(im, ax=ax)
    cbar.set_label("Channel Index", color="white")
    cbar.ax.yaxis.set_tick_params(color="white")
    plt.setp(cbar.ax.get_yticklabels(), color="white")

    ax.set_xlabel("Time Step", color="white")
    ax.set_ylabel("Vehicle", color="white")
    ax.set_yticks(range(len(all_vehicles)))
    ax.set_yticklabels(all_vehicles, fontsize=6, color="white")
    ax.set_title("Channel Selection Heatmap (AI Proposed)", color="white", fontsize=11)
    ax.tick_params(colors="white")
    ax.spines[:].set_color("#334")

    path = output_path or os.path.join(GRAPHS_DIR, "channel_selection_heatmap.png")
    plt.tight_layout()
    plt.savefig(path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close()
    print(f"[XAI] Channel selection heatmap -> {path}")


def plot_radar_attention(stream_importances_mean: dict, vehicle_id: str = "fleet"):
    """
    Radar (spider) chart of average attention stream importances.
    """
    streams = list(stream_importances_mean.keys())
    values  = list(stream_importances_mean.values())
    values += values[:1]   # close the polygon

    angles  = np.linspace(0, 2 * np.pi, len(streams), endpoint=False).tolist()
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(6, 6), subplot_kw={"polar": True},
                           facecolor="#1a1a2e")
    ax.set_facecolor("#0f3460")
    ax.plot(angles, values, color="#00d4ff", linewidth=2)
    ax.fill(angles, values, color="#00d4ff", alpha=0.25)
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels([s.capitalize() for s in streams], color="white", fontsize=10)
    ax.tick_params(colors="white")
    ax.set_title(f"Attention Stream Importance — {vehicle_id}",
                 color="white", fontsize=11, pad=15)
    ax.spines["polar"].set_color("#334")

    path = os.path.join(GRAPHS_DIR, f"attention_radar_{vehicle_id}.png")
    os.makedirs(GRAPHS_DIR, exist_ok=True)
    plt.tight_layout()
    plt.savefig(path, dpi=150, bbox_inches="tight", facecolor="#1a1a2e")
    plt.close()
    print(f"[XAI] Radar chart -> {path}")


if __name__ == "__main__":
    # Quick demo
    demo_stream_data = [
        {"spatial": np.random.rand(), "temporal": np.random.rand(),
         "application": np.random.rand(), "frequency": np.random.rand()}
        for _ in range(100)
    ]
    # Normalise each step
    for d in demo_stream_data:
        total = sum(d.values())
        for k in d:
            d[k] /= total

    plot_stream_importance(demo_stream_data)

    plot_radar_attention(
        {"spatial": 0.28, "temporal": 0.22, "application": 0.20, "frequency": 0.30},
        vehicle_id="demo"
    )
    print("[XAI] Demo visualisations complete.")
