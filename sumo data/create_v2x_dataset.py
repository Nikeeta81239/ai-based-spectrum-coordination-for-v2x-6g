import pandas as pd
import math

INPUT_FILE = "mobility.csv"
OUTPUT_FILE = "v2x_dataset.csv"

# Maximum V2V communication range in meters
COMMUNICATION_RANGE = 150.0


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two geographic coordinates.
    Result is in meters.
    """

    R = 6371000  # Earth radius in meters

    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


print("Loading mobility.csv...")

df = pd.read_csv(INPUT_FILE)

print("Total mobility records:", len(df))
print("Total vehicles:", df["vehicle_id"].nunique())

# Store generated V2X communication pairs
v2x_records = []

# Process each simulation time
for time, group in df.groupby("time"):

    vehicles = group.to_dict("records")

    for i in range(len(vehicles)):

        v1 = vehicles[i]

        for j in range(i + 1, len(vehicles)):

            v2 = vehicles[j]

            # mobility.csv stores:
            # longitude = x
            # latitude  = y

            distance = haversine_distance(
                float(v1["latitude"]),
                float(v1["longitude"]),
                float(v2["latitude"]),
                float(v2["longitude"])
            )

            # Check whether vehicles are within V2V range
            if distance <= COMMUNICATION_RANGE:

                speed1 = float(v1["speed_mps"])
                speed2 = float(v2["speed_mps"])

                relative_speed = abs(speed1 - speed2)

                v2x_records.append([
                    time,
                    v1["vehicle_id"],
                    v2["vehicle_id"],
                    v1["vehicle_type"],
                    v2["vehicle_type"],
                    v1["latitude"],
                    v1["longitude"],
                    v2["latitude"],
                    v2["longitude"],
                    speed1,
                    speed2,
                    distance,
                    relative_speed
                ])


# Create DataFrame
v2x_df = pd.DataFrame(
    v2x_records,
    columns=[
        "time",
        "vehicle_1",
        "vehicle_2",
        "vehicle_1_type",
        "vehicle_2_type",
        "vehicle_1_latitude",
        "vehicle_1_longitude",
        "vehicle_2_latitude",
        "vehicle_2_longitude",
        "vehicle_1_speed",
        "vehicle_2_speed",
        "distance_m",
        "relative_speed"
    ]
)

# Save
v2x_df.to_csv(OUTPUT_FILE, index=False)

print()
print("======================================")
print("V2X DATASET CREATED SUCCESSFULLY")
print("======================================")
print("Communication range:", COMMUNICATION_RANGE, "meters")
print("V2X communication records:", len(v2x_df))
print("Output file:", OUTPUT_FILE)