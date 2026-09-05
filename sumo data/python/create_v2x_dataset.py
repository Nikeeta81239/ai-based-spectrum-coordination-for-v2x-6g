"""
create_v2x_dataset.py
Simulates 6G V2X communication (V2V & V2I), spectrum channels,
interference, SINR, throughput, latency, PDR, and baseline allocations.
Exports comprehensive dataset to output/v2x_dataset.csv.
"""

import os
import sys
import csv
import math
import random
import argparse

# Import corridor RSU configuration
try:
    from corridor_landmarks import RSU_CONFIG
except ImportError:
    # Default fallback RSU locations along the corridor
    RSU_CONFIG = {
        "Silk_Board": {"sumo_x": 2473.2, "sumo_y": 7760.0, "coverage_radius": 500.0},
        "Agara": {"sumo_x": 4416.8, "sumo_y": 8763.0, "coverage_radius": 500.0},
        "Iblur": {"sumo_x": 5846.0, "sumo_y": 9145.0, "coverage_radius": 500.0},
        "Bellandur": {"sumo_x": 7857.4, "sumo_y": 9292.1, "coverage_radius": 500.0},
        "Marathahalli": {"sumo_x": 9655.1, "sumo_y": 12040.2, "coverage_radius": 500.0}
    }

# 6 Spectrum Channels (Sub-6GHz, mmWave, and Sub-THz 6G)
CHANNELS = {
    1: {"name": "CH1_5.86GHz_V2V", "fc_ghz": 5.86, "bw_mhz": 10.0, "tx_power_dbm": 23.0},
    2: {"name": "CH2_5.88GHz_EMERG", "fc_ghz": 5.88, "bw_mhz": 10.0, "tx_power_dbm": 23.0},
    3: {"name": "CH3_5.90GHz_V2I", "fc_ghz": 5.90, "bw_mhz": 20.0, "tx_power_dbm": 26.0},
    4: {"name": "CH4_5.92GHz_AUTON", "fc_ghz": 5.92, "bw_mhz": 20.0, "tx_power_dbm": 26.0},
    5: {"name": "CH5_28GHz_mmWave", "fc_ghz": 28.0, "bw_mhz": 100.0, "tx_power_dbm": 30.0},
    6: {"name": "CH6_140GHz_6G_THz", "fc_ghz": 140.0, "bw_mhz": 400.0, "tx_power_dbm": 33.0}
}

APPLICATION_PRIORITIES = {
    "safety": {"priority": 1, "packet_size_bytes": 300, "latency_deadline_ms": 10.0, "weight": 0.35},
    "emergency": {"priority": 2, "packet_size_bytes": 400, "latency_deadline_ms": 20.0, "weight": 0.25},
    "cooperative_awareness": {"priority": 3, "packet_size_bytes": 500, "latency_deadline_ms": 50.0, "weight": 0.20},
    "autonomous_driving": {"priority": 4, "packet_size_bytes": 1500, "latency_deadline_ms": 100.0, "weight": 0.15},
    "infotainment": {"priority": 5, "packet_size_bytes": 5000, "latency_deadline_ms": 300.0, "weight": 0.05}
}

def calculate_path_loss(dist_m, fc_ghz, is_los=True):
    """3GPP TR 38.901 Urban Micro (UMi) Street Canyon Path Loss Model."""
    d = max(dist_m, 1.0)
    # Log-distance path loss with frequency dependence
    pl = 32.4 + 20.0 * math.log10(fc_ghz) + (21.0 if is_los else 35.3) * math.log10(d)
    shadowing = random.gauss(0, 3.0 if is_los else 6.0) # dB
    return pl + shadowing

def calculate_thermal_noise_dbm(bw_mhz, noise_figure_db=7.0):
    """Thermal noise: N0 = -174 dBm/Hz + 10log10(BW) + NF."""
    bw_hz = bw_mhz * 1e6
    noise_dbm = -174.0 + 10.0 * math.log10(bw_hz) + noise_figure_db
    return noise_dbm

def dbm_to_milliwatts(dbm):
    return 10.0 ** (dbm / 10.0)

def milliwatts_to_dbm(mw):
    return 10.0 * math.log10(max(mw, 1e-15))

