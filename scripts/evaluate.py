"""
scripts/evaluate.py — Convenient CLI script to launch evaluation baseline comparison.
"""

import sys
import os
import argparse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from evaluation.evaluate import evaluate

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate 6G V2X Spectrum Coordination against Baselines")
    parser.add_argument("--scenario", type=str, default="low", help="Traffic scenario name")
    args = parser.parse_args()

    print(f"Evaluating MARL model vs Random, Greedy, and Round-Robin baselines on scenario '{args.scenario}'...")
    evaluate(scenario=args.scenario)
    print("Evaluation completed successfully.")
