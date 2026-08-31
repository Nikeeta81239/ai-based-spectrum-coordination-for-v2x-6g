"""
evaluate.py — Evaluation and Comparison
-----------------------------------------
Evaluates:
  1. Random Allocation baseline
  2. Greedy Allocation baseline
  3. Proposed AI-DRL system

Generates:
  - results/metrics/evaluation_results.json
  - All comparison graphs in results/graphs/

Run:
    python evaluation/evaluate.py
    python evaluation/evaluate.py --scenario high
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
import json
import torch
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from environment.wireless_environment import WirelessEnvironment
from evaluation.baselines import (
    RandomAllocation, GreedyAllocation, RoundRobinAllocation,
    compute_metrics_from_states, proposed_comm_overhead
)
from agents.multi_agent import MultiAgentSystem
from training.config import (
    MOBILITY_CSV, GRAPHS_DIR, METRICS_DIR, MODEL_SAVE_DIR,
    DEFAULT_SCENARIO, TRAFFIC_SCENARIOS
)


# ─────────────────────────────────────────────────────────────────────────────
def run_baseline(env: WirelessEnvironment, allocator, label: str) -> dict:
    """Run one full simulation episode with a given allocator. Return metrics."""
    print(f"  Evaluating: {label} ...")
    states   = env.reset()
    metrics  = {k: [] for k in [
        "mean_sinr_db","mean_throughput_mbps","mean_pdr",
        "mean_latency_ms","mean_interference","spectral_efficiency"
    ]}
    done = False
    step = 0
    while not done:
        actions     = allocator.select_channels(states)
        step_m      = compute_metrics_from_states(states, actions)
        for k in metrics:
            metrics[k].append(step_m.get(k, 0))
        next_states, _, done, _ = env.step(actions)
        states = next_states
        step += 1

    return {k: float(np.mean(v)) for k, v in metrics.items()}


# ─────────────────────────────────────────────────────────────────────────────
def run_proposed(env: WirelessEnvironment, mas: MultiAgentSystem) -> dict:
    """Run one full simulation episode using the trained AI system."""
    print(f"  Evaluating: Proposed AI ...")
    states   = env.reset()
    metrics  = {k: [] for k in [
        "mean_sinr_db","mean_throughput_mbps","mean_pdr",
        "mean_latency_ms","mean_interference","spectral_efficiency"
    ]}
    done = False
    while not done:
        actions, _, _ = mas.step_actions(states, deterministic=True)
        step_m        = compute_metrics_from_states(states, actions)
        for k in metrics:
            metrics[k].append(step_m.get(k, 0))
        next_states, _, done, _ = env.step(actions)
        states = next_states

    return {k: float(np.mean(v)) for k, v in metrics.items()}


# ─────────────────────────────────────────────────────────────────────────────
def evaluate(scenario: str = DEFAULT_SCENARIO, csv_path: str = None):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    csv    = csv_path or MOBILITY_CSV
    if not os.path.exists(csv):
        print(f"[Evaluate] ERROR: {csv} not found.")
        return

    density = TRAFFIC_SCENARIOS.get(scenario, {}).get("density_factor", 1.0)

    os.makedirs(GRAPHS_DIR,  exist_ok=True)
    os.makedirs(METRICS_DIR, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"  Evaluation — Scenario: {scenario}")
    print(f"{'='*60}")

    # ── Baselines ──
    results = {}
    for label, alloc in [
        ("Random",      RandomAllocation()),
        ("Greedy",      GreedyAllocation()),
        ("Round Robin", RoundRobinAllocation()),
    ]:
        env = WirelessEnvironment(csv, scenario_density_factor=density)
        results[label] = run_baseline(env, alloc, label)

    # ── Proposed AI ──
    mas       = MultiAgentSystem(device)
    best_path = os.path.join(MODEL_SAVE_DIR, "best")
    gc_path   = os.path.join(best_path, "global_critic.pt")
    if os.path.exists(gc_path):
        mas.load_global_critic(gc_path)
        print(f"  [Evaluate] Loaded trained model from {best_path}")
    else:
        print(f"  [Evaluate] No trained model found at {best_path}. "
              f"Using untrained AI (run train.py first for real results).")

    env = WirelessEnvironment(csv, scenario_density_factor=density)
    results["Proposed AI"] = run_proposed(env, mas)

    # ── Communication Overhead ──
    n_vehicles = 21
    results["Random"]["comm_overhead"]      = 0.0
    results["Greedy"]["comm_overhead"]      = GreedyAllocation().comm_overhead(n_vehicles)
    results["Round Robin"]["comm_overhead"] = RoundRobinAllocation().comm_overhead(n_vehicles)
    results["Proposed AI"]["comm_overhead"] = proposed_comm_overhead(n_vehicles)

    # ── Print Table ──
    print(f"\n{'─'*80}")
    metrics_to_show = [
        ("mean_sinr_db",          "Mean SINR (dB)"),
        ("mean_throughput_mbps",  "Mean Throughput (Mbps)"),
        ("mean_pdr",              "Mean PDR"),
        ("mean_latency_ms",       "Mean Latency (ms)"),
        ("mean_interference",     "Mean Interference"),
        ("spectral_efficiency",   "Spectral Efficiency"),
        ("comm_overhead",         "Comm. Overhead"),
    ]
    header = f"{'Metric':<30}" + "".join(f"{k:>15}" for k in results)
    print(header)
    print("─" * 80)
    for mkey, mlabel in metrics_to_show:
        row = f"{mlabel:<30}"
        for system in results:
            val = results[system].get(mkey, 0)
            row += f"{val:>15.4f}"
        print(row)
    print(f"{'─'*80}\n")

    # ── Save results ──
    out_path = os.path.join(METRICS_DIR, f"evaluation_{scenario}.json")
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"[Evaluate] Results saved → {out_path}")

    # ── Generate Graphs ──
    _generate_comparison_graphs(results, scenario)
    return results


# ─────────────────────────────────────────────────────────────────────────────
def _generate_comparison_graphs(results: dict, scenario: str):
    """Generate bar-chart comparison graphs for all metrics."""
    systems   = list(results.keys())
    colors    = ["#E74C3C", "#F39C12", "#3498DB", "#2ECC71"]

    plots = [
        ("mean_sinr_db",         "Mean SINR (dB)",         "↑ higher is better"),
        ("mean_throughput_mbps", "Throughput (Mbps)",       "↑ higher is better"),
        ("mean_pdr",             "Packet Delivery Ratio",   "↑ higher is better"),
        ("mean_latency_ms",      "Latency (ms)",            "↓ lower is better"),
        ("mean_interference",    "Mean Interference",       "↓ lower is better"),
        ("spectral_efficiency",  "Spectral Efficiency",     "↑ higher is better"),
        ("comm_overhead",        "Communication Overhead",  "↓ lower is better"),
    ]

    n_plots = len(plots)
    fig, axes = plt.subplots(
        2, 4, figsize=(20, 9),
        facecolor="#1a1a2e"
    )
    axes = axes.flatten()

    for ax_idx, (key, title, note) in enumerate(plots):
        ax = axes[ax_idx]
        ax.set_facecolor("#16213e")
        vals = [results[s].get(key, 0) for s in systems]
        bars = ax.bar(systems, vals, color=colors[:len(systems)],
                      width=0.5, edgecolor="white", linewidth=0.5)
        ax.set_title(f"{title}\n{note}", color="white", fontsize=9, pad=6)
        ax.tick_params(colors="white", labelsize=7)
        ax.spines[:].set_color("#334")
        ax.set_facecolor("#0f3460")
        for bar, val in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.002,
                    f"{val:.3f}", ha="center", va="bottom", color="white", fontsize=7)

    # Hide unused subplot
    axes[-1].set_visible(False)

    fig.suptitle(
        f"Spectrum Allocation Performance Comparison\n"
        f"Scenario: {scenario.upper()} | 6G V2X — Bengaluru Road Network",
        color="white", fontsize=13, fontweight="bold"
    )
    plt.tight_layout()
    path = os.path.join(GRAPHS_DIR, f"comparison_{scenario}.png")
    plt.savefig(path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close()
    print(f"[Evaluate] Graph saved → {path}")


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", default=DEFAULT_SCENARIO,
                        choices=list(TRAFFIC_SCENARIOS.keys()))
    parser.add_argument("--csv", default=None)
    args = parser.parse_args()
    evaluate(scenario=args.scenario, csv_path=args.csv)
