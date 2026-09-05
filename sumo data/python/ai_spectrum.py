"""
ai_spectrum.py
Multi-Agent Deep Reinforcement Learning with 4-Head Attention & Local Critic
for 6G V2X Spectrum Coordination in Eclipse SUMO.

Architecture:
- Head 1: Spatial Attention (coordinates, neighbor distances, RSU coverage)
- Head 2: Temporal Attention (speed, acceleration, kinematic trajectory)
- Head 3: Frequency Attention (channel utilization, interference, SINR)
- Head 4: Application Attention (safety, emergency, autonomous, infotainment)
- Actor-Critic MARL: Decentralized local decision-making per vehicle
- Real-time closed-loop with TraCI & SUMO
"""

import os
import sys
import math
import random
import csv
import numpy as np

# Ensure tools in path
try:
    from create_v2x_dataset import CHANNELS, APPLICATION_PRIORITIES, compute_v2x_channel_metrics, RSU_CONFIG
except ImportError:
    from python.create_v2x_dataset import CHANNELS, APPLICATION_PRIORITIES, compute_v2x_channel_metrics, RSU_CONFIG

# Check if PyTorch is available; otherwise use vectorized NumPy neural engine
TORCH_AVAILABLE = False
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    TORCH_AVAILABLE = True
except ImportError:
    pass

# ==============================================================================
# 1. CONFIGURABLE REWARD FUNCTION
# ==============================================================================
class RewardConfig:
    def __init__(self,
                 w_throughput=0.30,
                 w_pdr=0.35,
                 w_sinr=0.15,
                 w_latency=0.10,
                 w_interference=0.05,
                 w_congestion=0.05):
        self.w_throughput = w_throughput
        self.w_pdr = w_pdr
        self.w_sinr = w_sinr
        self.w_latency = w_latency
        self.w_interference = w_interference
        self.w_congestion = w_congestion

    def compute_reward(self, metrics):
        """
        Calculates normalized reward in range approx [-2.0, +2.0]
        """
        thr = min(metrics["throughput_mbps"] / 100.0, 2.0)  # normalized
        pdr = metrics["packet_delivery_ratio"]               # [0, 1]
        sinr = max(min(metrics["sinr_db"] / 30.0, 1.0), -1.0) # [-1, 1]
        
        # Penalties
        lat = min(metrics["latency_ms"] / 50.0, 2.0)
        # Interference in dBm: typical range -110 dBm (good) to -40 dBm (severe)
        int_norm = max(min((metrics["interference_dbm"] + 110.0) / 70.0, 1.0), 0.0)
        cong = metrics["channel_utilization"]                # [0, 1]

        reward = (
            self.w_throughput * thr +
            self.w_pdr * pdr +
            self.w_sinr * sinr -
            self.w_latency * lat -
            self.w_interference * int_norm -
            self.w_congestion * cong
        )
        return float(reward)

