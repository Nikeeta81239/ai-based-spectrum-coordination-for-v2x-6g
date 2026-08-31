"""
app.py — Streamlit Dashboard
==============================
Live interactive dashboard for the AI-Based Spectrum Coordination project.

Sections:
  🚗 Traffic      — vehicle count, speeds, density
  📡 Spectrum     — channel utilisation, interference live view
  🤖 AI           — reward curves, training progress, agent decisions
  📊 Performance  — PDR, throughput, latency, SINR comparison
  🔍 Explainability — attention weights and decision reasons
  🔬 Simulation   — run a live simulation step from the dashboard

Run:
    streamlit run dashboard/app.py
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import streamlit as st
import numpy as np
import pandas as pd
import json
import torch
import plotly.graph_objects as go
import plotly.express       as px
from plotly.subplots        import make_subplots

# --- Page config -------------------------------------------------------------
st.set_page_config(
    page_title = "6G V2X Spectrum Coordination",
    page_icon  = "📡",
    layout     = "wide",
    initial_sidebar_state = "expanded",
)

# --- CSS ---------------------------------------------------------------------
st.markdown("""
<style>
  .main { background: #0f0f23; }
  h1, h2, h3 { color: #00d4ff !important; }
  .metric-card {
    background: linear-gradient(135deg,#1a1a3e,#0f3460);
    border: 1px solid #00d4ff44;
    border-radius: 12px;
    padding: 16px;
    text-align: center;
    margin: 4px;
  }
  .metric-val { font-size: 2rem; font-weight: 700; color: #00d4ff; }
  .metric-lbl { font-size: 0.85rem; color: #aaa; }
  .explanation-box {
    background: #1a1a3e;
    border-left: 4px solid #00d4ff;
    border-radius: 8px;
    padding: 14px;
    margin: 8px 0;
  }
</style>
""", unsafe_allow_html=True)

# --- Imports from project ----------------------------------------------------
from training.config import (
    MOBILITY_CSV, NUM_CHANNELS, METRICS_DIR, LOGS_DIR, GRAPHS_DIR,
    MODEL_SAVE_DIR, TRAFFIC_SCENARIOS, DEFAULT_SCENARIO
)

# -----------------------------------------------------------------------------
# Sidebar
# -----------------------------------------------------------------------------
st.sidebar.image("https://img.icons8.com/fluency/96/antenna.png", width=80)
st.sidebar.title("6G V2X Spectrum AI")
st.sidebar.caption("BE Major Project — AI-Based Spectrum Coordination")

scenario = st.sidebar.selectbox(
    "Traffic Scenario",
    list(TRAFFIC_SCENARIOS.keys()),
    index=list(TRAFFIC_SCENARIOS.keys()).index(DEFAULT_SCENARIO),
)

section = st.sidebar.radio("Navigate", [
    "🏠 Overview",
    "🚗 Traffic",
    "📡 Spectrum",
    "🤖 AI Training",
    "📊 Performance Comparison",
    "🔍 Explainability",
    "⚡ Live Simulation",
])

st.sidebar.markdown("---")
st.sidebar.markdown("**Project:** AI Spectrum Coordination  \n**Dataset:** SUMO + OpenStreetMap Bengaluru  \n**Corridor:** Silk Board -> Bellandur -> Marathahalli")

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
@st.cache_data
def load_mobility():
    if os.path.exists(MOBILITY_CSV):
        return pd.read_csv(MOBILITY_CSV)
    return None

@st.cache_data
def load_training_metrics():
    path = os.path.join(METRICS_DIR, "training_metrics.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return None

@st.cache_data
def load_eval_results(sc):
    path = os.path.join(METRICS_DIR, f"evaluation_{sc}.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return None

@st.cache_data
def load_decision_log():
    path = os.path.join(LOGS_DIR, "decision_log.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return []

def dark_fig():
    fig = go.Figure()
    fig.update_layout(
        paper_bgcolor="#0f3460", plot_bgcolor="#0f3460",
        font=dict(color="white"),
        margin=dict(l=40, r=20, t=40, b=40),
    )
    return fig

# -----------------------------------------------------------------------------
# 🏠 Overview
# -----------------------------------------------------------------------------
if section == "🏠 Overview":
    st.title("📡 AI-Based Spectrum Coordination for 6G V2X Networks")
    st.markdown("""
    **Project Overview**
    
    This system simulates vehicles moving on a real **Bengaluru road network** (OpenStreetMap -> SUMO)
    and uses a **Multi-Agent Deep Reinforcement Learning** system with **Multi-Head Attention** 
    and a **Dual-Critic architecture** to dynamically coordinate spectrum resources for 6G V2X communications.
    """)

    col1, col2, col3, col4 = st.columns(4)
    mob = load_mobility()
    n_veh   = len(mob["vehicle_id"].unique()) if mob is not None else 21
    n_rec   = len(mob) if mob is not None else 10463
    n_ch    = NUM_CHANNELS

    with col1:
        st.markdown(f'<div class="metric-card"><div class="metric-val">{n_veh}</div><div class="metric-lbl">Simulated Vehicles</div></div>', unsafe_allow_html=True)
    with col2:
        st.markdown(f'<div class="metric-card"><div class="metric-val">{n_rec:,}</div><div class="metric-lbl">Mobility Records</div></div>', unsafe_allow_html=True)
    with col3:
        st.markdown(f'<div class="metric-card"><div class="metric-val">{n_ch}</div><div class="metric-lbl">Spectrum Channels</div></div>', unsafe_allow_html=True)
    with col4:
        st.markdown(f'<div class="metric-card"><div class="metric-val">28 GHz</div><div class="metric-lbl">6G Carrier Freq</div></div>', unsafe_allow_html=True)

    st.markdown("---")
    st.subheader("System Pipeline")
    st.code("""
OpenStreetMap (Bengaluru)
        ↓
SUMO Road Network + Vehicle Simulation
        ↓
V2X Mobility Data (mobility.csv, v2x_dataset.csv)
        ↓
Wireless Channel Model (SINR / RSSI / PDR / Throughput)
        ↓
Multi-Head Attention (Spatial | Temporal | App | Frequency)
        ↓
Multi-Agent DRL (Actor + Global Critic + Local Critic)
        ↓
Dynamic Spectrum Allocation (Channel Selection)
        ↓
Privacy-Aware Deployment (Local Critic only)
        ↓
Explainable AI (Attention weights + Decision reasons)
        ↓
Performance Comparison (Random vs Greedy vs AI-DRL)
    """, language="text")

# -----------------------------------------------------------------------------
# 🚗 Traffic
# -----------------------------------------------------------------------------
elif section == "🚗 Traffic":
    st.title("🚗 Traffic Visualisation")
    mob = load_mobility()
    if mob is None:
        st.warning("mobility.csv not found. Expected at: " + MOBILITY_CSV)
    else:
        mob.columns = [c.lower().strip() for c in mob.columns]
        col1, col2, col3 = st.columns(3)
        col1.metric("Total Vehicles",  len(mob["vehicle_id"].unique()))
        col2.metric("Time Steps",      len(mob["time"].unique()))
        col3.metric("Avg Speed (m/s)", f"{mob['speed_mps'].mean():.2f}")

        # Speed distribution
        fig = px.histogram(mob, x="speed_mps", nbins=40,
                           title="Vehicle Speed Distribution",
                           color_discrete_sequence=["#00d4ff"])
        fig.update_layout(paper_bgcolor="#0f3460", plot_bgcolor="#0f3460",
                          font_color="white")
        st.plotly_chart(fig, use_container_width=True)

        # Map
        if "longitude" in mob.columns and "latitude" in mob.columns:
            st.subheader("Vehicle Positions (all time steps)")
            sample = mob.sample(min(2000, len(mob)))
            st.map(sample.rename(columns={"latitude":"lat","longitude":"lon"})[["lat","lon"]])

        # Vehicle type pie
        if "vehicle_type" in mob.columns:
            vc = mob.drop_duplicates("vehicle_id")["vehicle_type"].value_counts()
            fig2 = px.pie(values=vc.values, names=vc.index, title="Vehicle Type Distribution",
                          color_discrete_sequence=px.colors.qualitative.Vivid)
            fig2.update_layout(paper_bgcolor="#0f3460", font_color="white")
            st.plotly_chart(fig2, use_container_width=True)

# -----------------------------------------------------------------------------
# 📡 Spectrum
# -----------------------------------------------------------------------------
elif section == "📡 Spectrum":
    st.title("📡 Spectrum Channel Status")
    from training.config import BASE_INTERFERENCE

    st.subheader("Current Channel Interference (Simulated)")
    interf = [BASE_INTERFERENCE[i] + np.random.uniform(-0.05, 0.05) for i in range(NUM_CHANNELS)]
    interf = np.clip(interf, 0, 1)
    ch_labels = [f"Ch {i+1}" for i in range(NUM_CHANNELS)]

    colors = ["#2ECC71" if v < 0.3 else "#F39C12" if v < 0.6 else "#E74C3C" for v in interf]
    fig = go.Figure(go.Bar(x=ch_labels, y=interf, marker_color=colors,
                           text=[f"{v:.3f}" for v in interf], textposition="outside"))
    fig.update_layout(title="Channel Interference Levels",
                      yaxis=dict(range=[0, 1.1], title="Interference"),
                      paper_bgcolor="#0f3460", plot_bgcolor="#0f3460",
                      font_color="white")
    st.plotly_chart(fig, use_container_width=True)

    st.subheader("Channel Availability")
    avail = ["✅ Available" if v < 0.85 else "❌ Blocked" for v in interf]
    df_ch = pd.DataFrame({"Channel": ch_labels, "Interference": interf, "Status": avail})
    st.dataframe(df_ch, use_container_width=True)

    st.info("🔄 Interference values change dynamically during simulation based on vehicle density and time.")

# -----------------------------------------------------------------------------
# 🤖 AI Training
# -----------------------------------------------------------------------------
elif section == "🤖 AI Training":
    st.title("🤖 AI Training Progress")
    metrics = load_training_metrics()

    if metrics is None:
        st.warning("No training metrics found. Run: `python main.py train`")
        st.code("python main.py train --scenario low")
    else:
        df = pd.DataFrame(metrics)
        st.success(f"Loaded {len(df)} training episodes.")

        col1, col2, col3 = st.columns(3)
        col1.metric("Best Reward",      f"{df['mean_reward'].max():.3f}")
        col2.metric("Final Reward",     f"{df['mean_reward'].iloc[-1]:.3f}")
        col3.metric("Episodes Trained", len(df))

        # Reward curve
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=df["episode"], y=df["mean_reward"],
                                 mode="lines", name="Raw Reward", opacity=0.4,
                                 line=dict(color="#00d4ff", width=1)))
        smooth = df["mean_reward"].rolling(10, min_periods=1).mean()
        fig.add_trace(go.Scatter(x=df["episode"], y=smooth,
                                 mode="lines", name="Smoothed", 
                                 line=dict(color="#ffd93d", width=2)))
        fig.update_layout(title="Training Reward vs Episode",
                          xaxis_title="Episode", yaxis_title="Mean Reward",
                          paper_bgcolor="#0f3460", plot_bgcolor="#0f3460",
                          font_color="white")
        st.plotly_chart(fig, use_container_width=True)

        # PDR and Throughput
        col_a, col_b = st.columns(2)
        with col_a:
            fig2 = go.Figure()
            fig2.add_trace(go.Scatter(x=df["episode"], y=df["mean_pdr"].rolling(10,min_periods=1).mean(),
                                      mode="lines", name="PDR", line=dict(color="#2ECC71", width=2)))
            fig2.update_layout(title="Packet Delivery Ratio", paper_bgcolor="#0f3460",
                               plot_bgcolor="#0f3460", font_color="white",
                               yaxis=dict(range=[0,1.05]))
            st.plotly_chart(fig2, use_container_width=True)

        with col_b:
            fig3 = go.Figure()
            fig3.add_trace(go.Scatter(x=df["episode"], y=df["mean_throughput"].rolling(10,min_periods=1).mean(),
                                      mode="lines", name="Throughput (Mbps)", line=dict(color="#9B59B6", width=2)))
            fig3.update_layout(title="Mean Throughput (Mbps)", paper_bgcolor="#0f3460",
                               plot_bgcolor="#0f3460", font_color="white")
            st.plotly_chart(fig3, use_container_width=True)

# -----------------------------------------------------------------------------
# 📊 Performance Comparison
# -----------------------------------------------------------------------------
elif section == "📊 Performance Comparison":
    st.title("📊 Performance Comparison")
    results = load_eval_results(scenario)

    if results is None:
        st.warning(f"No evaluation results for scenario '{scenario}'. Run:")
        st.code(f"python main.py evaluate --scenario {scenario}")
    else:
        systems = list(results.keys())
        colors  = ["#E74C3C", "#F39C12", "#3498DB", "#2ECC71"]

        metrics_info = [
            ("mean_sinr_db",         "Mean SINR (dB)",          True),
            ("mean_throughput_mbps", "Throughput (Mbps)",        True),
            ("mean_pdr",             "Packet Delivery Ratio",    True),
            ("mean_latency_ms",      "Latency (ms)",             False),
            ("mean_interference",    "Mean Interference",        False),
            ("spectral_efficiency",  "Spectral Efficiency",      True),
            ("comm_overhead",        "Communication Overhead",   False),
        ]

        for key, label, higher_better in metrics_info:
            vals = [results[s].get(key, 0) for s in systems]
            fig  = go.Figure(go.Bar(
                x=systems, y=vals, marker_color=colors[:len(systems)],
                text=[f"{v:.4f}" for v in vals], textposition="outside",
            ))
            arrow = "↑" if higher_better else "↓"
            fig.update_layout(
                title=f"{label}  ({arrow} {'better' if higher_better else 'lower'} is better)",
                paper_bgcolor="#0f3460", plot_bgcolor="#0f3460",
                font_color="white", showlegend=False,
            )
            st.plotly_chart(fig, use_container_width=True)

        # Summary table
        st.subheader("Summary Table")
        rows = []
        for s in systems:
            row = {"System": s}
            for key, label, _ in metrics_info:
                row[label] = f"{results[s].get(key,0):.4f}"
            rows.append(row)
        st.dataframe(pd.DataFrame(rows).set_index("System"), use_container_width=True)

# -----------------------------------------------------------------------------
# 🔍 Explainability
# -----------------------------------------------------------------------------
elif section == "🔍 Explainability":
    st.title("🔍 Explainable AI — Decision Analysis")
    log = load_decision_log()

    if not log:
        st.warning("No decision log found. Run demo first:")
        st.code("python main.py demo")
    else:
        st.success(f"Loaded {len(log)} decision records.")

        recent = log[-min(10, len(log)):]
        for entry in reversed(recent):
            ch = entry.get("selected_channel", "?")
            vid = entry.get("vehicle_id", "?")
            t   = entry.get("time_step", 0)
            pdr = entry.get("pdr", 0)
            app = entry.get("app_type", "?")
            rw  = entry.get("reward", 0)

            with st.expander(f"🚗 Vehicle {vid} | t={t}s | Channel {ch} | {app.upper()} | PDR={pdr:.3f}", expanded=False):
                col1, col2, col3, col4 = st.columns(4)
                col1.metric("Channel", ch)
                col2.metric("Reward",  f"{rw:+.3f}")
                col3.metric("PDR",     f"{pdr:.3f}")
                col4.metric("Latency", f"{entry.get('latency_ms',0):.1f} ms")

                # Attention bar
                attn = entry.get("attention_importance", {})
                if attn:
                    fig = go.Figure(go.Bar(
                        x=list(attn.keys()),
                        y=list(attn.values()),
                        marker_color=["#00d4ff","#ff6b6b","#ffd93d","#6bcb77"],
                        text=[f"{v:.1%}" for v in attn.values()],
                        textposition="outside",
                    ))
                    fig.update_layout(
                        title="Attention Stream Importance",
                        yaxis=dict(range=[0,1.1]),
                        paper_bgcolor="#0f3460", plot_bgcolor="#0f3460",
                        font_color="white", height=280,
                    )
                    st.plotly_chart(fig, use_container_width=True)

                # Reasons
                reasons = entry.get("reasons", [])
                if reasons:
                    st.markdown("**Decision Reasons:**")
                    for i, r in enumerate(reasons, 1):
                        st.markdown(f"{i}. {r}")

# -----------------------------------------------------------------------------
# ⚡ Live Simulation
# -----------------------------------------------------------------------------
elif section == "⚡ Live Simulation":
    st.title("⚡ Live Simulation")
    st.info("Run a mini live simulation step directly from the dashboard.")

    csv_ok = os.path.exists(MOBILITY_CSV)
    if not csv_ok:
        st.error(f"Mobility CSV not found: {MOBILITY_CSV}")
        st.stop()

    if st.button(">️ Run 10 Simulation Steps"):
        import torch
        from environment.wireless_environment import WirelessEnvironment
        from agents.multi_agent              import MultiAgentSystem
        from evaluation.baselines           import (
            RandomAllocation, GreedyAllocation, compute_metrics_from_states
        )

        device = torch.device("cpu")
        with st.spinner("Running simulation..."):
            env    = WirelessEnvironment(MOBILITY_CSV)
            mas    = MultiAgentSystem(device)
            rand   = RandomAllocation()
            greedy = GreedyAllocation()

            ai_rewards, rand_rewards, greedy_rewards = [], [], []
            states = env.reset()
            done   = False

            for step in range(10):
                if done or not states:
                    break
                ai_actions, _, _ = mas.step_actions(states, deterministic=False)
                rand_actions     = rand.select_channels(states)
                greedy_actions   = greedy.select_channels(states)

                ai_m     = compute_metrics_from_states(states, ai_actions)
                rand_m   = compute_metrics_from_states(states, rand_actions)
                greedy_m = compute_metrics_from_states(states, greedy_actions)

                ai_rewards.append(ai_m["mean_pdr"])
                rand_rewards.append(rand_m["mean_pdr"])
                greedy_rewards.append(greedy_m["mean_pdr"])

                next_states, _, done, _ = env.step(ai_actions)
                states = next_states

        # Plot
        steps = list(range(1, len(ai_rewards)+1))
        fig   = go.Figure()
        fig.add_trace(go.Scatter(x=steps, y=rand_rewards,   mode="lines+markers", name="Random",   line=dict(color="#E74C3C", width=2)))
        fig.add_trace(go.Scatter(x=steps, y=greedy_rewards, mode="lines+markers", name="Greedy",   line=dict(color="#F39C12", width=2)))
        fig.add_trace(go.Scatter(x=steps, y=ai_rewards,     mode="lines+markers", name="AI (DRL)", line=dict(color="#2ECC71", width=2)))
        fig.update_layout(
            title="PDR Comparison — 10 Live Steps",
            xaxis_title="Step", yaxis_title="Packet Delivery Ratio",
            yaxis=dict(range=[0,1.1]),
            paper_bgcolor="#0f3460", plot_bgcolor="#0f3460",
            font_color="white",
        )
        st.plotly_chart(fig, use_container_width=True)
        st.success("Simulation complete! (Note: AI will improve significantly after training)")
