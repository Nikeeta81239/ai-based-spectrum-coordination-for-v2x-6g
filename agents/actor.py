"""
actor.py — Actor (Policy) Network
----------------------------------
Each vehicle's agent has an Actor that:
  1. Receives the fused attention representation
  2. Outputs a probability distribution over spectrum channels
  3. Samples an action (channel selection) during training
  4. Takes the greedy action during evaluation

During deployment the Actor uses ONLY local information (privacy-aware).
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from training.config import ATTENTION_DIM, NUM_CHANNELS


class Actor(nn.Module):
    """
    Maps fused attention representation -> channel probability distribution.

    Architecture:
        fused_repr (ATTENTION_DIM)
            -> FC(128) -> GELU -> LayerNorm -> Dropout
            -> FC(64)  -> GELU -> LayerNorm
            -> FC(NUM_CHANNELS) -> Softmax
    """

    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(ATTENTION_DIM, 128),
            nn.GELU(),
            nn.LayerNorm(128),
            nn.Dropout(0.1),
            nn.Linear(128, 64),
            nn.GELU(),
            nn.LayerNorm(64),
            nn.Linear(64, NUM_CHANNELS),
        )

    def forward(self, fused_repr: torch.Tensor) -> torch.Tensor:
        """
        Args:
            fused_repr: (batch, ATTENTION_DIM)
        Returns:
            logits: (batch, NUM_CHANNELS)  — raw logits (use softmax externally)
        """
        return self.net(fused_repr)

    def get_action(self, fused_repr: torch.Tensor, deterministic: bool = False):
        """
        Sample or argmax a channel action.
        Returns:
            action     : (batch,) int64 tensor
            log_prob   : (batch,) tensor  — for policy gradient
            entropy    : scalar tensor    — for entropy regularisation
        """
        logits = self.forward(fused_repr)
        dist   = torch.distributions.Categorical(logits=logits)
        if deterministic:
            action = logits.argmax(dim=-1)
        else:
            action = dist.sample()
        log_prob = dist.log_prob(action)
        entropy  = dist.entropy().mean()
        return action, log_prob, entropy

    def log_prob_of(self, fused_repr: torch.Tensor, action: torch.Tensor):
        """Compute log-probability of a given action (used for off-policy updates)."""
        logits   = self.forward(fused_repr)
        dist     = torch.distributions.Categorical(logits=logits)
        log_prob = dist.log_prob(action)
        entropy  = dist.entropy().mean()
        return log_prob, entropy

    def action_probs(self, fused_repr: torch.Tensor) -> np.ndarray:
        """Return channel probabilities as numpy array (for XAI)."""
        with torch.no_grad():
            logits = self.forward(fused_repr)
            return F.softmax(logits, dim=-1).cpu().numpy()
