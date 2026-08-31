import xml.etree.ElementTree as ET
import csv

INPUT_FILE = "mobility.xml"
OUTPUT_FILE = "mobility.csv"

print("Reading mobility.xml...")

tree = ET.parse(INPUT_FILE)
root = tree.getroot()

rows = []

for timestep in root.findall("timestep"):

    time = float(timestep.get("time"))

    for vehicle in timestep.findall("vehicle"):

        vehicle_id = vehicle.get("id")
        x = vehicle.get("x")
        y = vehicle.get("y")
        angle = vehicle.get("angle")
        vehicle_type = vehicle.get("type")
        speed = vehicle.get("speed")
        position = vehicle.get("pos")
        lane = vehicle.get("lane")
        slope = vehicle.get("slope")

        rows.append([
            time,
            vehicle_id,
            x,
            y,
            angle,
            vehicle_type,
            speed,
            position,
            lane,
            slope
        ])

print("Writing mobility.csv...")

with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as file:

    writer = csv.writer(file)

    writer.writerow([
        "time",
        "vehicle_id",
        "longitude",
        "latitude",
        "angle",
        "vehicle_type",
        "speed_mps",
        "position_on_lane",
        "lane",
        "slope"
    ])

    writer.writerows(rows)

print()
print("===================================")
print("Mobility conversion completed!")
print("===================================")
print("Total vehicle records:", len(rows))
print("Output file:", OUTPUT_FILE)