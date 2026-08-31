"""
agent.py — Single Vehicle Agent
---------------------------------
Each vehicle (or RSU) is represented by one Agent instance.

The agent contains:
  - MultiStreamAttention  -> processes local observations
  - Actor                 -> selects a spectrum channel
  - LocalCritic           -> estimates local value (used at deployment)

During training the GlobalCritic (in multi_agent.py) supervises all agents
jointly. Each agent's Actor is updated based on the Global Critic's feedback
plus the entropy bonus.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from attention.multi_head_attention import MultiStreamAttention
from agents.actor                   import Actor
from agents.local_critic            import LocalCriticWithTarget
from training.config                import (
    ATTENTION_DIM, NUM_CHANNELS, LEARNING_RATE_ACTOR,
    LEARNING_RATE_CRITIC, ENTROPY_COEF
)


class Agent(nn.Module):
    """
    A single vehicle agent.
    """

    def __init__(self, agent_id: str, device: torch.device):
        super().__init__()
        self.agent_id = agent_id
        self.device   = device

        # Network components
        self.attention    = MultiStreamAttention().to(device)
        self.actor        = Actor().to(device)
        self.local_critic = LocalCriticWithTarget().to(device)

        # Optimisers
        actor_params  = list(self.attention.parameters()) + list(self.actor.parameters())
        self.actor_opt  = torch.optim.Adam(actor_params,        lr=LEARNING_RATE_ACTOR)
        self.critic_opt = torch.optim.Adam(self.local_critic.parameters(),
                                           lr=LEARNING_RATE_CRITIC)

        # Step counter
        self.update_count = 0

    # ------------------------------------------------------------------
    def observe(self, obs_np: np.ndarray) -> tuple[torch.Tensor, dict]:
        """
        Process a raw observation vector into fused representation + attn_info.

        Returns:
            fused_repr : (1, ATTENTION_DIM) tensor on self.device
            attn_info  : dict with attention weights (for XAI)
        """
        obs_t = torch.tensor(obs_np, dtype=torch.float32, device=self.device).unsqueeze(0)
        s, t, a, f = MultiStreamAttention.split_observation(obs_t)
        fused, attn_info = self.attention(s, t, a, f)
        return fused, attn_info

    # ------------------------------------------------------------------
    def act(self, obs_np: np.ndarray, deterministic: bool = False) -> tuple[int, torch.Tensor, dict]:
        """
        Given an observation, return a channel action.

        Returns:
            action      : int  — channel index
            fused_repr  : tensor (kept for critic update)
            attn_info   : attention weights dict
        """
        if deterministic:
            with torch.no_grad():
                fused, attn_info = self.observe(obs_np)
                action_t, _, _ = self.actor.get_action(fused, deterministic=True)
            return int(action_t.item()), fused.detach(), attn_info

        fused, attn_info = self.observe(obs_np)
        action_t, _, _ = self.actor.get_action(fused, deterministic=False)
        return int(action_t.item()), fused.detach(), attn_info

    # ------------------------------------------------------------------
    def local_critic_value(self, fused_repr: torch.Tensor, action: int) -> float:
        action_t = torch.tensor([action], dtype=torch.long, device=self.device)
        val      = self.local_critic(fused_repr, action_t)
        return float(val.item())

    # ------------------------------------------------------------------
    def update_local_critic(
        self,
        fused_repr: torch.Tensor,
        action: int,
        target_value: float,
    ) -> float:
        """
        One gradient step on the local critic.
        target_value = global_reward + gamma * local_next_value  (TD target)
        """
        self.critic_opt.zero_grad()
        action_t = torch.tensor([action], dtype=torch.long, device=self.device)
        target_t = torch.tensor([[target_value]], dtype=torch.float32, device=self.device)
        v        = self.local_critic(fused_repr, action_t)
        loss     = F.mse_loss(v, target_t)
        loss.backward()
        nn.utils.clip_grad_norm_(self.local_critic.parameters(), 1.0)
        self.critic_opt.step()
        self.local_critic.soft_update()
        return float(loss.item())

    # ------------------------------------------------------------------
    def update_actor(
        self,
        obs_np: np.ndarray,
        action: int,
        advantage: float,
    ) -> float:
        """
        Policy gradient update using the advantage from the Global Critic.
        Loss = -log_prob * advantage - entropy_coef * entropy
        """
        self.actor_opt.zero_grad()
        obs_t = torch.tensor(obs_np, dtype=torch.float32, device=self.device).unsqueeze(0)
        s, t, a, f = MultiStreamAttention.split_observation(obs_t)
        fused, _   = self.attention(s, t, a, f)

        action_t   = torch.tensor([action], dtype=torch.long, device=self.device)
        log_prob, entropy = self.actor.log_prob_of(fused, action_t)
        adv_t      = torch.tensor(advantage, dtype=torch.float32, device=self.device)

        policy_loss = -(log_prob * adv_t).mean()
        entropy_loss = -ENTROPY_COEF * entropy
        loss         = policy_loss + entropy_loss

        loss.backward()
        nn.utils.clip_grad_norm_(
            list(self.attention.parameters()) + list(self.actor.parameters()), 1.0
        )
        self.actor_opt.step()
        self.update_count += 1
        return float(loss.item())

    # ------------------------------------------------------------------
    def get_attention_summary(self, attn_info: dict) -> dict:
        """Summarise attention weights for XAI (mean across heads)."""
        summary = {}
        for stream, w in attn_info.items():
            summary[stream] = float(np.asarray(w).mean()) if w is not None else 0.0
        return summary

    def save(self, path: str):
        torch.save({
            "attention":    self.attention.state_dict(),
            "actor":        self.actor.state_dict(),
            "local_critic": self.local_critic.state_dict(),
        }, path)

    def load(self, path: str):
        ckpt = torch.load(path, map_location=self.device)
        # Older checkpoints predate stream-level attention gating.  Loading
        # non-strictly preserves their trained encoder weights while allowing
        # newly trained checkpoints to include the gate.
        self.attention.load_state_dict(ckpt["attention"], strict=False)
        self.actor.load_state_dict(ckpt["actor"])
        self.local_critic.load_state_dict(ckpt["local_critic"])
