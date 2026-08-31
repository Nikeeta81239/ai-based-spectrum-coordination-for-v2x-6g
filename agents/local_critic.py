"""
local_critic.py — Local Critic Network (used during DEPLOYMENT)
----------------------------------------------------------------
The Local Critic uses ONLY local vehicle information to estimate a value
function. This enables privacy-aware deployment: each vehicle makes decisions
without broadcasting its full state to the network.

Input:
    fused_repr from the MultiStreamAttention (local vehicle info only)

Output:
    V(s) — state value estimate (scalar)
"""

import torch
import torch.nn as nn
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from training.config import ATTENTION_DIM, NUM_CHANNELS


class LocalCritic(nn.Module):
    """
    Maps local fused representation -> value estimate.

    Architecture:
        fused_repr (ATTENTION_DIM) + selected_channel (NUM_CHANNELS one-hot)
            -> FC(128) -> GELU -> LayerNorm
            -> FC(64)  -> GELU
            -> FC(1)   -> V(s)
    """

    def __init__(self):
        super().__init__()
        in_dim = ATTENTION_DIM + NUM_CHANNELS

        self.net = nn.Sequential(
            nn.Linear(in_dim, 128),
            nn.GELU(),
            nn.LayerNorm(128),
            nn.Dropout(0.1),
            nn.Linear(128, 64),
            nn.GELU(),
            nn.Linear(64, 1),
        )

    def forward(
        self,
        fused_repr: torch.Tensor,    # (batch, ATTENTION_DIM)
        action: torch.Tensor,        # (batch,)  long — channel index
    ) -> torch.Tensor:
        """
        Returns V(s, a) — local value estimate, shape (batch, 1).
        """
        B = fused_repr.size(0)
        # One-hot encode the selected channel
        action_oh = torch.zeros(B, NUM_CHANNELS, device=fused_repr.device)
        action_oh.scatter_(1, action.unsqueeze(1), 1.0)

        x = torch.cat([fused_repr, action_oh], dim=-1)
        return self.net(x)


class LocalCriticWithTarget(nn.Module):
    """
    Local Critic with target network for stable bootstrapping.
    """

    def __init__(self, tau: float = 0.005):
        super().__init__()
        self.critic = LocalCritic()
        self.target = LocalCritic()
        self.tau    = tau
        self.target.load_state_dict(self.critic.state_dict())
        for p in self.target.parameters():
            p.requires_grad = False

    def forward(self, fused_repr, action):
        return self.critic(fused_repr, action)

    def target_forward(self, fused_repr, action):
        with torch.no_grad():
            return self.target(fused_repr, action)

    def soft_update(self):
        for tp, op in zip(self.target.parameters(), self.critic.parameters()):
            tp.data.copy_(self.tau * op.data + (1 - self.tau) * tp.data)