def compute_v2x_channel_metrics(vehicles_at_t, channel_allocations):
    """
    Computes received power, co-channel interference, SINR,
    Shannon throughput, transmission latency, and PDR for all active vehicles at timestep t.
    """
    n_vehs = len(vehicles_at_t)
    results = {}
    channel_counts = {ch: 0 for ch in CHANNELS}

    for vid, ch in channel_allocations.items():
        channel_counts[ch] = channel_counts.get(ch, 0) + 1

    for i, v1 in enumerate(vehicles_at_t):
        vid1 = v1["vehicle_id"]
        ch = channel_allocations.get(vid1, 1)
        ch_info = CHANNELS[ch]
        app_name = v1.get("app_type", "cooperative_awareness")
        app_info = APPLICATION_PRIORITIES[app_name]

        # V2I RSU proximity check
        rsu_dists = [math.hypot(v1["x"] - r["sumo_x"], v1["y"] - r["sumo_y"]) for r in RSU_CONFIG.values()]
        min_rsu_dist = min(rsu_dists)
        in_rsu_range = min_rsu_dist <= 500.0

        # V2V neighbor calculation
        v2v_dists = []
        for j, v2 in enumerate(vehicles_at_t):
            if i != j:
                d = math.hypot(v1["x"] - v2["x"], v1["y"] - v2["y"])
                v2v_dists.append((v2["vehicle_id"], d, v2["speed"]))

        v2v_dists.sort(key=lambda x: x[1])
        neighbor_count = sum(1 for _, d, _ in v2v_dists if d <= 300.0)
        nearest_d = v2v_dists[0][1] if v2v_dists else 100.0
        avg_d = sum(d for _, d, _ in v2v_dists[:10]) / min(10, len(v2v_dists)) if v2v_dists else 100.0
        rel_spd = abs(v1["speed"] - (v2v_dists[0][2] if v2v_dists else v1["speed"]))

        # Link Distance: if in RSU range and V2I channel, use RSU distance, else V2V nearest neighbor
        link_dist = min_rsu_dist if (in_rsu_range and ch in [3, 5, 6]) else nearest_d

        # Received Signal Power
        pl = calculate_path_loss(link_dist, ch_info["fc_ghz"], is_los=(link_dist < 150.0))
        rx_power_dbm = ch_info["tx_power_dbm"] - pl
        rx_power_mw = dbm_to_milliwatts(rx_power_dbm)

        # Co-Channel Interference from all other vehicles sharing channel `ch`
        interference_mw = 0.0
        for j, v2 in enumerate(vehicles_at_t):
            if i != j and channel_allocations.get(v2["vehicle_id"]) == ch:
                d_int = max(math.hypot(v1["x"] - v2["x"], v1["y"] - v2["y"]), 1.0)
                pl_int = calculate_path_loss(d_int, ch_info["fc_ghz"], is_los=(d_int < 100.0))
                int_rx_dbm = ch_info["tx_power_dbm"] - pl_int
                interference_mw += dbm_to_milliwatts(int_rx_dbm)

        noise_dbm = calculate_thermal_noise_dbm(ch_info["bw_mhz"])
        noise_mw = dbm_to_milliwatts(noise_dbm)

        # SINR
        sinr_linear = rx_power_mw / (noise_mw + interference_mw)
        sinr_db = 10.0 * math.log10(max(sinr_linear, 1e-6))

        # Shannon Capacity (Throughput in Mbps)
        bw_hz = ch_info["bw_mhz"] * 1e6
        throughput_mbps = (bw_hz * math.log2(1.0 + max(sinr_linear, 1e-4))) / 1e6

        # Channel Utilization ratio (vehicles per channel / total vehicles)
        ch_utilization = channel_counts[ch] / max(n_vehs, 1)

        # Queuing & Transmission Latency (ms)
        packet_bits = app_info["packet_size_bytes"] * 8
        trans_latency_ms = (packet_bits / (throughput_mbps * 1e6)) * 1000.0
        queuing_latency_ms = (ch_utilization ** 2) * 15.0  # exponential queuing delay with congestion
        total_latency_ms = trans_latency_ms + queuing_latency_ms + (link_dist / 3e5) # prop delay

        # Packet Delivery Ratio (PDR) via Sigmoid on SINR (dB)
        # Threshold beta=0 dB for basic MCS, steepness alpha=0.35
        pdr = 1.0 / (1.0 + math.exp(-0.35 * (sinr_db - 2.0)))
        # Degrade PDR if latency exceeds application deadline
        if total_latency_ms > app_info["latency_deadline_ms"]:
            pdr *= max(0.2, app_info["latency_deadline_ms"] / total_latency_ms)

        results[vid1] = {
            "channel_id": ch,
            "channel_name": ch_info["name"],
            "channel_utilization": round(ch_utilization, 3),
            "link_distance": round(link_dist, 2),
            "in_rsu_range": in_rsu_range,
            "neighbor_count": neighbor_count,
            "nearest_neighbor_distance": round(nearest_d, 2),
            "average_neighbor_distance": round(avg_d, 2),
            "relative_speed": round(rel_spd, 2),
            "interference_dbm": round(milliwatts_to_dbm(interference_mw), 2),
            "sinr_db": round(sinr_db, 2),
            "throughput_mbps": round(throughput_mbps, 3),
            "latency_ms": round(total_latency_ms, 2),
            "packet_delivery_ratio": round(pdr, 4),
            "application_priority": app_info["priority"],
            "application_type": app_name
        }

    return results

def assign_application_types(vtype):
    """Assign realistic V2X application types based on vehicle category."""
    if vtype == "emergency":
        return "emergency"
    elif vtype in ["bus", "truck"]:
        return random.choices(["cooperative_awareness", "safety", "infotainment"], weights=[0.5, 0.3, 0.2])[0]
    elif vtype == "motorcycle":
        return random.choices(["cooperative_awareness", "safety"], weights=[0.7, 0.3])[0]
    else:  # passenger car
        return random.choices(
            ["safety", "cooperative_awareness", "autonomous_driving", "infotainment"],
            weights=[0.30, 0.35, 0.20, 0.15]
        )[0]

