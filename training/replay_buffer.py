"""
replay_buffer.py — Experience Replay Buffer
--------------------------------------------
Stores (obs, action, reward, next_obs, done) transitions for off-policy learning.

Supports per-vehicle storage so that each agent can sample its own batch.
"""

import numpy as np
import random
from collections import deque
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from training.config import REPLAY_BUFFER_CAP, BATCH_SIZE


class ReplayBuffer:
    """
    Simple ring-buffer replay memory.

    Each entry:
        obs      : np.ndarray   (obs_dim,)
        action   : int
        reward   : float
        next_obs : np.ndarray   (obs_dim,)
        done     : bool
    """

    def __init__(self, capacity: int = REPLAY_BUFFER_CAP):
        self.buffer   = deque(maxlen=capacity)
        self.capacity = capacity

    def push(self, obs, action, reward, next_obs, done):
        self.buffer.append((
            np.array(obs,      dtype=np.float32),
            int(action),
            float(reward),
            np.array(next_obs, dtype=np.float32),
            bool(done),
        ))

    def sample(self, batch_size: int = BATCH_SIZE) -> tuple:
        batch = random.sample(self.buffer, min(batch_size, len(self.buffer)))
        obs, actions, rewards, next_obs, dones = zip(*batch)
        return (
            np.stack(obs),
            np.array(actions,  dtype=np.int64),
            np.array(rewards,  dtype=np.float32),
            np.stack(next_obs),
            np.array(dones,    dtype=np.float32),
        )

    def __len__(self):
        return len(self.buffer)

    def is_ready(self, batch_size: int = BATCH_SIZE) -> bool:
        return len(self) >= batch_size


class PerAgentReplayBuffer:
    """
    Separate replay buffer per agent (vehicle_id -> ReplayBuffer).
    """

    def __init__(self, capacity: int = REPLAY_BUFFER_CAP):
        self.capacity = capacity
        self.buffers: dict[str, ReplayBuffer] = {}

    def push(self, vehicle_id: str, obs, action, reward, next_obs, done):
        if vehicle_id not in self.buffers:
            self.buffers[vehicle_id] = ReplayBuffer(self.capacity)
        self.buffers[vehicle_id].push(obs, action, reward, next_obs, done)

    def sample(self, vehicle_id: str, batch_size: int = BATCH_SIZE):
        if vehicle_id not in self.buffers:
            return None
        if not self.buffers[vehicle_id].is_ready(batch_size):
            return None
        return self.buffers[vehicle_id].sample(batch_size)

    def total_size(self) -> int:
        return sum(len(b) for b in self.buffers.values())
