"""
test_attention.py — Standard unittest test suite for Multi-Head Attention module
"""

import unittest
import torch
import sys
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from attention.multi_head_attention import MultiStreamAttention, AttentionBlock


class TestAttentionModule(unittest.TestCase):
    def test_attention_block(self):
        head = AttentionBlock(in_dim=4, name="spatial")
        x = torch.randn(2, 4)
        out = head(x)
        self.assertEqual(out.shape[1], 64)

    def test_multi_stream_attention(self):
        attn = MultiStreamAttention()
        spatial = torch.randn(1, 4)
        temporal = torch.randn(1, 4)
        app = torch.randn(1, 4)
        freq = torch.randn(1, 18)

        fused, info = attn(spatial, temporal, app, freq)
        self.assertEqual(fused.shape, (1, 64))
        self.assertIn("spatial", info)
        self.assertIn("temporal", info)
        self.assertIn("application", info)
        self.assertIn("frequency", info)


if __name__ == "__main__":
    unittest.main()
