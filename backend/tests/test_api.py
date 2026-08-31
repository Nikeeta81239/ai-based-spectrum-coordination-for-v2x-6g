"""
test_api.py — Standard unittest test suite for FastAPI Endpoints
"""

import unittest
import sys
import os
from fastapi.testclient import TestClient

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from backend.main import app


class TestBackendAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "healthy")

    def test_simulation_status(self):
        res = self.client.get("/api/simulation/status")
        self.assertEqual(res.status_code, 200)
        self.assertIn("status", res.json())

    def test_spectrum(self):
        res = self.client.get("/api/spectrum")
        self.assertEqual(res.status_code, 200)
        self.assertIn("channels", res.json())

    def test_scenarios(self):
        res = self.client.get("/api/scenarios")
        self.assertEqual(res.status_code, 200)
        self.assertIn("scenarios", res.json())


if __name__ == "__main__":
    unittest.main()
