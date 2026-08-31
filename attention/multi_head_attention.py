"""
multi_head_attention.py
-----------------------
Implements a four-stream Multi-Head Attention mechanism in PyTorch.

The four attention streams are:
  1. Spatial  — where is the vehicle?
  2. Temporal — how is the situation changing over time?
  3. Application — what type of communication is needed?
  4. Frequency — which spectrum channel is most suitable?

Each stream is a standard scaled dot-product multi-head attention, followed by
a feed-forward network. The four outputs are concatenated and fed to the
actor/critic network.

The raw attention weights are exposed so that the Explainable AI module can
visualize them.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))     
from training.config import (
    ATTENTION_DIM, NUM_HEADS, ATTENTION_DROPOUT,
    SPATIAL_DIM, TEMPORAL_DIM, APP_DIM, FREQ_DIM
)


# -----------------------------------------------------------------------------
# Single Self-Attention Block
# -----------------------------------------------------------------------------
class AttentionBlock(nn.Module):
    """
    Lightweight single self-attention block.

    Input shape:  (batch, seq_len, in_dim)  OR  (batch, in_dim)   <- 1-token mode
    Output shape: (batch, ATTENTION_DIM)
    Attention weights: (batch, num_heads, seq_len, seq_len)
    """

    def __init__(self, in_dim: int, name: str = ""):
        super().__init__()
        self.name      = name
        self.proj      = nn.Linear(in_dim, ATTENTION_DIM)
        self.attn      = nn.MultiheadAttention(
            embed_dim   = ATTENTION_DIM,
            num_heads   = NUM_HEADS,
            dropout     = ATTENTION_DROPOUT,
            batch_first = True,
        )
        self.norm1     = nn.LayerNorm(ATTENTION_DIM)
        self.ffn       = nn.Sequential(
            nn.Linear(ATTENTION_DIM, ATTENTION_DIM * 2),
            nn.GELU(),
            nn.Dropout(ATTENTION_DROPOUT),
            nn.Linear(ATTENTION_DIM * 2, ATTENTION_DIM),
        )
        self.norm2     = nn.LayerNorm(ATTENTION_DIM)
        # Saved for XAI
        self.last_attn_weights: torch.Tensor | None = None

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        x: (batch, in_dim) — single-token input per vehicle
        We treat the feature vector as a 1-token sequence.
        """
        if x.dim() == 2:
            x = x.unsqueeze(1)              # (B, 1, in_dim)

        x_proj = self.proj(x)               # (B, 1, ATTENTION_DIM)
        attn_out, weights = self.attn(x_proj, x_proj, x_proj, need_weights=True)
        self.last_attn_weights = weights    # save for XAI

        x1 = self.norm1(x_proj + attn_out) # residual
        x2 = self.norm2(x1 + self.ffn(x1)) # residual
        return x2.squeeze(1)               # (B, ATTENTION_DIM)

    def get_attention_weights(self) -> np.ndarray | None:
        if self.last_attn_weights is None:
            return None
        return self.last_attn_weights.detach().cpu().numpy()


