"""
config.py — Central Configuration for AI-Based Spectrum Coordination System
All parameters are defined here. Do NOT scatter magic numbers across the codebase.
"""

# ─────────────────────────────────────────────────────────────────────────────
# SIMULATION
# ─────────────────────────────────────────────────────────────────────────────
SUMO_ENABLED = False          # Set True if running with live SUMO/TraCI
MOBILITY_CSV = "data/raw/v2x_dataset.csv"   # pre-generated V2X dataset from SUMO
SIMULATION_STEPS = 600        # seconds per episode
STEP_LENGTH   = 1.0           # seconds per step

# ─────────────────────────────────────────────────────────────────────────────
# TRAFFIC SCENARIOS  (used in evaluation / adaptation tests)
# ─────────────────────────────────────────────────────────────────────────────
TRAFFIC_SCENARIOS = {
    "low":       {"num_vehicles": 21,  "density_factor": 1.0},
    "medium":    {"num_vehicles": 50,  "density_factor": 1.5},
    "high":      {"num_vehicles": 100, "density_factor": 2.5},
    "very_high": {"num_vehicles": 200, "density_factor": 4.0},
    "congestion":{"num_vehicles": 300, "density_factor": 6.0},
}
DEFAULT_SCENARIO = "low"

# ─────────────────────────────────────────────────────────────────────────────
# WIRELESS / SPECTRUM
# ─────────────────────────────────────────────────────────────────────────────
NUM_CHANNELS      = 6          # spectrum channels available
COMM_RANGE_M      = 150.0      # V2X communication range (metres)
TX_POWER_DBM      = 23.0       # transmission power (dBm)  — 3GPP NR-V2X typical
NOISE_FLOOR_DBM   = -95.0      # thermal noise floor (dBm)
PATH_LOSS_EXP     = 3.5        # path-loss exponent (urban V2X)
REFERENCE_DIST_M  = 1.0        # reference distance for path-loss (m)
BANDWIDTH_MHZ     = 10.0       # per-channel bandwidth (MHz)
CARRIER_FREQ_GHZ  = 28.0       # 6G mmWave carrier frequency (GHz)

# Interference base per channel (0-1 scale) — varies dynamically at runtime
BASE_INTERFERENCE = [0.10, 0.25, 0.40, 0.15, 0.30, 0.20]

# ─────────────────────────────────────────────────────────────────────────────
# MULTI-HEAD ATTENTION
# ─────────────────────────────────────────────────────────────────────────────
ATTENTION_DIM     = 64         # embedding dimension
NUM_HEADS         = 4          # number of attention heads
ATTENTION_DROPOUT = 0.1

# State dimensions for each attention block
SPATIAL_DIM      = 4           # [x, y, speed, neighbour_count]
TEMPORAL_DIM     = 4           # [prev_speed, curr_speed, prev_interf, curr_interf]
APP_DIM          = 4           # [app_type one-hot: safety/emerg/traffic/normal]
FREQ_DIM         = NUM_CHANNELS * 3  # [avail, interf, util] per channel

# ─────────────────────────────────────────────────────────────────────────────
# REINFORCEMENT LEARNING
# ─────────────────────────────────────────────────────────────────────────────
NUM_EPISODES      = 500
BATCH_SIZE        = 64
REPLAY_BUFFER_CAP = 50_000
LEARNING_RATE_ACTOR  = 1e-4
LEARNING_RATE_CRITIC = 3e-4
GAMMA             = 0.95       # discount factor
TAU               = 0.005      # soft target update rate
ENTROPY_COEF      = 0.01       # entropy regularisation
UPDATE_EVERY_N_STEPS = 10      # only update networks every N steps (speeds up training)

# ─────────────────────────────────────────────────────────────────────────────
# REWARD WEIGHTS  (all configurable here)
# ─────────────────────────────────────────────────────────────────────────────
REWARD_WEIGHTS = {
    "spectral_efficiency": +2.0,
    "interference":        -3.0,
    "latency":             -1.5,
    "packet_delivery":     +2.5,
    "throughput":          +1.5,
    "comm_overhead":       -1.0,
    "fairness":            +0.5,
    "privacy":             +1.0,   # bonus for local-only decisions
}

# ─────────────────────────────────────────────────────────────────────────────
# APPLICATION PRIORITY
# ─────────────────────────────────────────────────────────────────────────────
APP_TYPES = ["safety", "emergency", "traffic_info", "normal"]
APP_PRIORITY = {
    "safety":       1.0,
    "emergency":    1.0,
    "traffic_info": 0.6,
    "normal":       0.3,
}
APP_LATENCY_REQ_MS = {
    "safety":       10,
    "emergency":    5,
    "traffic_info": 50,
    "normal":       100,
}

# ─────────────────────────────────────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────────────────────────────────────
MODEL_SAVE_DIR   = "models/"
RESULTS_DIR      = "results/"
GRAPHS_DIR       = "results/graphs/"
METRICS_DIR      = "results/metrics/"
LOGS_DIR         = "results/logs/"

# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────
DASHBOARD_PORT   = 8501
