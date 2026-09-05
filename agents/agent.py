"""
agent.py — Single Vehicle Agent (MAPPO with Action Masking & Local Critic)
-------------------------------------------------------------------------
Each vehicle (or RSU) is represented by one Agent instance.

The agent contains:
  - MultiStreamAttention  -> processes local observations (Spatial, Temporal, Frequency, Application)
  - Actor                 -> MAPPO policy with Action Masking over spectrum channels
  - LocalCritic           -> estimates local value V(s, a) (used at deployment for privacy)

MAPPO Features:
  - Action Masking: Excludes overloaded or severe-interference channels before action selection
  - Clipped PPO Objective: Prevents large destabilizing policy steps
  - Local Value Clipping: Stables value function learning
  - Privacy Preservation: Observation and action decisions occur on-device
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

# MAPPO Hyperparameters
PPO_CLIP_EPS = 0.2
VALUE_CLIP_EPS = 0.2
INTERFERENCE_MASK_THRESHOLD = 0.75  # Channels with > 75% interference are masked


class Agent(nn.Module):
    """
    A single vehicle MAPPO agent.
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
    def compute_action_mask(self, obs_np: np.ndarray, channel_states: list = None) -> torch.Tensor:
        """
        Creates an action mask tensor [1, NUM_CHANNELS] where:
        True (1) = Channel is viable
        False (0) = Channel is masked (severe interference > 0.75 or unavailable)
        """
        mask = torch.ones(1, NUM_CHANNELS, dtype=torch.bool, device=self.device)
        if channel_states is not None and len(channel_states) == NUM_CHANNELS:
            for i, ch in enumerate(channel_states):
                interf = getattr(ch, "interference", None)
                avail = getattr(ch, "available", True)
                if interf is None and isinstance(ch, dict):
                    interf = ch.get("interference", 0.0)
                    avail = ch.get("available", True)
                
                if (interf is not None and interf > INTERFERENCE_MASK_THRESHOLD) or not avail:
                    mask[0, i] = False
        else:
            # Fallback: extract frequency slice from obs vector
            # obs: [spatial(4) | temporal(4) | app(4) | freq(NUM_CHANNELS*3)]
            # freq per channel is [avail, interf, util]
            start_freq = 4 + 4 + 4
            if len(obs_np) >= start_freq + NUM_CHANNELS * 3:
                for i in range(NUM_CHANNELS):
                    ch_offset = start_freq + i * 3
                    avail = obs_np[ch_offset] > 0.5
                    interf = obs_np[ch_offset + 1]
                    if (interf > INTERFERENCE_MASK_THRESHOLD) or not avail:
                        mask[0, i] = False

        # Safety check: if all channels are masked, unmask best available channel
        if not mask.any():
            mask[0, :] = True
        return mask

    # ------------------------------------------------------------------
    def observe(self, obs_np: np.ndarray) -> tuple[torch.Tensor, dict]:
        """
        Process a raw observation vector into fused representation + attn_info.
        """
        obs_t = torch.tensor(obs_np, dtype=torch.float32, device=self.device).unsqueeze(0)
        s, t, a, f = MultiStreamAttention.split_observation(obs_t)
        fused, attn_info = self.attention(s, t, a, f)
        return fused, attn_info

    # ------------------------------------------------------------------
    def act(
        self,
        obs_np: np.ndarray,
        channel_states: list = None,
        deterministic: bool = False,
    ) -> tuple[int, torch.Tensor, dict, float, torch.Tensor]:
        """
        Given observation, return:
            action      : int — channel index
            fused_repr  : tensor
            attn_info   : attention weights dict
            log_prob    : float — log-prob of taken action
            action_mask : tensor — mask used
        """
        action_mask = self.compute_action_mask(obs_np, channel_states)

        if deterministic:
            with torch.no_grad():
                fused, attn_info = self.observe(obs_np)
                action_t, log_prob_t, _ = self.actor.get_action(
                    fused, action_mask=action_mask, deterministic=True
                )
            return int(action_t.item()), fused.detach(), attn_info, float(log_prob_t.item()), action_mask

        fused, attn_info = self.observe(obs_np)
        action_t, log_prob_t, _ = self.actor.get_action(
            fused, action_mask=action_mask, deterministic=False
        )
        return int(action_t.item()), fused.detach(), attn_info, float(log_prob_t.item()), action_mask

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
        old_value: float = None,
    ) -> float:
        """
        One MAPPO PPO-clipped gradient step on the local critic.
        """
        self.critic_opt.zero_grad()
        action_t = torch.tensor([action], dtype=torch.long, device=self.device)
        target_t = torch.tensor([[target_value]], dtype=torch.float32, device=self.device)
        v_pred   = self.local_critic(fused_repr, action_t)

        if old_value is not None:
            # PPO Value Clipping
            v_old_t = torch.tensor([[old_value]], dtype=torch.float32, device=self.device)
            v_clipped = v_old_t + torch.clamp(v_pred - v_old_t, -VALUE_CLIP_EPS, VALUE_CLIP_EPS)
            loss_unclipped = (v_pred - target_t) ** 2
            loss_clipped = (v_clipped - target_t) ** 2
            loss = 0.5 * torch.max(loss_unclipped, loss_clipped).mean()
        else:
            loss = F.mse_loss(v_pred, target_t)

        loss.backward()
        nn.utils.clip_grad_norm_(self.local_critic.parameters(), 1.0)
        self.critic_opt.step()
        self.local_critic.soft_update()
        return float(loss.item())

    # ------------------------------------------------------------------
    def update_actor_mappo(
        self,
        obs_np: np.ndarray,
        action: int,
        advantage: float,
        old_log_prob: float,
        action_mask: torch.Tensor = None,
    ) -> float:
        """
        MAPPO Clipped Surrogate Policy Gradient Update:
        r_t(θ) = π_θ(a_t | s_t) / π_θ_old(a_t | s_t)
        L_CLIP(θ) = E[ min(r_t(θ) A_t, clip(r_t(θ), 1-ε, 1+ε) A_t) ] + c_2 S[π_θ]
        """
        self.actor_opt.zero_grad()
        obs_t = torch.tensor(obs_np, dtype=torch.float32, device=self.device).unsqueeze(0)
        s, t, a, f = MultiStreamAttention.split_observation(obs_t)
        fused, _   = self.attention(s, t, a, f)

        action_t = torch.tensor([action], dtype=torch.long, device=self.device)
        mask = action_mask if action_mask is not None else self.compute_action_mask(obs_np)
        new_log_prob, entropy = self.actor.evaluate_action(fused, action_t, action_mask=mask)

        # Ratio r_t(θ)
        ratio = torch.exp(new_log_prob - old_log_prob)
        adv_t = torch.tensor([advantage], dtype=torch.float32, device=self.device)

        # Clipped surrogate objective
        surr1 = ratio * adv_t
        surr2 = torch.clamp(ratio, 1.0 - PPO_CLIP_EPS, 1.0 + PPO_CLIP_EPS) * adv_t
        policy_loss = -torch.min(surr1, surr2).mean()

        entropy_loss = -ENTROPY_COEF * entropy
        loss = policy_loss + entropy_loss

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
        self.attention.load_state_dict(ckpt["attention"], strict=False)
        self.actor.load_state_dict(ckpt["actor"])
        self.local_critic.load_state_dict(ckpt["local_critic"])
