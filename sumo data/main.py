"""
main.py
Unified Research CLI for AI-Driven 6G V2X Spectrum Coordination.

Supported commands:
  python main.py train      # Train Multi-Head Attention MARL
  python main.py evaluate   # Evaluate trained agent
  python main.py demo       # Run live closed loop with SUMO-GUI
  python main.py baseline   # Benchmark Random vs Fixed vs Round-Robin vs Greedy vs MARL
  python main.py dataset    # Generate mobility & 6G V2X dataset
  python main.py graphs     # Generate publication-quality performance graphs
"""

import os
import sys
import argparse
import subprocess
import csv

# Add python subfolder to path
sys.path.append(os.path.join(os.path.dirname(__file__), "python"))

def cmd_dataset(args):
    print("=== Step 1: Collecting Mobility Data from SUMO ===")
    from collect_data import collect_mobility_data
    collect_mobility_data(duration=args.duration, gui=args.gui, seed=args.seed)

    print("\n=== Step 2: Generating 6G V2X Communication Dataset ===")
    from create_v2x_dataset import create_dataset_from_mobility
    create_dataset_from_mobility()

def cmd_train(args):
    print("=== Training Multi-Agent Deep RL with 4-Head Attention ===")
    from ai_spectrum import run_closed_loop_simulation
    run_closed_loop_simulation(duration=args.duration, gui=args.gui, mode="train", seed=args.seed)

def cmd_evaluate(args):
    print("=== Evaluating Multi-Head Attention MARL Model ===")
    from ai_spectrum import run_closed_loop_simulation
    run_closed_loop_simulation(duration=args.duration, gui=args.gui, mode="evaluate", seed=args.seed)

def cmd_demo(args):
    print("=== Launching Live SUMO-GUI with Real-Time MARL Spectrum Controller ===")
    from ai_spectrum import run_closed_loop_simulation
    run_closed_loop_simulation(duration=args.duration, gui=True, mode="evaluate", seed=args.seed)

