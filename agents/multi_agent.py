"""
multi_agent.py — Multi-Agent MAPPO Controller
----------------------------------------------
Manages the decentralized pool of vehicle MAPPO agents and the shared Global Critic.

Responsibilities:
  1. Dynamically create/destroy agents as vehicles enter/leave SUMO / environment
  2. Collect joint actions with Action Masking and old log-probabilities
  3. Execute MAPPO policy gradient updates with PPO clipped objective
  4. Perform Local-Critic value updates with PPO value clipping
  5. CTDE (Centralized Training with Decentralized Execution & Local Critic)
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import sys, os
import logging
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agents.agent          import Agent
from agents.global_critic  import GlobalCriticWithTarget
from training.config       import (
    ATTENTION_DIM, NUM_CHANNELS, LEARNING_RATE_CRITIC, GAMMA, BATCH_SIZE
)

logger = logging.getLogger(__name__)


class MultiAgentSystem:
    """
    Central coordinator for decentralized MAPPO vehicle agents.
    """

    def __init__(self, device: torch.device):
        self.device      = device
        self.agents: dict[str, Agent] = {}

        self.global_critic = GlobalCriticWithTarget().to(device)
        self.gc_opt        = torch.optim.Adam(
            self.global_critic.parameters(), lr=LEARNING_RATE_CRITIC
        )

        # Rollout caching for MAPPO updates
        self._last_fused:       dict[str, torch.Tensor] = {}
        self._last_actions:     dict[str, int] = {}
        self._last_obs:         dict[str, np.ndarray] = {}
        self._last_log_probs:   dict[str, float] = {}
        self._last_masks:       dict[str, torch.Tensor] = {}
        self._last_values:      dict[str, float] = {}

        self._checkpoint_dir: str | None = None

    # ------------------------------------------------------------------
    def _ensure_agents(self, vehicle_ids: list[str]):
        """Create new agents for vehicles that just appeared."""
        for vid in vehicle_ids:
            if vid not in self.agents:
                agent = Agent(vid, self.device)
                if self._checkpoint_dir:
                    checkpoint = os.path.join(self._checkpoint_dir, f"agent_{vid.replace('/', '_').replace('.', '_')}.pt")
                    if os.path.exists(checkpoint):
                        try:
                            agent.load(checkpoint)
                            logger.info("Loaded local policy checkpoint for %s", vid)
                        except Exception as exc:
                            logger.warning("Could not load local policy for %s: %s", vid, exc)
                self.agents[vid] = agent

    def set_checkpoint_dir(self, checkpoint_dir: str):
        """Configure per-vehicle actor/local-critic checkpoints for inference."""
        self._checkpoint_dir = checkpoint_dir if os.path.isdir(checkpoint_dir) else None

    # ------------------------------------------------------------------
    def step_actions(
        self,
        states: dict,   # {vehicle_id -> VehicleWirelessState or dict}
        deterministic: bool = False,
    ) -> tuple[dict, dict, dict]:
        """
        Get channel actions for all vehicles with Action Masking.

        Returns:
            actions      : {vehicle_id -> channel_int}
            fused_reprs  : {vehicle_id -> tensor}
            attn_infos   : {vehicle_id -> dict}
        """
        self._ensure_agents(list(states.keys()))
        actions, fused_reprs, attn_infos = {}, {}, {}
        log_probs, masks, values = {}, {}, {}

        for vid, vs in states.items():
            if deterministic:
                self.agents[vid].eval()
            else:
                self.agents[vid].train()

            # Handle both VehicleWirelessState objects and dicts
            obs_np = vs.get_full_observation() if hasattr(vs, "get_full_observation") else vs.get("observation", np.zeros(26))
            ch_states = getattr(vs, "channel_states", None)

            action, fused, attn, log_prob, mask = self.agents[vid].act(
                obs_np, channel_states=ch_states, deterministic=deterministic
            )
            val = self.agents[vid].local_critic_value(fused, action)

            actions[vid]     = action
            fused_reprs[vid] = fused
            attn_infos[vid]  = attn
            log_probs[vid]   = log_prob
            masks[vid]       = mask
            values[vid]      = val

        self._last_fused     = fused_reprs
        self._last_actions   = actions
        self._last_log_probs = log_probs
        self._last_masks     = masks
        self._last_values    = values
        self._last_obs       = {
            vid: (vs.get_full_observation() if hasattr(vs, "get_full_observation") else vs.get("observation", np.zeros(26)))
            for vid, vs in states.items()
        }
        return actions, fused_reprs, attn_infos

    # ------------------------------------------------------------------
    def update(
        self,
        states:      dict,
        actions:     dict,
        rewards:     dict,
        next_states: dict,
    ) -> dict:
        """
        One MAPPO PPO update step for all agents + critics.

        Returns:
            metrics: dict with losses and mean reward
        """
        vehicle_ids = list(states.keys())
        if len(vehicle_ids) < 2:
            return {}

        # -- 1. Build joint tensors for Global Critic --
        fused_list  = [self._last_fused.get(vid, self._zero_repr()) for vid in vehicle_ids]
        action_list = [self._last_actions.get(vid, 0)               for vid in vehicle_ids]

        reprs_t  = torch.stack(fused_list, dim=1)        # (1, N, ATTENTION_DIM)
        action_t = torch.tensor([action_list], dtype=torch.long, device=self.device)

        # -- 2. Global Critic value --
        q_val    = self.global_critic(reprs_t, action_t)        # (1, 1)
        mean_rw  = np.mean(list(rewards.values()))

        # -- 3. Compute next-state global value for TD target --
        with torch.no_grad():
            next_fused_list = []
            next_action_list = []
            for vid in vehicle_ids:
                if vid in next_states:
                    n_vs = next_states[vid]
                    obs_np = n_vs.get_full_observation() if hasattr(n_vs, "get_full_observation") else n_vs.get("observation", np.zeros(26))
                    ch_states = getattr(n_vs, "channel_states", None)
                    act, fused, _, _, _ = self.agents[vid].act(obs_np, channel_states=ch_states, deterministic=True)
                    next_fused_list.append(fused)
                    next_action_list.append(act)
                else:
                    next_fused_list.append(self._zero_repr())
                    next_action_list.append(0)

            next_reprs_t  = torch.stack(next_fused_list, dim=1)
            next_action_t = torch.tensor([next_action_list], dtype=torch.long, device=self.device)
            q_next        = self.global_critic.target_forward(next_reprs_t, next_action_t)
            td_target     = mean_rw + GAMMA * q_next.item()

        # -- 4. Update Global Critic --
        self.gc_opt.zero_grad()
        td_target_t = torch.tensor([[td_target]], dtype=torch.float32, device=self.device)
        gc_loss     = F.mse_loss(q_val, td_target_t)
        gc_loss.backward()
        nn.utils.clip_grad_norm_(self.global_critic.parameters(), 1.0)
        self.gc_opt.step()
        self.global_critic.soft_update()

        # -- 5. Compute advantages & update each MAPPO agent --
        actor_losses  = []
        critic_losses = []

        for vid in vehicle_ids:
            if vid not in self.agents:
                continue
            agent    = self.agents[vid]
            obs_np   = self._last_obs.get(vid)
            act      = actions.get(vid, 0)
            rw       = rewards.get(vid, 0.0)
            fused    = self._last_fused.get(vid, self._zero_repr())
            old_logp = self._last_log_probs.get(vid, 0.0)
            old_val  = self._last_values.get(vid, 0.0)
            mask     = self._last_masks.get(vid, None)

            # Local next-value for GAE/TD target
            if vid in next_states:
                n_vs = next_states[vid]
                next_obs = n_vs.get_full_observation() if hasattr(n_vs, "get_full_observation") else n_vs.get("observation", np.zeros(26))
                _, next_fused, _, _, _ = agent.act(next_obs, deterministic=True)
            else:
                next_fused = self._zero_repr()

            next_action_t_local = torch.tensor([0], dtype=torch.long, device=self.device)
            with torch.no_grad():
                next_val = agent.local_critic.target_forward(next_fused, next_action_t_local)
            td_local = rw + GAMMA * float(next_val.item())

            # Update local critic with PPO value clipping
            cl = agent.update_local_critic(fused, act, td_local, old_value=old_val)
            critic_losses.append(cl)

            # Advantage = TD target − V(s, a)
            act_t = torch.tensor([act], dtype=torch.long, device=self.device)
            with torch.no_grad():
                v_s = agent.local_critic(fused, act_t)
            advantage = td_local - float(v_s.item())

            # Update MAPPO actor with clipped surrogate objective & action masking
            if obs_np is not None:
                al = agent.update_actor_mappo(
                    obs_np=obs_np,
                    action=act,
                    advantage=advantage,
                    old_log_prob=old_logp,
                    action_mask=mask,
                )
                actor_losses.append(al)

        return {
            "global_critic_loss": float(gc_loss.item()),
            "actor_loss":         float(np.mean(actor_losses))  if actor_losses  else 0.0,
            "critic_loss":        float(np.mean(critic_losses)) if critic_losses else 0.0,
            "mean_reward":        float(mean_rw),
        }

    # ------------------------------------------------------------------
    def _zero_repr(self) -> torch.Tensor:
        return torch.zeros(1, ATTENTION_DIM, device=self.device)

    # ------------------------------------------------------------------
    def save_all(self, save_dir: str):
        os.makedirs(save_dir, exist_ok=True)
        for vid, agent in self.agents.items():
            safe_name = vid.replace("/", "_").replace(".", "_")
            agent.save(os.path.join(save_dir, f"agent_{safe_name}.pt"))
        torch.save(self.global_critic.state_dict(),
                   os.path.join(save_dir, "global_critic.pt"))
        print(f"[MultiAgent] Saved {len(self.agents)} MAPPO agents + global critic -> {save_dir}")

    def load_global_critic(self, path: str):
        self.global_critic.load_state_dict(torch.load(path, map_location=self.device))
