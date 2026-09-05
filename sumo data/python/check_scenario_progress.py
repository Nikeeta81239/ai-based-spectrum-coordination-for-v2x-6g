"""check_scenario_progress.py - check scenario generation status"""
import os, glob

routes  = sorted(glob.glob('routes/scenario_*.rou.xml'))
configs = sorted(glob.glob('configs/scenario_*.sumocfg'))
tmps    = glob.glob('routes/_tmp_*.xml')

ALL_SCENARIOS = ['LOW','MEDIUM','HIGH','VERY_HIGH','MORNING_PEAK','MIDDAY','EVENING_PEAK','NIGHT']

print("=== SCENARIO GENERATION STATUS ===")
total_kb = 0
done_names = []
for f in routes:
    kb = os.path.getsize(f) / 1024
    total_kb += kb
    name = os.path.basename(f).replace('scenario_','').replace('.rou.xml','').upper()
    done_names.append(name)
    print(f"  [DONE] {name:<15} {kb:>7.0f} KB   -> {f}")

missing = [s for s in ALL_SCENARIOS if s not in done_names]
for s in missing:
    active = any(s in t for t in tmps)
    tag = "[ACTIVE]" if active else "[WAITING]"
    print(f"  {tag} {s}")

print(f"\nRoute files  : {len(routes)}/8")
print(f"Config files : {len(configs)}/8")
print(f"Total size   : {total_kb/1024:.1f} MB")

if tmps:
    print(f"Active temp  : {[os.path.basename(t) for t in tmps]}")
elif len(routes) == 8:
    print("Status       : ALL COMPLETE")
else:
    print("Status       : Running (between duarouter steps)")
