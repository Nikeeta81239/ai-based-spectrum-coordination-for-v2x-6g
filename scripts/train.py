"""
scripts/train.py — Convenient CLI script to launch training.
"""

import sys
import os
import argparse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from training.train import train

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train 6G V2X Spectrum Coordination MARL Model")
    parser.add_argument("--episodes", type=int, default=50, help="Number of training episodes")
    parser.add_argument("--scenario", type=str, default="low", help="Traffic scenario name")
    args = parser.parse_args()

    print(f"Starting training for {args.episodes} episodes on scenario '{args.scenario}'...")
    metrics = train(scenario=args.scenario)
    print("Training finished successfully.")
