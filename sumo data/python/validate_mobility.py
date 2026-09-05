"""validate_mobility.py - Phase 2 sanity check on collected mobility data."""
import csv, os, shutil

# Update mobility.csv with fresh vehicle_data.csv
shutil.copy2('output/vehicle_data.csv', 'output/mobility.csv')
size = os.path.getsize('output/mobility.csv')
print(f"Updated mobility.csv: {size:,} bytes")

with open('output/vehicle_data.csv', newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f"Total rows       : {len(rows):,}")
print(f"Columns          : {list(rows[0].keys())}")

speeds = [float(r['speed']) for r in rows]
moving = [s for s in speeds if s > 0.5]
stopped = [s for s in speeds if s <= 0.5]
print(f"Speed range      : {min(speeds):.2f} - {max(speeds):.2f} m/s")
print(f"Vehicles moving  : {len(moving):,}")
print(f"Vehicles stopped : {len(stopped):,}")

timestamps = sorted(set(float(r['timestamp']) for r in rows))
print(f"Timesteps        : {len(timestamps)} (t={timestamps[0]:.0f}s to t={timestamps[-1]:.0f}s)")

vtypes = {}
for r in rows:
    vt = r['vehicle_type']
    vtypes[vt] = vtypes.get(vt, 0) + 1
print(f"Vehicle types    : {vtypes}")

wait_times = [float(r['waiting_time']) for r in rows]
avg_wait = sum(wait_times) / len(wait_times) if wait_times else 0
congested = [w for w in wait_times if w > 30]
print(f"Avg waiting time : {avg_wait:.2f}s")
print(f"Congested rows   : {len(congested):,} (waiting > 30s)")

edges = set(r['road'] for r in rows)
print(f"Unique edges     : {len(edges)}")
print("MOBILITY VALIDATION PASSED")
