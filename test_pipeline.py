import sys, torch
sys.path.insert(0, '.')
from environment.wireless_environment import WirelessEnvironment
from agents.multi_agent import MultiAgentSystem
from evaluation.baselines import RandomAllocation, GreedyAllocation, compute_metrics_from_states

device = torch.device('cpu')
env = WirelessEnvironment('data/raw/v2x_dataset.csv')
mas = MultiAgentSystem(device)
rand = RandomAllocation()
greedy = GreedyAllocation()

states = env.reset()
print("Vehicles:", list(states.keys()))

ai_actions, fused, attn = mas.step_actions(states)
rand_actions = rand.select_channels(states)
greedy_actions = greedy.select_channels(states)

print("AI actions:    ", ai_actions)
print("Random actions:", rand_actions)
print("Greedy actions:", greedy_actions)

m = compute_metrics_from_states(states, ai_actions)
print(f"AI Metrics - SINR:{m['mean_sinr_db']:.2f} dB  PDR:{m['mean_pdr']:.3f}  Tput:{m['mean_throughput_mbps']:.1f} Mbps")

next_states, rewards, done, info = env.step(ai_actions)
print("Rewards:", rewards)
print("Done:", done)

losses = mas.update(states, ai_actions, rewards, next_states)
print("Losses:", losses)
print()
print("=== Full Pipeline: OK ===")
