"""
collect_data.py
Extracts comprehensive vehicle kinematics and dynamic traffic metrics
via TraCI from SUMO simulation and exports to output/vehicle_data.csv.
"""

import os
import sys
import csv
import math
import argparse

# Setup SUMO_HOME
if "SUMO_HOME" not in os.environ:
    os.environ["SUMO_HOME"] = r"C:\Program Files (x86)\Eclipse\Sumo"

tools_path = os.path.join(os.environ["SUMO_HOME"], "tools")
if tools_path not in sys.path:
    sys.path.append(tools_path)

import traci

OUTPUT_DIR = "output"
OUTPUT_CSV = os.path.join(OUTPUT_DIR, "vehicle_data.csv")

def collect_mobility_data(duration=200, gui=False, config_file="simulation.sumocfg", seed=42):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
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

    print(f"Starting SUMO ({sumo_binary}) for data collection ({duration} steps)...")
    traci.start(sumo_cmd)

    prev_speeds = {}
    records = []

    fieldnames = [
        "timestamp",
        "vehicle_id",
        "vehicle_type",
        "x",
        "y",
        "speed",
        "acceleration",
        "lane",
        "road",
        "heading",
        "distance",
        "waiting_time",
        "network_vehicle_count",
        "network_avg_speed",
        "network_avg_waiting_time",
        "edge_vehicle_count",
        "edge_queue_length"
    ]

    step = 0
    try:
        while step < duration:
            traci.simulationStep()
            sim_time = traci.simulation.getTime()
            active_vehs = traci.vehicle.getIDList()
            n_vehs = len(active_vehs)

            # Calculate network-level aggregates
            net_speeds = []
            net_waiting = []
            edge_vehs = {}
            edge_queues = {}

            for vid in active_vehs:
                spd = traci.vehicle.getSpeed(vid)
                wt = traci.vehicle.getWaitingTime(vid)
                edge_id = traci.vehicle.getRoadID(vid)
                net_speeds.append(spd)
                net_waiting.append(wt)

                edge_vehs[edge_id] = edge_vehs.get(edge_id, 0) + 1
                if spd < 0.5:  # vehicle queued / stopped
                    edge_queues[edge_id] = edge_queues.get(edge_id, 0) + 1

            net_avg_spd = sum(net_speeds) / n_vehs if n_vehs > 0 else 0.0
            net_avg_wt = sum(net_waiting) / n_vehs if n_vehs > 0 else 0.0

            # Extract per-vehicle kinematic metrics
            for vid in active_vehs:
                vtype = traci.vehicle.getTypeID(vid)
                pos = traci.vehicle.getPosition(vid)
                speed = traci.vehicle.getSpeed(vid)
                lane_id = traci.vehicle.getLaneID(vid)
                road_id = traci.vehicle.getRoadID(vid)
                angle = traci.vehicle.getAngle(vid)
                dist = traci.vehicle.getDistance(vid)
                wt = traci.vehicle.getWaitingTime(vid)

                # Compute acceleration from speed delta
                prev_spd = prev_speeds.get(vid, speed)
                accel = speed - prev_spd
                prev_speeds[vid] = speed

                row = {
                    "timestamp": round(sim_time, 1),
                    "vehicle_id": vid,
                    "vehicle_type": vtype,
                    "x": round(pos[0], 2),
                    "y": round(pos[1], 2),
                    "speed": round(speed, 2),
                    "acceleration": round(accel, 2),
                    "lane": lane_id,
                    "road": road_id,
                    "heading": round(angle, 2),
                    "distance": round(dist, 2),
                    "waiting_time": round(wt, 2),
                    "network_vehicle_count": n_vehs,
                    "network_avg_speed": round(net_avg_spd, 2),
                    "network_avg_waiting_time": round(net_avg_wt, 2),
                    "edge_vehicle_count": edge_vehs.get(road_id, 0),
                    "edge_queue_length": edge_queues.get(road_id, 0)
                }
                records.append(row)

            # Remove finished vehicles from speed cache
            active_set = set(active_vehs)
            for vid in list(prev_speeds.keys()):
                if vid not in active_set:
                    del prev_speeds[vid]

            if step % 25 == 0:
                print(f"[Step {step:4d}/{duration}] Collected {len(records)} records (active: {n_vehs} vehicles)")

            step += 1

    except Exception as e:
        print(f"Error during data collection: {e}")
    finally:
        print("Closing SUMO...")
        traci.close()

    # Write collected records to CSV
    print(f"Writing {len(records)} records to {OUTPUT_CSV}...")
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"Mobility data collection complete: {OUTPUT_CSV}")
    return OUTPUT_CSV

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Collect vehicle mobility data from SUMO.")
    parser.add_argument("--duration", type=int, default=150, help="Simulation duration (seconds)")
    parser.add_argument("--gui", action="store_true", help="Run with SUMO GUI")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    collect_mobility_data(duration=args.duration, gui=args.gui, seed=args.seed)
