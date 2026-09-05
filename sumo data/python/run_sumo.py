"""
run_sumo.py  —  Phase 4/7: SUMO TraCI controller.
Starts and controls SUMO through TraCI.
Supports GUI and headless modes, custom durations, seeds, scenarios.
Phase 7: Activates enhanced TLS programs for corridor junctions at startup.
"""

import os
import sys
import argparse

# ── SUMO_HOME setup ────────────────────────────────────────────────────────────
if "SUMO_HOME" not in os.environ:
    os.environ["SUMO_HOME"] = r"C:\Program Files (x86)\Eclipse\Sumo"

tools_path = os.path.join(os.environ["SUMO_HOME"], "tools")
if tools_path not in sys.path:
    sys.path.append(tools_path)

try:
    import traci
except ImportError:
    raise ImportError("Could not import TraCI. Ensure SUMO_HOME is configured properly.")

# ── Phase 7: Corridor TLS junctions with enhanced programs ────────────────────
# Activated at simulation start via TraCI to enable realistic queuing/congestion.
CORRIDOR_TLS_ENHANCED = [
    "2387385680",                                                          # Iblur
    "cluster_11962404444_1827247442_1827247449_5774292417_#3more",         # Bellandur
]

def activate_enhanced_tls():
    """Switch corridor TLS junctions to the 'enhanced' program defined in
    additional/traffic_lights.add.xml. Called once after TraCI starts."""
    tls_ids_in_sim = traci.trafficlight.getIDList()
    activated = []
    for tls_id in CORRIDOR_TLS_ENHANCED:
        if tls_id in tls_ids_in_sim:
            try:
                traci.trafficlight.setProgram(tls_id, "enhanced")
                activated.append(tls_id)
            except traci.exceptions.TraCIException as e:
                print(f"  [TLS] Could not activate enhanced program for {tls_id}: {e}")
    if activated:
        print(f"  [TLS] Enhanced programs activated for {len(activated)} corridor junctions.")
    return activated


def run_simulation(gui=False, duration=300, config_file="simulation.sumocfg",
                   seed=42, scenario=None, tls_program="enhanced"):
    """
    Run SUMO simulation via TraCI.

    Args:
        gui          : Launch SUMO-GUI (bool)
        duration     : Simulation steps to run
        config_file  : Path to .sumocfg
        seed         : Random seed
        scenario     : Optional scenario name (for logging)
        tls_program  : TLS program to activate at startup
    """
    sumo_binary = "sumo-gui" if gui else "sumo"
    sumo_exe    = os.path.join(os.environ["SUMO_HOME"], "bin", f"{sumo_binary}.exe")
    if not os.path.exists(sumo_exe):
        sumo_exe = sumo_binary  # fallback to PATH

    if not os.path.exists(config_file):
        raise FileNotFoundError(f"Configuration file not found: {config_file}")

    sumo_cmd = [
        sumo_exe,
        "-c", config_file,
        "--seed", str(seed),
        "--no-step-log", "true",
        "--waiting-time-memory", "1000",
        "--quit-on-end", "true",
    ]
    if gui:
        sumo_cmd.extend(["--start", "true"])

    sc_label = f"  Scenario: {scenario}" if scenario else ""
    print(f"Starting SUMO ({sumo_binary}) | Config: {config_file} | "
          f"Duration: {duration} steps | Seed: {seed}{sc_label}")

    traci.start(sumo_cmd)

    # ── Phase 7: Activate enhanced TLS programs ────────────────────────────
    if tls_program == "enhanced":
        activate_enhanced_tls()

    step = 0
    total_vehicles_seen = set()

    try:
        while step < duration:
            traci.simulationStep()
            active_vehs = traci.vehicle.getIDList()
            total_vehicles_seen.update(active_vehs)

            if step % 20 == 0:
                n_act = len(active_vehs)
                n_tot = len(total_vehicles_seen)
                print(f"  [Step {step:4d}/{duration}] "
                      f"Active: {n_act:3d} | Total unique: {n_tot:4d}")
            step += 1

    except traci.exceptions.FatalTraCIError as e:
        print(f"TraCI connection error: {e}")
    except KeyboardInterrupt:
        print("\nSimulation interrupted by user.")
    finally:
        print("Closing TraCI connection...")
        traci.close()
        print(f"Simulation complete. Steps: {step} | "
              f"Total unique vehicles: {len(total_vehicles_seen)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run SUMO simulation via TraCI (Phase 4/7).")
    parser.add_argument("--gui",      action="store_true",
                        help="Launch SUMO with GUI")
    parser.add_argument("--duration", type=int,   default=300,
                        help="Simulation steps (default: 300)")
    parser.add_argument("--config",   type=str,   default="simulation.sumocfg",
                        help="SUMO config file (default: simulation.sumocfg)")
    parser.add_argument("--seed",     type=int,   default=42,
                        help="Random seed (default: 42)")
    parser.add_argument("--scenario", type=str,   default=None,
                        help="Scenario name for logging")
    parser.add_argument("--no-tls",   action="store_true",
                        help="Skip enhanced TLS activation")
    args = parser.parse_args()

    run_simulation(
        gui=args.gui,
        duration=args.duration,
        config_file=args.config,
        seed=args.seed,
        scenario=args.scenario,
        tls_program="enhanced" if not args.no_tls else "default",
    )