def create_dataset_from_mobility(mobility_csv="output/vehicle_data.csv", output_v2x="output/v2x_dataset.csv", policy="greedy"):
    """
    Processes mobility data through the 6G V2X communication model
    using the specified allocation policy and generates output/v2x_dataset.csv.
    """
    if not os.path.exists(mobility_csv):
        print(f"Mobility file {mobility_csv} does not exist. Run collect_data.py first.")
        return False

    print(f"Loading mobility data from {mobility_csv}...")
    # Group rows by timestamp
    timesteps = {}
    with open(mobility_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            t = float(row["timestamp"])
            row["x"] = float(row["x"])
            row["y"] = float(row["y"])
            row["speed"] = float(row["speed"])
            row["acceleration"] = float(row["acceleration"])
            row["app_type"] = assign_application_types(row["vehicle_type"])
            if t not in timesteps:
                timesteps[t] = []
            timesteps[t].append(row)

    print(f"Found {len(timesteps)} timesteps. Simulating 6G V2X spectrum allocation (Policy: {policy.upper()})...")

    dataset_rows = []
    round_robin_idx = 0

    for t in sorted(timesteps.keys()):
        vehs = timesteps[t]
        allocations = {}

        # Apply spectrum allocation policy
        if policy == "random":
            for v in vehs:
                allocations[v["vehicle_id"]] = random.randint(1, 6)
        elif policy == "fixed":
            for i, v in enumerate(vehs):
                allocations[v["vehicle_id"]] = (i % 6) + 1
        elif policy == "round_robin":
            for v in vehs:
                allocations[v["vehicle_id"]] = (round_robin_idx % 6) + 1
                round_robin_idx += 1
        elif policy == "greedy":
            # Priority & least-utilized channel assignment
            ch_load = {c: 0 for c in range(1, 7)}
            # Sort critical apps first
            sorted_v = sorted(vehs, key=lambda x: APPLICATION_PRIORITIES[x["app_type"]]["priority"])
            for v in sorted_v:
                vid = v["vehicle_id"]
                p = APPLICATION_PRIORITIES[v["app_type"]]["priority"]
                if p in [1, 2]: # Safety / Emergency -> high reliability sub-6GHz
                    best_ch = min([1, 2, 3], key=lambda c: ch_load[c])
                elif p == 4:   # Autonomous driving -> high bandwidth mmWave / THz
                    best_ch = min([4, 5, 6], key=lambda c: ch_load[c])
                else:          # Cooperative / Infotainment -> least loaded channel
                    best_ch = min(range(1, 7), key=lambda c: ch_load[c])
                allocations[vid] = best_ch
                ch_load[best_ch] += 1
        else:
            for v in vehs:
                allocations[v["vehicle_id"]] = 1

        # Compute physics-based V2X communication metrics
        comm_metrics = compute_v2x_channel_metrics(vehs, allocations)

        for v in vehs:
            vid = v["vehicle_id"]
            cm = comm_metrics[vid]
            combined = {
                "timestamp": v["timestamp"],
                "vehicle_id": vid,
                "vehicle_type": v["vehicle_type"],
                "x": v["x"],
                "y": v["y"],
                "speed": v["speed"],
                "acceleration": v["acceleration"],
                "lane": v["lane"],
                "road": v["road"],
                "network_vehicle_count": v.get("network_vehicle_count", len(vehs)),
                "neighbor_count": cm["neighbor_count"],
                "neighbor_distance": cm["nearest_neighbor_distance"],
                "relative_speed": cm["relative_speed"],
                "in_rsu_range": int(cm["in_rsu_range"]),
                "application_type": cm["application_type"],
                "application_priority": cm["application_priority"],
                "channel_id": cm["channel_id"],
                "channel_name": cm["channel_name"],
                "channel_utilization": cm["channel_utilization"],
                "interference_dbm": cm["interference_dbm"],
                "sinr_db": cm["sinr_db"],
                "throughput_mbps": cm["throughput_mbps"],
                "latency_ms": cm["latency_ms"],
                "packet_delivery_ratio": cm["packet_delivery_ratio"]
            }
            dataset_rows.append(combined)

    # Save to output CSV
    fieldnames = list(dataset_rows[0].keys())
    os.makedirs(os.path.dirname(output_v2x), exist_ok=True)
    with open(output_v2x, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(dataset_rows)

    print(f"Generated {len(dataset_rows)} V2X records in {output_v2x}")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create 6G V2X communication dataset.")
    parser.add_argument("--input", default="output/vehicle_data.csv", help="Input mobility CSV")
    parser.add_argument("--output", default="output/v2x_dataset.csv", help="Output V2X CSV")
    parser.add_argument("--policy", default="greedy", choices=["random", "fixed", "round_robin", "greedy"])
    args = parser.parse_args()

    create_dataset_from_mobility(args.input, args.output, args.policy)
