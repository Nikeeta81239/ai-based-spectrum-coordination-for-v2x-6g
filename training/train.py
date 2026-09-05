"""
train.py — Training Loop with MAPPO and Curriculum Learning
-----------------------------------------------------------
Trains the Multi-Agent Attention-DRL system using:
  - MAPPO (Multi-Agent Proximal Policy Optimization)
  - Action Masking (interference-filtered channel space)
  - Curriculum Learning: 20 -> 50 -> 100 -> 200 -> Congestion
  - Privacy-preserving Local Critic supervision

Run:
    python training/train.py
    python training/train.py --curriculum
    python training/train.py --scenario high
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
import json
import time
import torch

from environment.wireless_environment import WirelessEnvironment
from agents.multi_agent               import MultiAgentSystem
from training.curriculum              import CurriculumManager
from training.config import (
    MOBILITY_CSV, NUM_EPISODES, GAMMA, MODEL_SAVE_DIR,
    LOGS_DIR, METRICS_DIR, DEFAULT_SCENARIO, TRAFFIC_SCENARIOS,
    UPDATE_EVERY_N_STEPS
)


# ─────────────────────────────────────────────────────────────────────────────
def train(scenario: str = DEFAULT_SCENARIO, csv_path: str = None, use_curriculum: bool = False):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n{'='*65}")
    print(f"  AI-Based Spectrum Coordination — MAPPO Training Pipeline")
    print(f"  Algorithm : MAPPO (Multi-Agent PPO) + 4-Head Attention + Local Critic")
    print(f"  Masking   : Action Masking Active (Interference Threshold: 0.75)")
    print(f"  Curriculum: {'ENABLED (20 -> 50 -> 100 -> 200 -> 300)' if use_curriculum else 'OFF (' + scenario + ')'}")
    print(f"  Device    : {device}")
    print(f"{'='*65}\n")

    csv = csv_path or MOBILITY_CSV
    if not os.path.exists(csv):
        print(f"[Train] ERROR: {csv} not found.")
        return

    curriculum = CurriculumManager() if use_curriculum else None
    active_scenario = curriculum.scenario_name if use_curriculum else scenario
    density = curriculum.density_factor if use_curriculum else TRAFFIC_SCENARIOS.get(active_scenario, {}).get("density_factor", 1.0)
    max_veh = curriculum.num_vehicles if use_curriculum else TRAFFIC_SCENARIOS.get(active_scenario, {}).get("num_vehicles", 21)

    env = WirelessEnvironment(csv, scenario_density_factor=density, max_vehicles=max_veh)
    mas = MultiAgentSystem(device)

    os.makedirs(MODEL_SAVE_DIR, exist_ok=True)
    os.makedirs(LOGS_DIR,       exist_ok=True)
    os.makedirs(METRICS_DIR,    exist_ok=True)

    episode_rewards = []
    episode_metrics = []
    best_reward     = -np.inf

    episodes_to_run = sum(s["episodes"] for s in curriculum.STAGES) if use_curriculum else NUM_EPISODES

    for episode in range(1, episodes_to_run + 1):
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
            # Step actions with Action Masking
            actions, fused_reprs, attn_infos = mas.step_actions(states)

            # Step wireless environment
            next_states, rewards, done, info = env.step(actions)

            # Periodic MAPPO update
            if next_states and (step % UPDATE_EVERY_N_STEPS == 0):
                losses = mas.update(states, actions, rewards, next_states)
                if losses:
                    ep_losses["actor"].append(losses.get("actor_loss", 0))
                    ep_losses["critic"].append(losses.get("critic_loss", 0))
                    ep_losses["global_critic"].append(losses.get("global_critic_loss", 0))

            for vid, vs in states.items():
                ep_rewards.append(rewards.get(vid, 0))
                ep_sinr.append(vs.sinr_db)
                ep_tput.append(vs.throughput_mbps)
                ep_pdr.append(vs.pdr)
                ep_latency.append(vs.latency_ms)
                ch = actions.get(vid, 0)
                ep_interf.append(vs.channel_states[ch].interference)

            states = next_states
            step += 1

        mean_rw  = float(np.mean(ep_rewards)) if ep_rewards else 0.0
        mean_pdr_val = float(np.mean(ep_pdr)) if ep_pdr else 0.0
        episode_rewards.append(mean_rw)

        ep_metric = {
            "episode":         episode,
            "scenario":        curriculum.scenario_name if use_curriculum else active_scenario,
            "curriculum_stage": curriculum.stage_number if use_curriculum else 1,
            "mean_reward":     mean_rw,
            "mean_sinr_db":    float(np.mean(ep_sinr))    if ep_sinr    else 0,
            "mean_throughput": float(np.mean(ep_tput))    if ep_tput    else 0,
            "mean_pdr":        mean_pdr_val,
            "mean_latency_ms": float(np.mean(ep_latency)) if ep_latency else 0,
            "mean_interf":     float(np.mean(ep_interf))  if ep_interf  else 0,
            "actor_loss":      float(np.mean(ep_losses["actor"]))        if ep_losses["actor"]        else 0,
            "critic_loss":     float(np.mean(ep_losses["critic"]))       if ep_losses["critic"]       else 0,
            "gc_loss":         float(np.mean(ep_losses["global_critic"])) if ep_losses["global_critic"] else 0,
        }
        episode_metrics.append(ep_metric)

        # Handle Curriculum Progression
        if use_curriculum:
            advanced, msg = curriculum.record_episode(mean_pdr_val, mean_rw)
            if advanced:
                print(f"\n{'*'*60}\n  {msg}\n{'*'*60}\n")
                density = curriculum.density_factor
                max_veh = curriculum.num_vehicles
                env = WirelessEnvironment(csv, scenario_density_factor=density, max_vehicles=max_veh)

        if episode % 5 == 0 or episode == 1:
            stage_str = f" [Stage {curriculum.stage_number}: {curriculum.scenario_name}]" if use_curriculum else ""
            print(
                f"  Ep {episode:4d}/{episodes_to_run}{stage_str} | "
                f"Reward: {mean_rw:+7.3f} | "
                f"SINR: {ep_metric['mean_sinr_db']:5.1f} dB | "
                f"PDR: {ep_metric['mean_pdr']:.3f} | "
                f"Tput: {ep_metric['mean_throughput']:.1f} Mbps | "
                f"Agents: {len(mas.agents)}"
            )

        if mean_rw > best_reward:
            best_reward = mean_rw
            mas.save_all(os.path.join(MODEL_SAVE_DIR, "best"))

        if episode % 50 == 0:
            mas.save_all(os.path.join(MODEL_SAVE_DIR, f"ep{episode}"))

    with open(os.path.join(METRICS_DIR, "training_metrics.json"), "w") as f:
        json.dump(episode_metrics, f, indent=2)

    print(f"\n[Train] Training complete. Best MAPPO reward: {best_reward:.3f}")
    print(f"[Train] Metrics saved -> {METRICS_DIR}training_metrics.json")
    return episode_metrics


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", default=DEFAULT_SCENARIO,
                        choices=list(TRAFFIC_SCENARIOS.keys()))
    parser.add_argument("--curriculum", action="store_true", help="Enable Curriculum Learning (20->50->100->200->300)")
    parser.add_argument("--csv", default=None, help="Path to v2x_dataset.csv")
    args = parser.parse_args()
    train(scenario=args.scenario, csv_path=args.csv, use_curriculum=args.curriculum)