def cmd_baseline(args):
    print("=== Benchmarking Spectrum Allocation Policies across Scenarios ===")
    from create_v2x_dataset import create_dataset_from_mobility
    from collect_data import collect_mobility_data

    # Ensure baseline mobility data exists
    if not os.path.exists("output/vehicle_data.csv"):
        collect_mobility_data(duration=args.duration, gui=False, seed=args.seed)

    policies = ["random", "fixed", "round_robin", "greedy"]
    summary_results = []

    for pol in policies:
        out_csv = f"output/v2x_{pol}.csv"
        create_dataset_from_mobility(output_v2x=out_csv, policy=pol)

        # Compute summary statistics
        with open(out_csv, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            thrs, lats, pdrs, sinrs = [], [], [], []
            for row in reader:
                thrs.append(float(row["throughput_mbps"]))
                lats.append(float(row["latency_ms"]))
                pdrs.append(float(row["packet_delivery_ratio"]))
                sinrs.append(float(row["sinr_db"]))

            summary_results.append({
                "Policy": pol.upper(),
                "Avg_Throughput_Mbps": round(sum(thrs)/len(thrs), 2),
                "Avg_Latency_ms": round(sum(lats)/len(lats), 2),
                "Avg_PDR_percent": round(sum(pdrs)/len(pdrs)*100, 2),
                "Avg_SINR_dB": round(sum(sinrs)/len(sinrs), 2)
            })

    # Add MARL simulation result
    from ai_spectrum import run_closed_loop_simulation
    run_closed_loop_simulation(duration=args.duration, gui=False, mode="evaluate", seed=args.seed)
    
    if os.path.exists("output/ai_decisions.csv"):
        with open("output/ai_decisions.csv", "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            thrs, lats, pdrs, sinrs = [], [], [], []
            for row in reader:
                thrs.append(float(row["throughput_mbps"]))
                lats.append(float(row["latency_ms"]))
                pdrs.append(float(row["pdr"]))
                sinrs.append(float(row["sinr_db"]))

            summary_results.append({
                "Policy": "PROPOSED (MARL + 4-HEAD ATTENTION)",
                "Avg_Throughput_Mbps": round(sum(thrs)/len(thrs), 2),
                "Avg_Latency_ms": round(sum(lats)/len(lats), 2),
                "Avg_PDR_percent": round(sum(pdrs)/len(pdrs)*100, 2),
                "Avg_SINR_dB": round(sum(sinrs)/len(sinrs), 2)
            })

    # Print and save comparison table
    out_table = "output/spectrum_results.csv"
    with open(out_table, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(summary_results[0].keys()))
        writer.writeheader()
        writer.writerows(summary_results)

    print("\n" + "="*75)
    print(f"{'POLICY':<35} | {'THROUGHPUT':<10} | {'LATENCY':<8} | {'PDR':<7} | {'SINR':<7}")
    print("="*75)
    for r in summary_results:
        print(f"{r['Policy']:<35} | {r['Avg_Throughput_Mbps']:>8.2f} M | {r['Avg_Latency_ms']:>6.2f}ms | {r['Avg_PDR_percent']:>5.1f}% | {r['Avg_SINR_dB']:>5.1f}dB")
    print("="*75)
    print(f"Results saved to {out_table}")

def cmd_graphs(args):
    print("=== Generating Performance Graphs ===")
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import pandas as pd
    except ImportError:
        print("Matplotlib / Pandas not installed. Installing matplotlib and pandas...")
        subprocess.run([sys.executable, "-m", "pip", "install", "matplotlib", "pandas"], check=False)
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import pandas as pd

    os.makedirs("output/figures", exist_ok=True)

    # 1. Plot Baseline Comparison if available
    if os.path.exists("output/spectrum_results.csv"):
        df = pd.read_csv("output/spectrum_results.csv")
        fig, axes = plt.subplots(2, 2, figsize=(12, 8))
        
        df.plot(x="Policy", y="Avg_Throughput_Mbps", kind="bar", ax=axes[0, 0], color="teal", legend=False)
        axes[0, 0].set_title("Average Throughput (Mbps)")
        axes[0, 0].set_ylabel("Mbps")
        axes[0, 0].tick_params(axis='x', rotation=30)

        df.plot(x="Policy", y="Avg_Latency_ms", kind="bar", ax=axes[0, 1], color="coral", legend=False)
        axes[0, 1].set_title("Average Latency (ms) [Lower is Better]")
        axes[0, 1].set_ylabel("ms")
        axes[0, 1].tick_params(axis='x', rotation=30)

        df.plot(x="Policy", y="Avg_PDR_percent", kind="bar", ax=axes[1, 0], color="green", legend=False)
        axes[1, 0].set_title("Packet Delivery Ratio (PDR %)")
        axes[1, 0].set_ylabel("%")
        axes[1, 0].tick_params(axis='x', rotation=30)

        df.plot(x="Policy", y="Avg_SINR_dB", kind="bar", ax=axes[1, 1], color="purple", legend=False)
        axes[1, 1].set_title("Average SINR (dB)")
        axes[1, 1].set_ylabel("dB")
        axes[1, 1].tick_params(axis='x', rotation=30)

        plt.tight_layout()
        fig_path = "output/figures/baseline_comparison.png"
        plt.savefig(fig_path, dpi=300)
        print(f"Saved figure: {fig_path}")

    # 2. Plot Attention Weights & Convergence
    if os.path.exists("output/ai_decisions.csv"):
        df_dec = pd.read_csv("output/ai_decisions.csv")
        plt.figure(figsize=(10, 5))
        for head in ["spatial_attention", "temporal_attention", "freq_attention", "app_attention"]:
            rolling_avg = df_dec[head].rolling(20).mean()
            plt.plot(rolling_avg, label=head.replace("_", " ").title())
        plt.title("Evolution of Multi-Head Attention Weights in 6G Spectrum Selection")
        plt.xlabel("Decision Step")
        plt.ylabel("Attention Importance Weight")
        plt.legend()
        plt.grid(True, linestyle="--", alpha=0.5)
        plt.tight_layout()
        fig_attn = "output/figures/attention_weights.png"
        plt.savefig(fig_attn, dpi=300)
        print(f"Saved figure: {fig_attn}")

    print("Graph generation complete!")

def main():
    parser = argparse.ArgumentParser(description="6G V2X Spectrum Coordination MARL Framework")
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_dataset = subparsers.add_parser("dataset", help="Collect SUMO mobility data & build 6G V2X dataset")
    p_dataset.add_argument("--duration", type=int, default=150)
    p_dataset.add_argument("--gui", action="store_true")
    p_dataset.add_argument("--seed", type=int, default=42)
    p_dataset.set_defaults(func=cmd_dataset)

    p_train = subparsers.add_parser("train", help="Train MARL Agent with Multi-Head Attention")
    p_train.add_argument("--duration", type=int, default=150)
    p_train.add_argument("--gui", action="store_true")
    p_train.add_argument("--seed", type=int, default=42)
    p_train.set_defaults(func=cmd_train)

    p_eval = subparsers.add_parser("evaluate", help="Evaluate MARL Agent")
    p_eval.add_argument("--duration", type=int, default=100)
    p_eval.add_argument("--gui", action="store_true")
    p_eval.add_argument("--seed", type=int, default=42)
    p_eval.set_defaults(func=cmd_evaluate)

    p_demo = subparsers.add_parser("demo", help="Run live interactive SUMO-GUI with AI spectrum controller")
    p_demo.add_argument("--duration", type=int, default=100)
    p_demo.add_argument("--seed", type=int, default=42)
    p_demo.set_defaults(func=cmd_demo)

    p_base = subparsers.add_parser("baseline", help="Run comprehensive baseline benchmarking")
    p_base.add_argument("--duration", type=int, default=100)
    p_base.add_argument("--seed", type=int, default=42)
    p_base.set_defaults(func=cmd_baseline)

    p_graph = subparsers.add_parser("graphs", help="Generate performance graphs")
    p_graph.set_defaults(func=cmd_graphs)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
