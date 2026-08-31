"""
global_critic.py — Global Critic Network (used ONLY during training)
----------------------------------------------------------------------
The Global Critic observes the concatenation of ALL agents' state representations
plus the joint action vector. It outputs a Q-value / state-value that guides
multi-agent credit assignment.

This is the "Centralised Training" part of CTDE (Centralised Training /
Decentralised Execution).

During deployment the Global Critic is NOT used — the Local Critic takes over.
"""

import torch
import torch.nn as nn
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from training.config import ATTENTION_DIM, NUM_CHANNELS


class GlobalCritic(nn.Module):
    """
    Input: [global_state_dim]  = concatenation of all agents' fused representations
                                 + one-hot actions for all agents
    Output: scalar Q-value (or V-value)

    Because the number of agents (vehicles) varies per time step, we use a
    permutation-invariant mean-pooling approach so the critic handles any
    number of agents.

    Architecture:
        mean-pooled agent repr (ATTENTION_DIM)  + global action feat (NUM_CHANNELS)
            -> FC(256) -> GELU -> LayerNorm
            -> FC(128) -> GELU -> LayerNorm
            -> FC(64)  -> GELU
            -> FC(1)   -> Q-value
    """

    def __init__(self):
        super().__init__()
        in_dim = ATTENTION_DIM + NUM_CHANNELS   # mean-pool + action summary

        self.net = nn.Sequential(
            nn.Linear(in_dim, 256),
            nn.GELU(),
            nn.LayerNorm(256),
            nn.Linear(256, 128),
            nn.GELU(),
            nn.LayerNorm(128),
            nn.Linear(128, 64),
            nn.GELU(),
            nn.Linear(64, 1),
        )

    def forward(
        self,
        agent_reprs: torch.Tensor,    # (batch, num_agents, ATTENTION_DIM)
        joint_actions: torch.Tensor,  # (batch, num_agents)  long
    ) -> torch.Tensor:
        """
        Returns Q-value tensor of shape (batch, 1).

        agent_reprs   : stacked fused attention representations of all agents
        joint_actions : channel indices chosen by each agent
        """
        # Permutation-invariant aggregation
        global_feat = agent_reprs.mean(dim=1)   # (batch, ATTENTION_DIM)

        # Summarise joint action as channel-utilisation histogram
        B, num_agents = joint_actions.shape
        action_hist = torch.zeros(B, NUM_CHANNELS, device=joint_actions.device)
        for a_idx in range(num_agents):
            action_hist.scatter_add_(
                1,
                joint_actions[:, a_idx].unsqueeze(1),
                torch.ones(B, 1, device=joint_actions.device),
            )
        action_hist = action_hist / num_agents    # normalise to [0,1]

        x = torch.cat([global_feat, action_hist], dim=-1)
        return self.net(x)   # (batch, 1)


class GlobalCriticWithTarget(nn.Module):
    """
    Wraps GlobalCritic with a target network for stable TD updates.
    """

    def __init__(self, tau: float = 0.005):
        super().__init__()
        self.critic  = GlobalCritic()
        self.target  = GlobalCritic()
        self.tau     = tau
        # Initialise target = online
        self.target.load_state_dict(self.critic.state_dict())
        for p in self.target.parameters():
            p.requires_grad = False

    def forward(self, agent_reprs, joint_actions):
        return self.critic(agent_reprs, joint_actions)

    def target_forward(self, agent_reprs, joint_actions):
        with torch.no_grad():
            return self.target(agent_reprs, joint_actions)

    def soft_update(self):
        """Polyak averaging: θ_target <- τ·θ + (1-τ)·θ_target"""
        for tp, op in zip(self.target.parameters(), self.critic.parameters()):
            tp.data.copy_(self.tau * op.data + (1 - self.tau) * tp.data)
