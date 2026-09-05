"""
curriculum.py — Curriculum Learning Manager for 6G V2X Spectrum Coordination
=============================================================================
Manages progressive difficulty scaling across 5 curriculum stages:
  Stage 1: 20 vehicles   (Density: 1.0x) — baseline channel exploration
  Stage 2: 50 vehicles   (Density: 1.5x) — contention introduction
  Stage 3: 100 vehicles  (Density: 2.5x) — high density coordination
  Stage 4: 200 vehicles  (Density: 4.0x) — severe interference stress test
  Stage 5: Congestion    (Density: 6.0x) — extreme gridlock contention

Transitions to the next stage when average PDR >= 0.90 and reward stabilizes,
or upon completing the stage's episode quota.
"""

from typing import Dict, Any, Tuple


class CurriculumManager:
    STAGES = [
        {"stage": 1, "name": "low",        "num_vehicles": 20,  "density_factor": 1.0, "episodes": 20, "pdr_threshold": 0.90},
        {"stage": 2, "name": "medium",     "num_vehicles": 50,  "density_factor": 1.5, "episodes": 25, "pdr_threshold": 0.88},
        {"stage": 3, "name": "high",       "num_vehicles": 100, "density_factor": 2.5, "episodes": 30, "pdr_threshold": 0.85},
        {"stage": 4, "name": "very_high",  "num_vehicles": 200, "density_factor": 4.0, "episodes": 35, "pdr_threshold": 0.82},
        {"stage": 5, "name": "congestion", "num_vehicles": 300, "density_factor": 6.0, "episodes": 40, "pdr_threshold": 0.80},
    ]

    def __init__(self):
        self.current_stage_idx = 0
        self.stage_episodes = 0
        self.total_episodes = 0
        self.recent_pdrs = []
        self.recent_rewards = []

    @property
    def current_stage(self) -> Dict[str, Any]:
        return self.STAGES[self.current_stage_idx]

    @property
    def stage_number(self) -> int:
        return self.current_stage["stage"]

    @property
    def scenario_name(self) -> str:
        return self.current_stage["name"]

    @property
    def num_vehicles(self) -> int:
        return self.current_stage["num_vehicles"]

    @property
    def density_factor(self) -> float:
        return self.current_stage["density_factor"]

    def record_episode(self, pdr: float, reward: float) -> Tuple[bool, str]:
        """
        Record episode performance and determine if curriculum stage should advance.
        Returns: (stage_advanced, message)
        """
        self.stage_episodes += 1
        self.total_episodes += 1
        self.recent_pdrs.append(pdr)
        self.recent_rewards.append(reward)

        if len(self.recent_pdrs) > 5:
            self.recent_pdrs.pop(0)
            self.recent_rewards.pop(0)

        # Check stage progression conditions
        avg_pdr = sum(self.recent_pdrs) / len(self.recent_pdrs)
        target_pdr = self.current_stage["pdr_threshold"]
        max_episodes = self.current_stage["episodes"]

        advanced = False
        message = f"Stage {self.stage_number} ({self.scenario_name}) - Ep {self.stage_episodes}/{max_episodes} (Avg PDR: {avg_pdr*100:.1f}%)"

        if self.current_stage_idx < len(self.STAGES) - 1:
            if (self.stage_episodes >= 5 and avg_pdr >= target_pdr) or (self.stage_episodes >= max_episodes):
                self.current_stage_idx += 1
                prev_name = self.STAGES[self.current_stage_idx - 1]["name"]
                new_name = self.current_stage["name"]
                new_veh = self.current_stage["num_vehicles"]
                self.stage_episodes = 0
                self.recent_pdrs.clear()
                self.recent_rewards.clear()
                advanced = True
                message = f"CURRICULUM ADVANCEMENT: {prev_name} -> {new_name} ({new_veh} vehicles)"

        return advanced, message

    def get_status(self) -> Dict[str, Any]:
        return {
            "current_stage": self.stage_number,
            "total_stages": len(self.STAGES),
            "scenario": self.scenario_name,
            "num_vehicles": self.num_vehicles,
            "density_factor": self.density_factor,
            "stage_episodes": self.stage_episodes,
            "max_stage_episodes": self.current_stage["episodes"],
            "target_pdr": self.current_stage["pdr_threshold"],
        }
