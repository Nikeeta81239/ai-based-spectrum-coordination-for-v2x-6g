"""
generate_all_scenarios.py  —  Phase 6: Generate all 8 traffic scenarios.

Creates separate route files in routes/ for:
  LOW, MEDIUM, HIGH, VERY_HIGH,
  MORNING_PEAK, MIDDAY, EVENING_PEAK, NIGHT

Also creates per-scenario sumocfg files in configs/
"""

import os
import sys
import subprocess
import random
import xml.etree.ElementTree as ET
import shutil

# ── Paths ─────────────────────────────────────────────────────────────────────
SUMO_HOME   = os.environ.get("SUMO_HOME", r"C:\Program Files (x86)\Eclipse\Sumo")
TOOLS_DIR   = os.path.join(SUMO_HOME, "tools")
RANDOM_TRIPS = os.path.join(TOOLS_DIR, "randomTrips.py")
DUAROUTER   = os.path.join(SUMO_HOME, "bin", "duarouter.exe")
NET_FILE    = os.path.join("network", "network.net.xml")
ROUTES_DIR  = "routes"
CONFIGS_DIR = "configs"
OUTPUT_DIR  = "output"

os.makedirs(ROUTES_DIR,  exist_ok=True)
os.makedirs(CONFIGS_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR,  exist_ok=True)

# ── Configurable vehicle types ─────────────────────────────────────────────────
VEHICLE_TYPES = {
    "car": {
        "vClass": "passenger", "accel": "2.6",  "decel": "4.5",
        "sigma": "0.5",  "length": "4.5",  "minGap": "2.0",
        "maxSpeed": "16.67", "color": "0,255,255", "proportion": 0.68
    },
    "motorcycle": {
        "vClass": "motorcycle", "accel": "3.0", "decel": "4.5",
        "sigma": "0.6",  "length": "2.2",  "minGap": "1.0",
        "maxSpeed": "16.67", "color": "255,255,0", "proportion": 0.20
    },
    "bus": {
        "vClass": "bus", "accel": "1.2", "decel": "3.5",
        "sigma": "0.4",  "length": "12.0", "minGap": "2.5",
        "maxSpeed": "13.89", "color": "255,140,0", "proportion": 0.05
    },
    "truck": {
        "vClass": "truck", "accel": "1.5", "decel": "4.0",
        "sigma": "0.4",  "length": "8.0",  "minGap": "2.5",
        "maxSpeed": "13.89", "color": "30,144,255", "proportion": 0.05
    },
    "emergency": {
        "vClass": "emergency", "accel": "3.5", "decel": "5.0",
        "sigma": "0.2",  "length": "5.5",  "minGap": "1.5",
        "maxSpeed": "22.22", "color": "255,0,0", "proportion": 0.02
    },
}

# ── Scenario definitions ────────────────────────────────────────────────────────
SCENARIOS = {
    "LOW":          {"period": 6.0,  "description": "Low demand — night-level sparse traffic"},
    "MEDIUM":       {"period": 3.0,  "description": "Moderate urban traffic (baseline)"},
    "HIGH":         {"period": 1.5,  "description": "Heavy traffic — near-peak congestion"},
    "VERY_HIGH":    {"period": 0.8,  "description": "Severe congestion — gridlock conditions"},
    "MORNING_PEAK": {"period": 1.2,  "description": "Morning rush hour (7–9 AM pattern)"},
    "MIDDAY":       {"period": 3.5,  "description": "Midday moderate traffic (11 AM–2 PM)"},
    "EVENING_PEAK": {"period": 0.9,  "description": "Evening rush hour (5–8 PM pattern)"},
    "NIGHT":        {"period": 8.0,  "description": "Late-night low traffic"},
}

SIMULATION_DURATION = 3600  # 1 hour per scenario

SEP = "=" * 68

