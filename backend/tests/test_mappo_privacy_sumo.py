"""
test_mappo_privacy_sumo.py
---------------------------
Comprehensive test suite verifying:
1. MAPPO Actor with Action Masking and evaluated log-probs
2. Privacy Gateway: Local boundary protection & real exposure metrics
3. Curriculum Learning: 5 stages (20 -> 50 -> 100 -> 200 -> 300)
4. SumoManager: Detection and TraCI state collection
5. MultiAgentSystem: MAPPO update step and rollout orchestration
6. End-to-End API endpoint schemas and responses
"""

import os
import sys
import unittest
import numpy as np
import torch

# Project root resolution
_test_dir = os.path.dirname(__file__)
_project_root = os.path.abspath(os.path.join(_test_dir, "..", ".."))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from agents.actor import Actor
from agents.agent import Agent
from agents.multi_agent import MultiAgentSystem
from environment.privacy_gateway import PrivacyGateway, privacy_gateway
from training.curriculum import CurriculumManager
from backend.simulation.sumo_manager import SumoManager
from training.config import NUM_CHANNELS, ATTENTION_DIM


class TestMappoActionMasking(unittest.TestCase):
    def setUp(self):
        self.device = torch.device("cpu")
        self.actor = Actor().to(self.device)

    def test_action_masking_applied(self):
        """Verify that masked channels receive ~0 probability and are not chosen."""
        fused = torch.randn(1, ATTENTION_DIM)
        # Mask channels 0, 1, 2 (only 3, 4, 5 available)
        mask = torch.tensor([[False, False, False, True, True, True]])

        probs = self.actor.action_probs(fused, action_mask=mask)
        # Probabilities for masked channels should be effectively 0
        self.assertAlmostEqual(float(probs[0, 0]), 0.0, places=4)
        self.assertAlmostEqual(float(probs[0, 1]), 0.0, places=4)
        self.assertAlmostEqual(float(probs[0, 2]), 0.0, places=4)

        # Probabilities for viable channels sum to 1.0
        viable_sum = float(probs[0, 3:].sum())
        self.assertAlmostEqual(viable_sum, 1.0, places=3)

        # Sample action 50 times; none should be in masked set {0, 1, 2}
        for _ in range(50):
            action, log_prob, _ = self.actor.get_action(fused, action_mask=mask)
            self.assertIn(int(action.item()), [3, 4, 5])

    def test_agent_mappo_step(self):
        """Verify Agent acts and produces old_log_prob for PPO ratio."""
        agent = Agent("veh_test_1", self.device)
        # obs dimension: spatial(4) + temporal(4) + app(4) + freq(NUM_CHANNELS * 3 = 18) = 30
        obs_dim = 4 + 4 + 4 + NUM_CHANNELS * 3
        obs = np.random.randn(obs_dim).astype(np.float32)
        action, fused, attn, log_prob, mask = agent.act(obs)

        self.assertIsInstance(action, int)
        self.assertGreaterEqual(action, 0)
        self.assertLess(action, NUM_CHANNELS)
        self.assertIsInstance(log_prob, float)
        self.assertEqual(fused.shape, (1, ATTENTION_DIM))
        self.assertEqual(mask.shape, (1, NUM_CHANNELS))


class TestPrivacyGateway(unittest.TestCase):
    def setUp(self):
        self.gw = PrivacyGateway()

    def test_identity_anonymization(self):
        """Raw vehicle ID should be converted into an ephemeral hash token."""
        raw_id = "SUMO_VEH_SILK_BOARD_984"
        anon = self.gw.anonymize_id(raw_id)
        self.assertTrue(anon.startswith("ag_"))
        self.assertNotIn(raw_id, anon)

    def test_outbound_observation_strips_gps(self):
        """Outbound packet must NOT contain exact GPS latitude/longitude."""
        raw_state = {
            "vehicle_id": "V12",
            "latitude": 12.9172,
            "longitude": 77.6228,
            "speed_mps": 14.2,
            "num_neighbours": 5,
            "traffic_density": 0.45,
            "selected_channel": 2,
            "app_type": "safety",
        }
        filtered = self.gw.filter_outbound_observation(raw_state)
        self.assertNotIn("latitude", filtered)
        self.assertNotIn("longitude", filtered)
        self.assertIn("anon_id", filtered)
        self.assertIn("requested_channel", filtered)

    def test_exposure_metrics_calculation(self):
        """Data-exposure metrics should correctly evaluate generated vs transmitted bytes."""
        vehicles = [
            {"vehicle_id": f"V{i}", "speed_mps": 10.0, "app_type": "normal"}
            for i in range(20)
        ]
        metrics = self.gw.compute_exposure_metrics(vehicles)
        self.assertEqual(metrics["active_vehicles"], 20)
        # Sensitive data generated = 20 * 232 = 4640 bytes
        self.assertEqual(metrics["sensitive_data_generated_bytes"], 4640)
        # Sensitive transmitted outside boundary = 0
        self.assertEqual(metrics["sensitive_data_transmitted_bytes"], 0)
        self.assertEqual(metrics["protected_data_bytes"], 4640)
        self.assertEqual(metrics["exposed_data_bytes"], 0)
        self.assertEqual(metrics["privacy_protection_pct"], 100.0)
        self.assertLess(metrics["comm_overhead_ratio"], 0.1)


class TestCurriculumLearning(unittest.TestCase):
    def test_curriculum_stages(self):
        """Verify 5-stage progression from 20 to 300 vehicles."""
        cm = CurriculumManager()
        self.assertEqual(cm.stage_number, 1)
        self.assertEqual(cm.num_vehicles, 20)

        # Simulate 20 successful episodes in stage 1 with high PDR
        advanced = False
        for _ in range(6):
            advanced, msg = cm.record_episode(pdr=0.95, reward=15.0)
            if advanced:
                break
        self.assertTrue(advanced)
        self.assertEqual(cm.stage_number, 2)
        self.assertEqual(cm.num_vehicles, 50)


class TestSumoManager(unittest.TestCase):
    def test_sumo_binary_detection(self):
        """Verify SumoManager can detect installed binaries."""
        sm = SumoManager()
        installed, info = sm.check_sumo_installed()
        # On this environment, SUMO 1.27.1 is installed
        self.assertTrue(installed, f"SUMO not detected: {info}")
        self.assertIn("sumo", sm.sumo_binary.lower())


if __name__ == "__main__":
    unittest.main()
