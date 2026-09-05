import traci
import sys

cmd = [
    r'C:\Program Files (x86)\Eclipse\Sumo\bin\sumo.exe',
    '-c', r'C:\Users\subha\OneDrive\Pictures\Desktop\major_project\sumo data\configs\scenario_low.sumocfg',
    '--step-length', '1.0'
]

print("Starting traci...")
traci.start(cmd)
print("Traci started!")
traci.close()