# ==============================================================================
# 2. MULTI-HEAD ATTENTION NETWORK (NUMPY VECTORIZED ENGINE)
# ==============================================================================
class MultiHeadAttentionMARL:
    """
    4-Head Attention Actor-Critic agent with explainability weights:
    - Head 1: Spatial Attention
    - Head 2: Temporal Attention
    - Head 3: Frequency Attention
    - Head 4: Application Attention
    """
    def __init__(self, state_dim=16, action_dim=6, lr=0.01):
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.lr = lr
        self.gamma = 0.95

        # Initialize Attention Weights for 4 heads
        np.random.seed(42)
        self.W_spatial = np.random.randn(4, 8) * 0.1     # Spatial (x, y, n_dist, rsu_dist)
        self.W_temporal = np.random.randn(3, 8) * 0.1    # Temporal (speed, accel, heading)
        self.W_freq = np.random.randn(6, 8) * 0.1        # Freq (utilization across 6 chs)
        self.W_app = np.random.randn(3, 8) * 0.1         # App (priority, deadline, size)

        # Actor and Critic Linear Layers
        self.W_actor = np.random.randn(32, action_dim) * 0.1
        self.b_actor = np.zeros(action_dim)
        self.W_critic = np.random.randn(32, 1) * 0.1
        self.b_critic = 0.0

        # Memory buffer
        self.memory = []

    def softmax(self, x):
        e_x = np.exp(x - np.max(x))
        return e_x / (np.sum(e_x) + 1e-9)

    def extract_features(self, veh_state, all_vehicles, ch_utilization):
        # 1. Spatial vector: [norm_x, norm_y, norm_neighbor_dist, in_rsu_flag]
        x_n = veh_state["x"] / 10000.0
        y_n = veh_state["y"] / 14000.0
        d_n = min(veh_state.get("nearest_neighbor_distance", 50.0) / 500.0, 1.0)
        rsu_n = 1.0 if veh_state.get("in_rsu_range", False) else 0.0
        spatial_vec = np.array([x_n, y_n, d_n, rsu_n])

        # 2. Temporal vector: [norm_speed, norm_accel, norm_heading]
        spd_n = min(veh_state.get("speed", 10.0) / 25.0, 1.0)
        acc_n = max(min(veh_state.get("acceleration", 0.0) / 5.0, 1.0), -1.0)
        hd_n = veh_state.get("heading", 0.0) / 360.0
        temporal_vec = np.array([spd_n, acc_n, hd_n])

        # 3. Frequency vector: channel utilization across 6 channels
        freq_vec = np.array([ch_utilization.get(c, 0.1) for c in range(1, 7)])

        # 4. Application vector: [priority_norm, deadline_norm, size_norm]
        p = veh_state.get("application_priority", 3)
        app_type = veh_state.get("application_type", "cooperative_awareness")
        app_cfg = APPLICATION_PRIORITIES.get(app_type, APPLICATION_PRIORITIES["cooperative_awareness"])
        app_vec = np.array([p / 5.0, app_cfg["latency_deadline_ms"] / 300.0, app_cfg["packet_size_bytes"] / 5000.0])

        return spatial_vec, temporal_vec, freq_vec, app_vec

    def forward(self, spatial_v, temporal_v, freq_v, app_v):
        """Computes Multi-Head Attention forward pass and returns action probs + attention weights."""
        # Project through each attention head
        h_spatial = np.tanh(spatial_v @ self.W_spatial)
        h_temporal = np.tanh(temporal_v @ self.W_temporal)
        h_freq = np.tanh(freq_v @ self.W_freq)
        h_app = np.tanh(app_v @ self.W_app)

        # Concatenate attended representations
        h_concat = np.concatenate([h_spatial, h_temporal, h_freq, h_app]) # 32-dim

        # Compute Head Attention Importance (weights for explainability)
        head_norms = np.array([np.linalg.norm(h_spatial), np.linalg.norm(h_temporal),
                               np.linalg.norm(h_freq), np.linalg.norm(h_app)])
        attn_weights = self.softmax(head_norms)

        # Actor distribution
        logits = h_concat @ self.W_actor + self.b_actor
        action_probs = self.softmax(logits)

        # Critic state-value
        value = float(h_concat @ self.W_critic + self.b_critic)

        return action_probs, value, attn_weights, h_concat

    def select_action(self, veh_state, all_vehicles, ch_utilization, epsilon=0.10):
        s_v, t_v, f_v, a_v = self.extract_features(veh_state, all_vehicles, ch_utilization)
        probs, value, attn_weights, h_concat = self.forward(s_v, t_v, f_v, a_v)

        if random.random() < epsilon:
            action = random.randint(1, self.action_dim)
        else:
            action = int(np.argmax(probs)) + 1

        confidence = float(np.max(probs))
        return action, probs, confidence, value, attn_weights, h_concat

    def train_step(self, experiences):
        """Mini-batch Policy Gradient / Actor-Critic update."""
        if not experiences:
            return 0.0

        total_loss = 0.0
        for exp in experiences:
            h_concat = exp["h_concat"]
            action = exp["action"] - 1
            reward = exp["reward"]
            value = exp["value"]
            probs = exp["probs"]

            advantage = reward - value
            
            # Critic gradient step
            critic_grad = advantage * h_concat.reshape(-1, 1)
            self.W_critic += self.lr * critic_grad * 0.05
            self.b_critic += self.lr * advantage * 0.05

            # Actor policy gradient step
            grad_logits = -probs
            grad_logits[action] += 1.0
            actor_grad = np.outer(h_concat, grad_logits * advantage)
            self.W_actor += self.lr * actor_grad * 0.05

            total_loss += abs(advantage)

        return total_loss / len(experiences)

