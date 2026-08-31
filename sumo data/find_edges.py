import os
import sys

# Add SUMO tools to Python path
if "SUMO_HOME" not in os.environ:
    print("ERROR: SUMO_HOME is not set.")
    print("Please set SUMO_HOME first.")
    sys.exit(1)

sys.path.append(os.path.join(os.environ["SUMO_HOME"], "tools"))

import sumolib


# Your SUMO network
NET_FILE = "osm.net.xml"

# Approximate GPS coordinates
locations = {
    "Silk Board": (77.6238, 12.9177),
    "Bellandur": (77.6782, 12.9310),
    "Marathahalli": (77.6998, 12.9512)
}


# Load SUMO network
net = sumolib.net.readNet(NET_FILE)

print("\n========================================")
print(" FINDING NEAREST SUMO EDGES")
print("========================================\n")


for place, (lon, lat) in locations.items():

    # Convert GPS coordinates:
    # longitude, latitude
    # into SUMO x,y coordinates
    x, y = net.convertLonLat2XY(lon, lat)

    print("----------------------------------------")
    print(place)
    print("GPS:")
    print("  Latitude :", lat)
    print("  Longitude:", lon)
    print("SUMO:")
    print("  X:", x)
    print("  Y:", y)

    # Search roads within 500 meters
    edges = net.getNeighboringEdges(x, y, 500)

    # Sort by distance
    edges = sorted(edges, key=lambda item: item[1])

    print("\nNearest roads:")

    # Show 10 nearest edges
    for edge, distance in edges[:10]:

        print(
            "  Edge ID:",
            edge.getID(),
            "| Distance:",
            round(distance, 2),
            "m",
            "| Road:",
            edge.getName()
        )

    print()