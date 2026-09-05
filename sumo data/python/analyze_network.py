"""
analyze_network.py  —  Phase 3: Deep network and OSM validation.
Parses network.net.xml and reports junctions, edges, TLS, and corridor coverage.
"""
import os
import sys
import math
import xml.etree.ElementTree as ET

NET_FILE = os.path.join("network", "network.net.xml")

# Corridor RSU GPS positions (lon, lat)
CORRIDOR = {
    "Silk_Board":   (77.6229, 12.9175),
    "Agara":        (77.6430, 12.9265),
    "Iblur":        (77.6535, 12.9298),
    "Bellandur":    (77.6715, 12.9355),
    "Marathahalli": (77.7010, 12.9560),
}

# Known SUMO XY from corridor_landmarks.py
CORRIDOR_SUMO = {
    "Silk_Board":   (2473.22, 7760.00),
    "Agara":        (4416.78, 8762.95),
    "Iblur":        (5846.02, 9145.02),
    "Bellandur":    (7857.39, 9292.06),
    "Marathahalli": (9655.11, 12040.17),
}

SEP = "=" * 70

def sec(t):
    print(f"\n{SEP}\n  {t}\n{SEP}")

print(f"Parsing {NET_FILE} ...")

n_junctions = 0
n_edges     = 0
n_lanes     = 0
n_tls       = 0
edge_types  = {}
tls_ids     = []
location    = None
conv_bounds = None
orig_bounds = None

context = ET.iterparse(NET_FILE, events=("start", "end"))

for event, elem in context:
    if event == "start":
        if elem.tag == "location":
            location    = elem.attrib.get("netOffset", "")
            conv_bounds = elem.attrib.get("convBoundary", "")
            orig_bounds = elem.attrib.get("origBoundary", "")
    if event == "end":
        if elem.tag == "junction":
            n_junctions += 1
            jtype = elem.attrib.get("type", "")
            if jtype == "traffic_light":
                n_tls += 1
                tls_ids.append(elem.attrib.get("id", ""))
        elif elem.tag == "edge":
            eid = elem.attrib.get("id", "")
            if not eid.startswith(":"):
                n_edges += 1
                et = elem.attrib.get("type", "unknown")
                edge_types[et] = edge_types.get(et, 0) + 1
                for child in elem:
                    if child.tag == "lane":
                        n_lanes += 1
        elem.clear()

sec("NETWORK METADATA")
print(f"  Net offset    : {location}")
print(f"  SUMO bounds   : {conv_bounds}")
print(f"  Geo bounds    : {orig_bounds}")
print(f"  Projection    : UTM Zone 43N WGS84")

sec("NETWORK STATISTICS")
print(f"  Junctions     : {n_junctions:,}")
print(f"  Edges (roads) : {n_edges:,}")
print(f"  Lanes         : {n_lanes:,}")
print(f"  TLS junctions : {n_tls:,}")
print(f"\n  Edge type breakdown:")
for et, cnt in sorted(edge_types.items(), key=lambda x: -x[1]):
    print(f"    {et:<40} {cnt:>5}")

sec("CORRIDOR LANDMARK COVERAGE")
cb = [float(x) for x in conv_bounds.split(",")]  # minX, minY, maxX, maxY
net_minx, net_miny, net_maxx, net_maxy = cb

print(f"\n  Network SUMO bounds: X=[{net_minx:.1f}, {net_maxx:.1f}]  Y=[{net_miny:.1f}, {net_maxy:.1f}]")
print()
all_in = True
for name, (sx, sy) in CORRIDOR_SUMO.items():
    in_x = net_minx <= sx <= net_maxx
    in_y = net_miny <= sy <= net_maxy
    ok   = in_x and in_y
    if not ok:
        all_in = False
    tag  = "COVERED" if ok else "OUTSIDE"
    print(f"  [{tag}] {name:<15} SUMO=({sx:.1f}, {sy:.1f})")

print(f"\n  All corridor landmarks covered: {'YES' if all_in else 'NO -- CHECK NETWORK'}")

sec("TRAFFIC LIGHT SUMMARY")
print(f"  Total TLS junctions : {n_tls:,}")
print(f"  First 10 TLS IDs    :")
for tid in tls_ids[:10]:
    print(f"    {tid}")
if len(tls_ids) > 10:
    print(f"    ... and {len(tls_ids)-10} more")

# Find TLS closest to each corridor landmark
sec("TLS NEAREST TO CORRIDOR LANDMARKS")
print("  (Using known SUMO coords — re-parsing for junction positions)")

# Quick second pass just for junction x/y near corridor points
nearest = {name: (None, float('inf')) for name in CORRIDOR_SUMO}

context2 = ET.iterparse(NET_FILE, events=("end",))
for event, elem in context2:
    if elem.tag == "junction":
        jid   = elem.attrib.get("id", "")
        jtype = elem.attrib.get("type", "")
        try:
            jx = float(elem.attrib.get("x", 0))
            jy = float(elem.attrib.get("y", 0))
        except ValueError:
            elem.clear()
            continue
        for name, (sx, sy) in CORRIDOR_SUMO.items():
            d = math.hypot(jx - sx, jy - sy)
            if d < nearest[name][1]:
                nearest[name] = (jid, d)
        elem.clear()

for name, (jid, dist) in nearest.items():
    print(f"  {name:<15} -> junction {jid}  (dist={dist:.1f}m)")

print(f"\n{SEP}")
print("  PHASE 3 NETWORK ANALYSIS COMPLETE")
print(SEP)