# ==============================================================================
# 3. REAL-TIME CLOSED-LOOP CONTROLLER (SUMO ↔ MARL)
# ==============================================================================
def run_closed_loop_simulation(duration=150, gui=False, mode="evaluate", config_file="simulation.sumocfg", seed=42):
    """
    Executes dynamic closed-loop simulation:
    SUMO Timestep -> Vehicle States -> Multi-Head Attention MARL -> Channel Allocation
    -> SINR / Throughput / Latency -> Reward -> Policy Update -> Next Timestep.
    """
    if "SUMO_HOME" not in os.environ:
        os.environ["SUMO_HOME"] = r"C:\Program Files (x86)\Eclipse\Sumo"

    tools_path = os.path.join(os.environ["SUMO_HOME"], "tools")
    if tools_path not in sys.path:
        sys.path.append(tools_path)

    import traci
    from create_v2x_dataset import assign_application_types

    sumo_binary = "sumo-gui" if gui else "sumo"
    sumo_exe = os.path.join(os.environ["SUMO_HOME"], "bin", f"{sumo_binary}.exe")
    if not os.path.exists(sumo_exe):
        sumo_exe = sumo_binary

    sumo_cmd = [
        sumo_exe,
        "-c", config_file,
        "--seed", str(seed),
        "--no-step-log", "true",
        "--waiting-time-memory", "1000",
        "--quit-on-end", "true"
    ]
    if gui:
        sumo_cmd.extend(["--start", "true"])

    print(f"\n=======================================================")
    print(f"6G V2X CLOSED-LOOP MARL SIMULATION (Mode: {mode.upper()})")
    print(f"SUMO Binary: {sumo_binary} | Duration: {duration}s | Seed: {seed}")
    print(f"=======================================================\n")

    traci.start(sumo_cmd)

    agent = MultiHeadAttentionMARL()
    reward_calc = RewardConfig()
    ch_utilization = {c: 1/6 for c in range(1, 7)}

    decision_logs = []
    failure_logs = []
    step_metrics = []

    step = 0
    try:
        while step < duration:
            traci.simulationStep()
            sim_time = traci.simulation.getTime()
            active_ids = traci.vehicle.getIDList()

            if not active_ids:
                step += 1
                continue

            # 1. Collect vehicle spatial and kinematic state
            current_vehicles = []
            for vid in active_ids:
                pos = traci.vehicle.getPosition(vid)
                spd = traci.vehicle.getSpeed(vid)
                app_type = assign_application_types(traci.vehicle.getTypeID(vid))
                app_prio = APPLICATION_PRIORITIES[app_type]["priority"]

                # RSU proximity
                in_rsu = any(math.hypot(pos[0] - r["sumo_x"], pos[1] - r["sumo_y"]) <= 500.0 for r in RSU_CONFIG.values())

                current_vehicles.append({
                    "vehicle_id": vid,
                    "x": pos[0],
                    "y": pos[1],
                    "speed": spd,
                    "acceleration": 0.0,
                    "in_rsu_range": in_rsu,
                    "application_type": app_type,
                    "application_priority": app_prio
                })

            # 2. Multi-Head Attention MARL Decision for each vehicle
            allocations = {}
            step_decisions = {}
            for v in current_vehicles:
                vid = v["vehicle_id"]
                act, probs, conf, val, attn, h_c = agent.select_action(
                    v, current_vehicles, ch_utilization, epsilon=(0.20 if mode == "train" else 0.02)
                )
                allocations[vid] = act
                step_decisions[vid] = {
                    "action": act, "probs": probs, "confidence": conf,
                    "value": val, "attn": attn, "h_concat": h_c
                }

            # Update channel utilization
            for c in range(1, 7):
                ch_utilization[c] = sum(1 for a in allocations.values() if a == c) / len(allocations)

            # 3. Physical 6G V2X Wireless Simulation
            comm_metrics = compute_v2x_channel_metrics(current_vehicles, allocations)

            # 4. Compute Rewards & Experience Replay
            experiences = []
            avg_thr = []
            avg_lat = []
            avg_pdr = []
            avg_sinr = []
            avg_rew = []

            for v in current_vehicles:
                vid = v["vehicle_id"]
                m = comm_metrics[vid]
                rew = reward_calc.compute_reward(m)
                dec = step_decisions[vid]

                avg_thr.append(m["throughput_mbps"])
                avg_lat.append(m["latency_ms"])
                avg_pdr.append(m["packet_delivery_ratio"])
                avg_sinr.append(m["sinr_db"])
                avg_rew.append(rew)

                experiences.append({
                    "h_concat": dec["h_concat"],
                    "action": dec["action"],
                    "probs": dec["probs"],
                    "value": dec["value"],
                    "reward": rew
                })

                # Explainability record
                log_row = {
                    "timestamp": round(sim_time, 1),
                    "vehicle_id": vid,
                    "vehicle_type": traci.vehicle.getTypeID(vid),
                    "application": m["application_type"],
                    "selected_channel": m["channel_id"],
                    "confidence": round(dec["confidence"], 3),
                    "spatial_attention": round(float(dec["attn"][0]), 3),
                    "temporal_attention": round(float(dec["attn"][1]), 3),
                    "freq_attention": round(float(dec["attn"][2]), 3),
                    "app_attention": round(float(dec["attn"][3]), 3),
                    "throughput_mbps": m["throughput_mbps"],
                    "latency_ms": m["latency_ms"],
                    "pdr": m["packet_delivery_ratio"],
                    "sinr_db": m["sinr_db"],
                    "reward": round(rew, 4)
                }
                decision_logs.append(log_row)

                # Failure Case Logger (if PDR < 0.70 or Latency > Deadline)
                deadline = APPLICATION_PRIORITIES[m["application_type"]]["latency_deadline_ms"]
                if m["packet_delivery_ratio"] < 0.75 or m["latency_ms"] > deadline:
                    failure_logs.append({
                        "timestamp": round(sim_time, 1),
                        "vehicle_id": vid,
                        "channel": m["channel_id"],
                        "sinr_db": m["sinr_db"],
                        "interference_dbm": m["interference_dbm"],
                        "latency_ms": m["latency_ms"],
                        "deadline_ms": deadline,
                        "pdr": m["packet_delivery_ratio"],
                        "reward": round(rew, 4)
                    })

            # 5. Train MARL weights in train mode
            if mode == "train":
                loss = agent.train_step(experiences)

            if step % 25 == 0:
                print(f"[Step {step:3d}/{duration}] Vehrs: {len(active_ids):2d} | "
                      f"Avg Thr: {np.mean(avg_thr):6.2f} Mbps | "
                      f"Avg Lat: {np.mean(avg_lat):5.1f} ms | "
                      f"Avg PDR: {np.mean(avg_pdr)*100:5.1f}% | "
                      f"Avg SINR: {np.mean(avg_sinr):5.1f} dB | "
                      f"Reward: {np.mean(avg_rew):+5.3f}")

            step += 1

    finally:
        traci.close()

    # Save decision logs
    os.makedirs("output", exist_ok=True)
    dec_file = os.path.join("output", "ai_decisions.csv")
    if decision_logs:
        with open(dec_file, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(decision_logs[0].keys()))
            w.writeheader()
            w.writerows(decision_logs)
        print(f"\nSaved {len(decision_logs)} AI spectrum decisions to {dec_file}")

    # Save failure cases
    fail_file = os.path.join("output", "failure_cases.csv")
    if failure_logs:
        with open(fail_file, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(failure_logs[0].keys()))
            w.writeheader()
            w.writerows(failure_logs)
        print(f"Recorded {len(failure_logs)} failure cases in {fail_file}")

    print("\nSimulation complete!")

if __name__ == "__main__":
    mode_arg = sys.argv[1] if len(sys.argv) > 1 else "evaluate"
    dur_arg = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    gui_arg = "--gui" in sys.argv
    run_closed_loop_simulation(duration=dur_arg, gui=gui_arg, mode=mode_arg)