def generate_scenario(name, period, seed=42):
    """Generate randomTrips + duarouter route file for one scenario."""
    print(f"\n{SEP}")
    print(f"  Generating scenario: {name}  (period={period}s, seed={seed})")
    print(SEP)

    temp_trips  = os.path.join(ROUTES_DIR, f"_tmp_{name}.trips.xml")
    temp_routes = os.path.join(ROUTES_DIR, f"_tmp_{name}.rou.xml")
    out_routes  = os.path.join(ROUTES_DIR, f"scenario_{name.lower()}.rou.xml")

    # Step 1 — randomTrips
    cmd_trips = [
        sys.executable, RANDOM_TRIPS,
        "-n", NET_FILE,
        "-o", temp_trips,
        "-r", temp_routes,
        "-e", str(SIMULATION_DURATION),
        "-p", str(period),
        "--seed", str(seed),
        "--validate",
        "--fringe-factor", "5",
    ]
    print(f"  [1/3] Running randomTrips.py (period={period}s) ...")
    result = subprocess.run(cmd_trips, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ERROR in randomTrips: {result.stderr[:300]}")
        return False

    if not os.path.exists(temp_routes):
        print("  ERROR: temp routes not created")
        return False

    # Count generated trips
    tree = ET.parse(temp_trips)
    n_trips = sum(1 for _ in tree.getroot().iter("trip"))
    print(f"  [2/3] Parsed {n_trips} trips — assigning vehicle types ...")

    # Step 2 — assign vehicle types with proportional random distribution
    routes_tree = ET.parse(temp_routes)
    routes_root = routes_tree.getroot()

    new_root = ET.Element("routes")
    new_root.set("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance")
    new_root.set("xsi:noNamespaceSchemaLocation",
                 "http://sumo.dlr.de/xsd/routes_file.xsd")

    # Vehicle type definitions
    for vtype_id, vparams in VEHICLE_TYPES.items():
        attrs = {k: v for k, v in vparams.items() if k != "proportion"}
        attrs["id"] = vtype_id
        ET.SubElement(new_root, "vType", attrs)

    type_names = list(VEHICLE_TYPES.keys())
    type_probs = [VEHICLE_TYPES[k]["proportion"] for k in type_names]
    random.seed(seed)
    veh_count  = 0

    for child in routes_root:
        if child.tag == "vehicle":
            child.set("type", random.choices(type_names, weights=type_probs, k=1)[0])
            new_root.append(child)
            veh_count += 1
        elif child.tag == "route":
            new_root.append(child)

    ET.indent(new_root, space="    ")
    out_tree = ET.ElementTree(new_root)
    out_tree.write(out_routes, encoding="utf-8", xml_declaration=True)

    # Clean up temps
    for tmp in [temp_trips, temp_routes]:
        if os.path.exists(tmp):
            os.remove(tmp)

    size_kb = os.path.getsize(out_routes) / 1024
    print(f"  [3/3] Saved {veh_count} vehicles -> {out_routes}  ({size_kb:.0f} KB)")
    return True, veh_count


def create_scenario_config(name):
    """Create a per-scenario simulation.sumocfg in configs/"""
    route_file  = f"../routes/scenario_{name.lower()}.rou.xml"
    out_prefix  = f"../output/scenario_{name.lower()}"

    cfg = f"""<?xml version="1.0" encoding="UTF-8"?>
<configuration xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/sumoConfiguration.xsd">

    <input>
        <net-file value="../network/network.net.xml"/>
        <route-files value="{route_file}"/>
        <additional-files value="../additional/additional.add.xml,../additional/traffic_lights.add.xml"/>
    </input>

    <time>
        <begin value="0"/>
        <end value="{SIMULATION_DURATION}"/>
        <step-length value="1.0"/>
    </time>

    <output>
        <tripinfo-output value="{out_prefix}_tripinfo.xml"/>
        <fcd-output value="{out_prefix}_fcd.xml"/>
        <summary-output value="{out_prefix}_summary.xml"/>
    </output>

    <processing>
        <ignore-route-errors value="true"/>
        <collision.action value="warn"/>
        <time-to-teleport value="300"/>
    </processing>

    <gui_only>
        <gui-settings-file value="../gui_settings.xml"/>
        <start value="true"/>
        <quit-on-end value="false"/>
    </gui_only>

</configuration>
"""
    cfg_path = os.path.join(CONFIGS_DIR, f"scenario_{name.lower()}.sumocfg")
    with open(cfg_path, "w", encoding="utf-8") as f:
        f.write(cfg)
    return cfg_path


def main():
    print(f"\n{SEP}")
    print("  PHASE 6 — GENERATING ALL 8 TRAFFIC SCENARIOS")
    print(SEP)
    print(f"  Network : {NET_FILE}")
    print(f"  Routes  : {ROUTES_DIR}/scenario_<name>.rou.xml")
    print(f"  Configs : {CONFIGS_DIR}/scenario_<name>.sumocfg")
    print(f"  Duration: {SIMULATION_DURATION}s per scenario")

    results = {}
    seed = 42

    for sc_name, sc_info in SCENARIOS.items():
        period = sc_info["period"]
        ok = generate_scenario(sc_name, period, seed=seed)
        cfg_path = create_scenario_config(sc_name)
        results[sc_name] = {
            "ok": ok is not False,
            "period": period,
            "cfg": cfg_path,
            "desc": sc_info["description"],
        }
        seed += 7  # Different seed per scenario for variability

    # Summary
    print(f"\n{SEP}")
    print("  SCENARIO GENERATION SUMMARY")
    print(SEP)
    print(f"  {'Scenario':<16} {'Period':>8} {'Status':>8}  Description")
    print("  " + "-" * 66)
    for sc_name, info in results.items():
        status = "OK" if info["ok"] else "FAILED"
        route_f = os.path.join(ROUTES_DIR, f"scenario_{sc_name.lower()}.rou.xml")
        size_kb = os.path.getsize(route_f) / 1024 if os.path.exists(route_f) else 0
        print(f"  {sc_name:<16} {info['period']:>6.1f}s  {status:>6}  {info['desc']}")

    print(f"\n{SEP}")
    print("  PHASE 6 COMPLETE")
    print(SEP)


if __name__ == "__main__":
    main()
