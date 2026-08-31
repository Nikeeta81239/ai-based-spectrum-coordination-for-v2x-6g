"""
main.py — Master Entry Point
==============================

Commands:
  python main.py train              — run training
  python main.py evaluate           — run evaluation (requires trained model)
  python main.py demo               — single-episode demo with explanations
  python main.py dashboard          — launch Streamlit dashboard
  python main.py graphs             — regenerate all graphs from saved metrics
  python main.py xai                — run XAI demo
  python main.py all                — train + evaluate + generate all outputs

Flags:
  --scenario low|medium|high|very_high|congestion
  --episodes  N       (override NUM_EPISODES)
  --csv       PATH    (override default v2x_dataset.csv path)
"""

import sys, os, argparse

# Make all submodules importable from any cwd
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from training.config import (
    MOBILITY_CSV, NUM_EPISODES, GRAPHS_DIR, METRICS_DIR, LOGS_DIR,
    DEFAULT_SCENARIO, TRAFFIC_SCENARIOS
)


# -----------------------------------------------------------------------------
def cmd_train(args):
    from training.train import train
    if args.episodes:
        import training.config as cfg
        cfg.NUM_EPISODES = args.episodes
    train(scenario=args.scenario, csv_path=args.csv)


def cmd_evaluate(args):
    from evaluation.evaluate import evaluate
    evaluate(scenario=args.scenario, csv_path=args.csv)


def cmd_demo(args):
    """Run one episode with explanations printed to console."""
    import torch, numpy as np
    from environment.wireless_environment import WirelessEnvironment
    from agents.multi_agent              import MultiAgentSystem
    from explainability.decision_explanation import DecisionExplainer

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    csv    = args.csv or MOBILITY_CSV
    if not os.path.exists(csv):
        print(f"[Demo] CSV not found: {csv}")
        return

    env    = WirelessEnvironment(csv)
    mas    = MultiAgentSystem(device)
    xai    = DecisionExplainer()
    states = env.reset()
    done   = False
    step   = 0

    print(f"\n{'='*60}  DEMO MODE  {'='*60}\n")

    while not done and step < 30:
        actions, _, attn_infos = mas.step_actions(states, deterministic=False)
        next_states, rewards, done, info = env.step(actions)

        if step % 5 == 0:
            for vid in list(states.keys())[:2]:
                if vid in states and vid in attn_infos:
                    exp = xai.explain(
                        vid, info.get("time", step), np.zeros(1),
                        actions[vid], rewards.get(vid, 0),
                        attn_infos[vid], states[vid]
                    )
                    print(xai.format_text(exp))

        states = next_states
        step  += 1

    xai.save_log()
    print("\n[Demo] Complete.")


def cmd_graphs(args):
    from evaluation.metrics import plot_training_curves
    plot_training_curves()
    import json
    scenario_path = os.path.join(METRICS_DIR, f"evaluation_{args.scenario}.json")
    if os.path.exists(scenario_path):
        from evaluation.evaluate import _generate_comparison_graphs
        with open(scenario_path) as f:
            results = json.load(f)
        _generate_comparison_graphs(results, args.scenario)
    else:
        print(f"[Graphs] No evaluation results for scenario '{args.scenario}'. Run evaluate first.")


def cmd_xai(args):
    from explainability.attention_visualization import (
        plot_stream_importance, plot_radar_attention
    )
    import numpy as np, json
    log_path = os.path.join(LOGS_DIR, "decision_log.json")
    if not os.path.exists(log_path):
        print("[XAI] No decision log found. Run demo or train first.")
        return
    with open(log_path) as f:
        log = json.load(f)
    stream_data = [e["attention_importance"] for e in log if "attention_importance" in e]
    if stream_data:
        plot_stream_importance(stream_data)
        mean_imp = {
            k: float(np.mean([d.get(k,0) for d in stream_data]))
            for k in stream_data[0]
        }
        plot_radar_attention(mean_imp, vehicle_id="fleet_mean")
        print(f"[XAI] Generated attention visualisations from {len(stream_data)} decisions.")
    else:
        print("[XAI] No attention data in log.")


def cmd_dashboard(args):
    import subprocess
    dashboard_path = os.path.join(ROOT, "dashboard", "app.py")
    print(f"[Dashboard] Launching Streamlit dashboard...")
    subprocess.run([
        sys.executable, "-m", "streamlit", "run", dashboard_path,
        "--server.port", "8501", "--server.headless", "false"
    ])


def cmd_all(args):
    cmd_train(args)
    cmd_evaluate(args)
    cmd_graphs(args)
    cmd_xai(args)


# -----------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="AI-Based Spectrum Coordination for 6G V2X Networks"
    )
    parser.add_argument("command", choices=["train","evaluate","demo","graphs","xai","dashboard","all"])
    parser.add_argument("--scenario", default=DEFAULT_SCENARIO,
                        choices=list(TRAFFIC_SCENARIOS.keys()))
    parser.add_argument("--episodes", type=int, default=None)
    parser.add_argument("--csv",      type=str, default=None)
    args = parser.parse_args()

    dispatch = {
        "train":     cmd_train,
        "evaluate":  cmd_evaluate,
        "demo":      cmd_demo,
        "graphs":    cmd_graphs,
        "xai":       cmd_xai,
        "dashboard": cmd_dashboard,
        "all":       cmd_all,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
