"""
actor.py — MAPPO Actor (Policy) Network with Action Masking
------------------------------------------------------------
Each vehicle's agent has an Actor that:
  1. Receives the fused 4-head attention representation
  2. Applies ACTION MASKING to eliminate severely interfered/unavailable channels
  3. Outputs a valid probability distribution over viable spectrum channels
  4. Supports MAPPO PPO ratio & entropy evaluation for decentralized execution
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
    Maps fused attention representation -> masked channel probability distribution.

    Architecture:
        fused_repr (ATTENTION_DIM)
            -> FC(128) -> GELU -> LayerNorm -> Dropout
            -> FC(64)  -> GELU -> LayerNorm
            -> FC(NUM_CHANNELS)
            -> Action Masking (-1e9 to masked channels)
            -> Categorical Distribution / Softmax
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

    def forward(self, fused_repr: torch.Tensor, action_mask: torch.Tensor = None) -> torch.Tensor:
        """
        Args:
            fused_repr: (batch, ATTENTION_DIM)
            action_mask: (batch, NUM_CHANNELS) bool or 0/1 tensor. True/1 = available, False/0 = masked.
        Returns:
            logits: (batch, NUM_CHANNELS)
        """
        logits = self.net(fused_repr)
        if action_mask is not None:
            # Masked channels receive heavy penalty (-1e9) so softmax gives ~0 probability
            if action_mask.dtype != torch.bool:
                action_mask = action_mask.bool()
            # If all channels are masked for an agent (extreme contention), fall back to unmasked
            all_masked = (~action_mask).all(dim=-1, keepdim=True)
            safe_mask = torch.where(all_masked, torch.ones_like(action_mask), action_mask)
            logits = torch.where(safe_mask, logits, torch.tensor(-1e9, device=logits.device, dtype=logits.dtype))
        return logits

    def get_action(
        self,
        fused_repr: torch.Tensor,
        action_mask: torch.Tensor = None,
        deterministic: bool = False,
    ):
        """
        Sample or argmax a channel action respecting action mask.
        Returns:
            action     : (batch,) int64 tensor
            log_prob   : (batch,) tensor  — for MAPPO policy gradient
            entropy    : scalar tensor    — for entropy regularisation
        """
        logits = self.forward(fused_repr, action_mask)
        dist   = torch.distributions.Categorical(logits=logits)
        if deterministic:
            action = logits.argmax(dim=-1)
        else:
            action = dist.sample()
        log_prob = dist.log_prob(action)
        entropy  = dist.entropy().mean()
        return action, log_prob, entropy

    def evaluate_action(
        self,
        fused_repr: torch.Tensor,
        action: torch.Tensor,
        action_mask: torch.Tensor = None,
    ):
        """
        Evaluate log_prob and entropy of an action under current policy (used in MAPPO epoch updates).
        """
        logits   = self.forward(fused_repr, action_mask)
        dist     = torch.distributions.Categorical(logits=logits)
        log_prob = dist.log_prob(action)
        entropy  = dist.entropy().mean()
        return log_prob, entropy

    def log_prob_of(
        self,
        fused_repr: torch.Tensor,
        action: torch.Tensor,
        action_mask: torch.Tensor = None,
    ):
        """Compute log-probability of a given action."""
        return self.evaluate_action(fused_repr, action, action_mask)

    def action_probs(
        self,
        fused_repr: torch.Tensor,
        action_mask: torch.Tensor = None,
    ) -> np.ndarray:
        """Return masked channel probabilities as numpy array (for XAI & frontend)."""
        with torch.no_grad():
            logits = self.forward(fused_repr, action_mask)
            return F.softmax(logits, dim=-1).cpu().numpy()
