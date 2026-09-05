import os
import xml.etree.ElementTree as ET
import math

# Corridor GPS landmarks (Lon, Lat)
CORRIDOR_LANDMARKS = {
    "Silk_Board": (77.6229, 12.9175),
    "Agara": (77.6430, 12.9265),
    "Iblur": (77.6535, 12.9298),
    "Bellandur": (77.6715, 12.9355),
    "Marathahalli": (77.7010, 12.9560)
}

NET_FILE = os.path.join("network", "network.net.xml")

# Parse SUMO net offset and projection
tree = ET.parse(NET_FILE)
root = tree.getroot()
loc = root.find("location")
net_offset = [float(x) for x in loc.get("netOffset").split(",")]

# Check junctions / nodes around each landmark by distance
# First convert lon/lat to UTM zone 43N approximately:
def lonlat_to_sumo(lon, lat):
    # Proj4 utm zone 43:
    # Approx utm conversion
    # zone 43 central meridian = 75.0 deg
    rad = math.pi / 180.0
    a = 6378137.0
    f = 1 / 298.257223563
    e2 = 2*f - f*f
    lon0 = 75.0 * rad
    phi = lat * rad
    lam = lon * rad
    N = a / math.sqrt(1 - e2 * (math.sin(phi)**2))
    T = math.tan(phi)**2
    C = (e2 / (1 - e2)) * (math.cos(phi)**2)
    A = (lam - lon0) * math.cos(phi)
    M = a * ((1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256)*phi
             - (3*e2/8 + 3*e2*e2/32 + 45*e2*e2*e2/1024)*math.sin(2*phi)
             + (15*e2*e2/256 + 45*e2*e2*e2/1024)*math.sin(4*phi)
             - (35*e2*e2*e2/3072)*math.sin(6*phi))
    k0 = 0.9996
    x_utm = k0 * N * (A + (1 - T + C)*(A**3)/6 + (5 - 18*T + T**2 + 72*C - 58*(e2/(1-e2)))*(A**5)/120) + 500000.0
    y_utm = k0 * (M + N*math.tan(phi)*((A**2)/2 + (5 - T + 9*C + 4*C*C)*(A**4)/24 + (61 - 58*T + T**2 + 600*C - 330*(e2/(1-e2)))*(A**6)/720))
    sumo_x = x_utm + net_offset[0]
    sumo_y = y_utm + net_offset[1]
    return sumo_x, sumo_y

print("Converted Corridor Landmarks to SUMO 2D coordinates:")
sumo_landmarks = {}
for name, (lon, lat) in CORRIDOR_LANDMARKS.items():
    sx, sy = lonlat_to_sumo(lon, lat)
    sumo_landmarks[name] = (sx, sy, lon, lat)
    print(f"  {name:15s}: GPS=({lon:.4f}, {lat:.4f}) -> SUMO=({sx:.1f}, {sy:.1f})")

# Find nearest non-internal edges to each landmark
junctions = []
for junc in root.findall("junction"):
    jid = junc.get("id")
    if not jid.startswith(":"):
        jx = float(junc.get("x"))
        jy = float(junc.get("y"))
        junctions.append((jid, jx, jy))

print("\nFinding nearest network junctions to each landmark:")
nearest_juncs = {}
for name, (sx, sy, lon, lat) in sumo_landmarks.items():
    best_d = 1e9
    best_j = None
    for jid, jx, jy in junctions:
        d = math.hypot(jx - sx, jy - sy)
        if d < best_d:
            best_d = d
            best_j = (jid, jx, jy)
    nearest_juncs[name] = (best_j, best_d)
    print(f"  {name:15s}: Nearest Junction={best_j[0]} (dist={best_d:.1f}m, pos=({best_j[1]:.1f}, {best_j[2]:.1f}))")

# Save coordinates for RSUs and Python modules
out_file = os.path.join("python", "corridor_landmarks.py")
with open(out_file, "w", encoding="utf-8") as f:
    f.write("# Discovered corridor landmarks and RSU positions in SUMO 2D coordinates\n\n")
    f.write("RSU_CONFIG = {\n")
    for name, (sx, sy, lon, lat) in sumo_landmarks.items():
        best_j, d = nearest_juncs[name]
        f.write(f'    "{name}": {{\n')
        f.write(f'        "id": "RSU_{name}",\n')
        f.write(f'        "name": "{name}",\n')
        f.write(f'        "lon": {lon},\n')
        f.write(f'        "lat": {lat},\n')
        f.write(f'        "sumo_x": {round(best_j[1], 2)},\n')
        f.write(f'        "sumo_y": {round(best_j[2], 2)},\n')
        f.write(f'        "coverage_radius": 500.0,  # meters (typical 5G/6G sub-6GHz / C-V2X RSU range)\n')
        f.write(f'        "nearest_junction": "{best_j[0]}"\n')
        f.write(f'    }},\n')
    f.write("}\n")

print(f"\nSaved RSU configuration to {out_file}")
