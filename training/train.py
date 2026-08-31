"""
train.py — Training Loop
--------------------------
Trains the Multi-Agent Attention-DRL system.

Pipeline per episode:
  1. Reset WirelessEnvironment
  2. For each time step:
       a. Get states from environment
       b. Collect actions from all agents (via MultiAgentSystem)
       c. Step the environment → next_states, rewards
       d. Update Global Critic + all Actor/LocalCritic networks
       e. Log metrics
  3. Save model checkpoints

Run:
    python training/train.py
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
import json
import time
import torch

from environment.wireless_environment import WirelessEnvironment
from agents.multi_agent               import MultiAgentSystem
from training.config import (
    MOBILITY_CSV, NUM_EPISODES, GAMMA, MODEL_SAVE_DIR,
    LOGS_DIR, METRICS_DIR, DEFAULT_SCENARIO, TRAFFIC_SCENARIOS,
    UPDATE_EVERY_N_STEPS
)

# ─────────────────────────────────────────────────────────────────────────────
def train(scenario: str = DEFAULT_SCENARIO, csv_path: str = None):
    # ── Setup ──
    device     = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n{'='*60}")
    print(f"  AI-Based Spectrum Coordination — Training")
    print(f"  Device  : {device}")
    print(f"  Scenario: {scenario}")
    print(f"{'='*60}\n")

    csv = csv_path or MOBILITY_CSV
    if not os.path.exists(csv):
        print(f"[Train] ERROR: {csv} not found.")
        print("  Copy your v2x_dataset.csv to data/raw/v2x_dataset.csv")
        return

    density = TRAFFIC_SCENARIOS.get(scenario, {}).get("density_factor", 1.0)
    env     = WirelessEnvironment(csv, scenario_density_factor=density)
    mas     = MultiAgentSystem(device)

    os.makedirs(MODEL_SAVE_DIR, exist_ok=True)
    os.makedirs(LOGS_DIR,       exist_ok=True)
    os.makedirs(METRICS_DIR,    exist_ok=True)

    # ── Training Loop ──
    episode_rewards   = []
    episode_metrics   = []
    best_reward       = -np.inf

    for episode in range(1, NUM_EPISODES + 1):
        states     = env.reset()
        ep_rewards = []
        ep_losses  = {"actor": [], "critic": [], "global_critic": []}
        ep_sinr    = []
        ep_tput    = []
        ep_pdr     = []
        ep_latency = []
        ep_interf  = []

        done = False
        step = 0

        while not done:
            # ── Agent step ──
            actions, fused_reprs, attn_infos = mas.step_actions(states)

            # ── Environment step ──
            next_states, rewards, done, info = env.step(actions)

            # ── Update networks (every N steps for speed) ──
            if next_states and (step % UPDATE_EVERY_N_STEPS == 0):
                losses = mas.update(states, actions, rewards, next_states)
                if losses:
                    ep_losses["actor"].append(losses.get("actor_loss", 0))
                    ep_losses["critic"].append(losses.get("critic_loss", 0))
                    ep_losses["global_critic"].append(losses.get("global_critic_loss", 0))

            # ── Collect step metrics ──
            for vid, vs in states.items():
                ep_rewards.append(rewards.get(vid, 0))
                ep_sinr.append(vs.sinr_db)
                ep_tput.append(vs.throughput_mbps)
                ep_pdr.append(vs.pdr)
                ep_latency.append(vs.latency_ms)
                ch = actions.get(vid, 0)
                ep_interf.append(vs.channel_states[ch].interference)

            states = next_states
            step  += 1


        # ── Episode Summary ──
        mean_rw  = float(np.mean(ep_rewards)) if ep_rewards else 0.0
        episode_rewards.append(mean_rw)

        ep_metric = {
            "episode":         episode,
            "mean_reward":     mean_rw,
            "mean_sinr_db":    float(np.mean(ep_sinr))    if ep_sinr    else 0,
            "mean_throughput": float(np.mean(ep_tput))    if ep_tput    else 0,
            "mean_pdr":        float(np.mean(ep_pdr))     if ep_pdr     else 0,
            "mean_latency_ms": float(np.mean(ep_latency)) if ep_latency else 0,
            "mean_interf":     float(np.mean(ep_interf))  if ep_interf  else 0,
            "actor_loss":      float(np.mean(ep_losses["actor"]))        if ep_losses["actor"]        else 0,
            "critic_loss":     float(np.mean(ep_losses["critic"]))       if ep_losses["critic"]       else 0,
            "gc_loss":         float(np.mean(ep_losses["global_critic"])) if ep_losses["global_critic"] else 0,
        }
        episode_metrics.append(ep_metric)

        # ── Print progress ──
        if episode % 10 == 0 or episode == 1:
            print(
                f"  Ep {episode:4d}/{NUM_EPISODES} | "
                f"Reward: {mean_rw:+7.3f} | "
                f"SINR: {ep_metric['mean_sinr_db']:5.1f} dB | "
                f"PDR: {ep_metric['mean_pdr']:.3f} | "
                f"Tput: {ep_metric['mean_throughput']:.1f} Mbps | "
                f"Agents: {len(mas.agents)}"
            )

        # ── Save best model ──
        if mean_rw > best_reward:
            best_reward = mean_rw
            mas.save_all(os.path.join(MODEL_SAVE_DIR, "best"))

        # ── Periodic checkpoint ──
        if episode % 100 == 0:
            mas.save_all(os.path.join(MODEL_SAVE_DIR, f"ep{episode}"))

    # ── Save logs ──
    with open(os.path.join(METRICS_DIR, "training_metrics.json"), "w") as f:
        json.dump(episode_metrics, f, indent=2)

    print(f"\n[Train] Training complete. Best reward: {best_reward:.3f}")
    print(f"[Train] Metrics saved → {METRICS_DIR}training_metrics.json")
    return episode_metrics


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", default=DEFAULT_SCENARIO,
                        choices=list(TRAFFIC_SCENARIOS.keys()))
    parser.add_argument("--csv", default=None, help="Path to v2x_dataset.csv")
    args = parser.parse_args()
    train(scenario=args.scenario, csv_path=args.csv)
