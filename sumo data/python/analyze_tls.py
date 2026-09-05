"""
analyze_tls.py  —  Phase 7: Analyze traffic lights and identify corridor TLS nodes.
Parses network.net.xml and outputs the IDs and programs of all TLS junctions.
"""
import os
import math
import xml.etree.ElementTree as ET

NET_FILE = os.path.join("network", "network.net.xml")

CORRIDOR_SUMO = {
    "Silk_Board":   (2473.22, 7760.00),
    "Agara":        (4416.78, 8762.95),
    "Iblur":        (5846.02, 9145.02),
    "Bellandur":    (7857.39, 9292.06),
    "Marathahalli": (9655.11, 12040.17),
}

SEP = "=" * 68

def sec(t): print(f"\n{SEP}\n  {t}\n{SEP}")

print(f"Parsing {NET_FILE} for TLS programs ...")

# Collect all TLS junctions with coordinates
tls_junctions = {}  # id -> (x, y, type)
tls_programs  = {}  # id -> list of tlLogic elements

context = ET.iterparse(NET_FILE, events=("start", "end"))
for event, elem in context:
    if event == "end":
        if elem.tag == "junction":
            jtype = elem.attrib.get("type", "")
            if jtype == "traffic_light":
                jid = elem.attrib.get("id", "")
                try:
                    jx = float(elem.attrib.get("x", 0))
                    jy = float(elem.attrib.get("y", 0))
                except ValueError:
                    jx, jy = 0, 0
                tls_junctions[jid] = (jx, jy)
        elif elem.tag == "tlLogic":
            tl_id = elem.attrib.get("id", "")
            phases = []
            for ph in elem:
                if ph.tag == "phase":
                    phases.append({
                        "duration": ph.attrib.get("duration", "?"),
                        "state":    ph.attrib.get("state", "?")[:20],
                    })
            tls_programs[tl_id] = {
                "type":      elem.attrib.get("type", ""),
                "programID": elem.attrib.get("programID", ""),
                "offset":    elem.attrib.get("offset", "0"),
                "phases":    phases,
            }
        elem.clear()

sec(f"ALL TLS JUNCTIONS  ({len(tls_junctions)} total)")
print(f"  {'ID':<55} {'X':>8} {'Y':>8}")
print("  " + "-" * 74)
for jid, (jx, jy) in sorted(tls_junctions.items(), key=lambda x: x[1][0]):
    print(f"  {jid:<55} {jx:>8.1f} {jy:>8.1f}")

sec("CORRIDOR NEAREST TLS  (within 1500m of each RSU)")
corridor_tls = {}
for lm_name, (lx, ly) in CORRIDOR_SUMO.items():
    nearby = []
    for jid, (jx, jy) in tls_junctions.items():
        d = math.hypot(jx - lx, jy - ly)
        if d <= 1500:
            nearby.append((d, jid, jx, jy))
    nearby.sort()
    corridor_tls[lm_name] = nearby
    print(f"\n  {lm_name}  (RSU at {lx:.0f},{ly:.0f})")
    if nearby:
        for d, jid, jx, jy in nearby:
            print(f"    dist={d:>6.0f}m  {jid}")
    else:
        print(f"    No TLS within 1500m — OSM TLS absent; network uses priority junctions")

sec("TLS PROGRAM DETAILS  (first 5)")
count = 0
for tl_id, prog in list(tls_programs.items())[:5]:
    print(f"\n  TLS: {tl_id}")
    print(f"    Type={prog['type']}  Program={prog['programID']}  Offset={prog['offset']}")
    for i, ph in enumerate(prog["phases"]):
        print(f"    Phase {i}: dur={ph['duration']:>4}s  state={ph['state']}")
    count += 1

print(f"\n  ... {len(tls_programs)} total TLS programs in network")

sec("SUMMARY")
print(f"  TLS junctions         : {len(tls_junctions)}")
print(f"  TLS programs in net   : {len(tls_programs)}")

# Save TLS IDs near corridor to a file for reference
out_path = os.path.join("python", "corridor_tls_ids.txt")
with open(out_path, "w") as f:
    f.write("# TLS junctions within 1500m of corridor RSUs\n")
    for lm_name, nearby in corridor_tls.items():
        f.write(f"\n# {lm_name}\n")
        for d, jid, jx, jy in nearby:
            f.write(f"{jid}  # dist={d:.0f}m  x={jx:.1f} y={jy:.1f}\n")
print(f"\n  Corridor TLS IDs saved to {out_path}")
print(f"\n{SEP}\n  PHASE 7 TLS ANALYSIS COMPLETE\n{SEP}")
