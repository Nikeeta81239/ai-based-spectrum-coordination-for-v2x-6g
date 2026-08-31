"""
scripts/run_simulation.py — CLI script to run simulation loop directly in terminal.
"""

import sys
import os
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.app.services.simulation_service import sim_service

if __name__ == "__main__":
    print("Starting 6G V2X Spectrum Coordination Simulation...")
    sim_service.start(scenario="low", duration_steps=50)

    step = 0
    while sim_service.status == "running" and step < 50:
        snap = sim_service.step()
        metrics = snap.get("metrics", {})
        print(
            f"Step {snap.get('time_step', 0)} | "
            f"Vehicles: {len(snap.get('vehicles', []))} | "
            f"Throughput: {metrics.get('mean_throughput_mbps', 0):.2f} Mbps | "
            f"PDR: {metrics.get('mean_pdr', 0)*100:.1f}% | "
            f"Interference: {metrics.get('mean_interference', 0):.3f}"
        )
        step += 1

    print("Simulation finished.")
