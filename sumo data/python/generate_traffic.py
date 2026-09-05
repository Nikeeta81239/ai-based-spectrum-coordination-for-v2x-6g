"""
generate_traffic.py
Generates realistic multi-class vehicle traffic for SUMO simulation
across the Silk Board -> Agara -> Iblur -> Bellandur -> Marathahalli corridor.
"""

import os
import sys
import subprocess
import random
import xml.etree.ElementTree as ET

SUMO_HOME = os.environ.get("SUMO_HOME", r"C:\Program Files (x86)\Eclipse\Sumo")
TOOLS_DIR = os.path.join(SUMO_HOME, "tools")
RANDOM_TRIPS = os.path.join(TOOLS_DIR, "randomTrips.py")
DUAROUTER = os.path.join(SUMO_HOME, "bin", "duarouter.exe")
NET_FILE = os.path.join("network", "network.net.xml")
OUTPUT_ROUTES = os.path.join("routes", "traffic.rou.xml")

# Configurable vehicle type parameters
VEHICLE_TYPES = {
    "car": {
        "vClass": "passenger",
        "accel": "2.6",
        "decel": "4.5",
        "sigma": "0.5",
        "length": "4.5",
        "minGap": "2.0",
        "maxSpeed": "16.67",  # ~60 km/h
        "color": "0,255,255", # Cyan
        "proportion": 0.68    # 68%
    },
    "motorcycle": {
        "vClass": "motorcycle",
        "accel": "3.0",
        "decel": "4.5",
        "sigma": "0.6",
        "length": "2.2",
        "minGap": "1.0",
        "maxSpeed": "16.67",  # ~60 km/h
        "color": "255,255,0", # Yellow
        "proportion": 0.20    # 20%
    },
    "bus": {
        "vClass": "bus",
        "accel": "1.2",
        "decel": "3.5",
        "sigma": "0.4",
        "length": "12.0",
        "minGap": "2.5",
        "maxSpeed": "13.89",  # ~50 km/h
        "color": "255,140,0", # Orange
        "proportion": 0.05    # 5%
    },
    "truck": {
        "vClass": "truck",
        "accel": "1.5",
        "decel": "4.0",
        "sigma": "0.4",
        "length": "8.0",
        "minGap": "2.5",
        "maxSpeed": "13.89",  # ~50 km/h
        "color": "30,144,255",# Blue
        "proportion": 0.05    # 5%
    },
    "emergency": {
        "vClass": "emergency",
        "accel": "3.5",
        "decel": "5.0",
        "sigma": "0.2",
        "length": "5.5",
        "minGap": "1.5",
        "maxSpeed": "22.22",  # ~80 km/h
        "color": "255,0,0",   # Red
        "proportion": 0.02    # 2%
    }
}

SCENARIO_PERIODS = {
    "LOW": 6.0,          # 1 trip every 6s (low demand)
    "MEDIUM": 3.0,       # 1 trip every 3s (moderate)
    "HIGH": 1.5,         # 1 trip every 1.5s (heavy)
    "VERY_HIGH": 0.8,    # 1 trip every 0.8s (severe congestion)
    "MORNING_PEAK": 1.2, # Morning rush hour
    "MIDDAY": 3.5,       # Midday moderate
    "EVENING_PEAK": 0.9, # Evening heavy rush hour
    "NIGHT": 8.0         # Late night low traffic
}

def generate_traffic(scenario="MEDIUM", duration=3600, seed=42):
    period = SCENARIO_PERIODS.get(scenario.upper(), 3.0)
    print(f"Generating realistic traffic scenario: {scenario.upper()}")
    print(f"Period: {period}s | Duration: {duration}s | Seed: {seed}")

    # Step 1: Generate temporary trips with randomTrips
    temp_trips = os.path.join("routes", "temp_trips.trips.xml")
    temp_routes = os.path.join("routes", "temp_routes.rou.xml")

    cmd_trips = [
        sys.executable, RANDOM_TRIPS,
        "-n", NET_FILE,
        "-o", temp_trips,
        "-r", temp_routes,
        "-e", str(duration),
        "-p", str(period),
        "--seed", str(seed),
        "--validate"
    ]
    
    print("Running trip generator...")
    subprocess.run(cmd_trips, check=True)

    if not os.path.exists(temp_routes):
        print("Error: temp_routes.rou.xml was not created.")
        return False

    print("Parsing generated routes and assigning realistic vehicle types & priorities...")
    tree = ET.parse(temp_routes)
    root = tree.getroot()

    # Create new route file structure
    new_root = ET.Element("routes")

    # Add vType definitions
    for vtype_id, vparams in VEHICLE_TYPES.items():
        vtype_elem = ET.SubElement(new_root, "vType", {
            "id": vtype_id,
            "vClass": vparams["vClass"],
            "accel": vparams["accel"],
            "decel": vparams["decel"],
            "sigma": vparams["sigma"],
            "length": vparams["length"],
            "minGap": vparams["minGap"],
            "maxSpeed": vparams["maxSpeed"],
            "color": vparams["color"]
        })

    # Prepare random type distribution
    type_names = list(VEHICLE_TYPES.keys())
    type_probs = [VEHICLE_TYPES[k]["proportion"] for k in type_names]

    random.seed(seed)
    veh_count = 0

    # Copy vehicles and assign realistic types
    for child in root:
        if child.tag == "vehicle":
            selected_type = random.choices(type_names, weights=type_probs, k=1)[0]
            child.set("type", selected_type)
            new_root.append(child)
            veh_count += 1
        elif child.tag in ["vType", "route"]:
            if child.tag == "route":
                new_root.append(child)

    out_tree = ET.ElementTree(new_root)
    ET.indent(out_tree, space="    ")
    out_tree.write(OUTPUT_ROUTES, encoding="utf-8", xml_declaration=True)

    # Clean up temporary files
    for tmp in [temp_trips, temp_routes]:
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except Exception:
                pass

    print(f"Successfully generated {veh_count} realistic vehicles in {OUTPUT_ROUTES}")
    return True

if __name__ == "__main__":
    scenario = sys.argv[1] if len(sys.argv) > 1 else "MEDIUM"
    duration = int(sys.argv[2]) if len(sys.argv) > 2 else 3600
    seed = int(sys.argv[3]) if len(sys.argv) > 3 else 42
    generate_traffic(scenario, duration, seed)