# -----------------------------------------------------------------------------
# Four-Stream Multi-Head Attention
# -----------------------------------------------------------------------------
class MultiStreamAttention(nn.Module):
    """
    Processes the four attention streams and fuses them.

    Output:
      fused_repr : (batch, ATTENTION_DIM)   — fed to actor / critic
      attn_info  : dict with raw attention weights per stream (for XAI)
    """

    def __init__(self):
        super().__init__()
        self.spatial_attn  = AttentionBlock(SPATIAL_DIM,  "spatial")
        self.temporal_attn = AttentionBlock(TEMPORAL_DIM, "temporal")
        self.app_attn      = AttentionBlock(APP_DIM,      "application")
        self.freq_attn     = AttentionBlock(FREQ_DIM,     "frequency")

        # Fusion layer: concatenate 4 × ATTENTION_DIM -> ATTENTION_DIM
        self.fusion = nn.Sequential(
            nn.Linear(ATTENTION_DIM * 4, ATTENTION_DIM * 2),
            nn.GELU(),
            nn.LayerNorm(ATTENTION_DIM * 2),
            nn.Linear(ATTENTION_DIM * 2, ATTENTION_DIM),
        )

        # Learns the relative importance of the four semantic streams for
        # every observation.  The individual attention blocks model each
        # stream; this gate makes their contribution explicit and supplies
        # meaningful per-stream values to the XAI layer.
        self.stream_gate = nn.Sequential(
            nn.Linear(ATTENTION_DIM * 4, ATTENTION_DIM),
            nn.GELU(),
            nn.Linear(ATTENTION_DIM, 4),
        )

    # ------------------------------------------------------------------
    def forward(
        self,
        spatial_in:   torch.Tensor,   # (B, SPATIAL_DIM)
        temporal_in:  torch.Tensor,   # (B, TEMPORAL_DIM)
        app_in:       torch.Tensor,   # (B, APP_DIM)
        freq_in:      torch.Tensor,   # (B, FREQ_DIM)
    ) -> tuple[torch.Tensor, dict]:

        s  = self.spatial_attn(spatial_in)    # (B, ATTENTION_DIM)
        t  = self.temporal_attn(temporal_in)  # (B, ATTENTION_DIM)
        a  = self.app_attn(app_in)            # (B, ATTENTION_DIM)
        f  = self.freq_attn(freq_in)          # (B, ATTENTION_DIM)

        cat = torch.cat([s, t, a, f], dim=-1)       # (B, 4 * ATTENTION_DIM)
        stream_weights = torch.softmax(self.stream_gate(cat), dim=-1)
        weighted_streams = torch.cat([
            s * stream_weights[:, 0:1],
            t * stream_weights[:, 1:2],
            a * stream_weights[:, 2:3],
            f * stream_weights[:, 3:4],
        ], dim=-1)
        fused = self.fusion(weighted_streams)       # (B, ATTENTION_DIM)

        attn_info = {
            "spatial":      stream_weights[:, 0].detach().cpu().numpy(),
            "temporal":     stream_weights[:, 1].detach().cpu().numpy(),
            "application":  stream_weights[:, 2].detach().cpu().numpy(),
            "frequency":    stream_weights[:, 3].detach().cpu().numpy(),
        }
        return fused, attn_info

    # ------------------------------------------------------------------
    @staticmethod
    def split_observation(obs: torch.Tensor) -> tuple:
        """
        Split a flat observation vector into the four input streams.
        Observation layout (matches VehicleWirelessState.get_full_observation):
          [spatial(4) | temporal(4) | app(4) | freq(NUM_CHANNELS*3)]
        """
        s  = obs[:, :SPATIAL_DIM]
        t  = obs[:, SPATIAL_DIM : SPATIAL_DIM + TEMPORAL_DIM]
        a  = obs[:, SPATIAL_DIM + TEMPORAL_DIM : SPATIAL_DIM + TEMPORAL_DIM + APP_DIM]
        f  = obs[:, SPATIAL_DIM + TEMPORAL_DIM + APP_DIM :]
        return s, t, a, f


# -----------------------------------------------------------------------------
# Quick self-test
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    import torch
    B   = 8    # batch size
    attn_module = MultiStreamAttention()
    print(f"[Attention] Parameters: {sum(p.numel() for p in attn_module.parameters()):,}")

    # Create a synthetic full observation (same shape as env produces)
    from training.config import NUM_CHANNELS
    obs_dim = SPATIAL_DIM + TEMPORAL_DIM + APP_DIM + NUM_CHANNELS * 3
    obs = torch.randn(B, obs_dim)

    s, t, a, f = MultiStreamAttention.split_observation(obs)
    fused, info = attn_module(s, t, a, f)
    print(f"[Attention] Input obs dim : {obs_dim}")
    print(f"[Attention] Fused repr dim: {fused.shape}")   # (8, 64)
    for stream, w in info.items():
        print(f"  {stream:12s} attention weights: {w.shape if w is not None else 'None'}")
