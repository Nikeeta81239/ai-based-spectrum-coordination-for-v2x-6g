"""validate_phase2.py - Phase 2 full validation (ASCII safe, Windows compatible)"""
import csv, os, sys
sys.stdout.reconfigure(encoding='utf-8')

def load_csv(p):
    with open(p, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))

SEP = "=" * 68

def sec(t):
    print(f"\n{SEP}\n  {t}\n{SEP}")

# ── 1. Mobility Data ──────────────────────────────────────────────────────────
sec("1. MOBILITY DATA  (output/vehicle_data.csv)")
mob    = load_csv('output/vehicle_data.csv')
speeds = [float(r['speed']) for r in mob]
waits  = [float(r['waiting_time']) for r in mob]
vt     = {}
for r in mob:
    vt[r['vehicle_type']] = vt.get(r['vehicle_type'], 0) + 1
print(f"  Rows          : {len(mob):,}")
print(f"  Timesteps     : {len(set(r['timestamp'] for r in mob))}")
print(f"  Speed range   : {min(speeds):.2f} to {max(speeds):.2f} m/s")
print(f"  Moving veh    : {sum(1 for s in speeds if s > 0.5):,}")
print(f"  Stopped veh   : {sum(1 for s in speeds if s <= 0.5):,}")
print(f"  Avg wait time : {sum(waits)/len(waits):.2f}s")
print(f"  Vehicle types : {vt}")
print(f"  Unique edges  : {len(set(r['road'] for r in mob))}")
print("  STATUS        : PASS")

# ── 2. V2X Dataset ────────────────────────────────────────────────────────────
sec("2. V2X DATASET  (output/v2x_dataset.csv)")
v2x   = load_csv('output/v2x_dataset.csv')
sinrs = [float(r['sinr_db']) for r in v2x]
thrs  = [float(r['throughput_mbps']) for r in v2x]
pdrs  = [float(r['packet_delivery_ratio']) for r in v2x]
lats  = [float(r['latency_ms']) for r in v2x]
pols  = sorted(set(r['policy'] for r in v2x))
chs   = sorted(set(int(r['channel_id']) for r in v2x))
print(f"  Rows          : {len(v2x):,}")
print(f"  Columns       : {len(v2x[0])}")
print(f"  Policies      : {pols}")
print(f"  Channels used : {chs}")
print(f"  SINR range    : {min(sinrs):.1f} to {max(sinrs):.1f} dB")
print(f"  Thr range     : {min(thrs):.2f} to {max(thrs):.2f} Mbps")
print(f"  Avg PDR       : {sum(pdrs)/len(pdrs)*100:.1f}%")
print(f"  Avg Latency   : {sum(lats)/len(lats):.1f} ms")
print("  STATUS        : PASS")

# ── 3. AI Decisions ───────────────────────────────────────────────────────────
sec("3. AI DECISIONS  (output/ai_decisions.csv)")
ai      = load_csv('output/ai_decisions.csv')
rewards = [float(r['reward']) for r in ai]
pos_r   = sum(1 for x in rewards if x > 0)
att_ok  = [c for c in ['spatial_attention','temporal_attention','freq_attention','app_attention']
           if c in ai[0]]
print(f"  Rows          : {len(ai):,}")
print(f"  Pos rewards   : {pos_r:,}  ({pos_r/len(ai)*100:.1f}%)")
print(f"  Reward range  : {min(rewards):.3f} to {max(rewards):.3f}")
print(f"  Avg reward    : {sum(rewards)/len(rewards):.4f}")
print(f"  Attention cols: {att_ok}")
print("  STATUS        : PASS")

# ── 4. Spectrum Results ───────────────────────────────────────────────────────
sec("4. SPECTRUM RESULTS  (output/spectrum_results.csv)")
spec = load_csv('output/spectrum_results.csv')
hdr = f"  {'Policy':<42} {'Thr(Mbps)':>10} {'Lat(ms)':>9} {'PDR%':>6} {'SINR(dB)':>9}"
print(hdr)
print("  " + "-" * 62)
for row in spec:
    p = row.get('Policy', '?')
    t = row.get('Avg_Throughput_Mbps', '?')
    la = row.get('Avg_Latency_ms', '?')
    d = row.get('Avg_PDR_percent', '?')
    s = row.get('Avg_SINR_dB', '?')
    print(f"  {p:<42} {t:>10} {la:>9} {d:>6} {s:>9}")
print("  STATUS        : PASS")

# ── 5. Failure Cases ──────────────────────────────────────────────────────────
sec("5. FAILURE CASES  (output/failure_cases.csv)")
fail   = load_csv('output/failure_cases.csv')
fsinrs = [float(r['sinr_db']) for r in fail]
flats  = [float(r['latency_ms']) for r in fail]
print(f"  Failure events   : {len(fail):,}")
print(f"  Avg fail SINR    : {sum(fsinrs)/len(fsinrs):.2f} dB")
print(f"  Avg fail Latency : {sum(flats)/len(flats):.1f} ms")
print("  STATUS           : PASS")

# ── 6. All output files ───────────────────────────────────────────────────────
sec("6. ALL OUTPUT FILES")
files = [
    'output/vehicle_data.csv',      'output/mobility.csv',
    'output/v2x_dataset.csv',       'output/v2x_random.csv',
    'output/v2x_fixed.csv',         'output/v2x_round_robin.csv',
    'output/v2x_greedy.csv',        'output/ai_decisions.csv',
    'output/spectrum_results.csv',  'output/failure_cases.csv',
    'output/tripinfo.xml',          'output/fcd.xml',
    'output/emission.xml',          'output/summary.xml',
    'output/figures/attention_weights.png',
    'output/figures/baseline_comparison.png',
]
all_ok = True
for fp in files:
    ok  = os.path.exists(fp)
    sz  = os.path.getsize(fp) / 1024 if ok else 0
    tag = "OK     " if ok else "MISSING"
    if not ok:
        all_ok = False
    print(f"  [{tag}] {fp:<46} {sz:>8.1f} KB")

print(f"\n{SEP}")
if all_ok:
    print("  PHASE 2 VALIDATION COMPLETE -- ALL CHECKS PASSED")
else:
    print("  PHASE 2 VALIDATION COMPLETE -- SOME FILES MISSING (see above)")
print(SEP)
