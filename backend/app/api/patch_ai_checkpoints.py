import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = r"c:\Users\subha\OneDrive\Pictures\Desktop\major_project\backend\app\api\ai.py"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

new_endpoints = '''

@router.get("/checkpoints")
async def get_checkpoints():
    """Return list of real saved PyTorch checkpoint directories and metadata."""
    import json
    models_dir = os.path.join(_project_root, "models")
    metrics_path = os.path.join(_project_root, "results", "metrics", "training_metrics.json")

    training_lookup = {}
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r") as mf:
                m_list = json.load(mf)
                for m in m_list:
                    training_lookup[m.get("episode")] = m
        except Exception:
            pass

    checkpoints = []
    if os.path.isdir(models_dir):
        for entry in sorted(os.listdir(models_dir)):
            full_p = os.path.join(models_dir, entry)
            if os.path.isdir(full_p):
                pts = glob.glob(os.path.join(full_p, "*.pt"))
                has_gc = os.path.exists(os.path.join(full_p, "global_critic.pt"))
                is_best = (entry == "best")
                if is_best:
                    ep_num = 50
                    stage_name = "Production Deployment (Best Converged)"
                elif entry.startswith("ep") and entry[2:].isdigit():
                    ep_num = int(entry[2:])
                    if ep_num <= 5:
                        stage_name = "Early Exploration"
                    elif ep_num <= 20:
                        stage_name = "Curriculum Stabilization"
                    elif ep_num <= 40:
                        stage_name = "High Density Refinement"
                    else:
                        stage_name = "Convergence Tuning"
                else:
                    ep_num = 0
                    stage_name = "Custom Checkpoint"

                m = training_lookup.get(ep_num, {})
                checkpoints.append({
                    "id": entry,
                    "name": f"Checkpoint {entry.upper()}",
                    "stage": stage_name,
                    "episode": ep_num,
                    "is_best": is_best,
                    "is_loaded": is_best,  # by default models/best is loaded
                    "file_summary": f"global_critic.pt + {len([p for p in pts if 'agent_' in p])} Agents",
                    "agent_count": len([p for p in pts if "agent_" in p]),
                    "has_global_critic": has_gc,
                    "total_size_mb": round(sum(os.path.getsize(p) for p in pts) / (1024 * 1024), 2) if pts else 0.0,
                    "path": full_p,
                    "reward": m.get("mean_reward"),
                    "pdr": m.get("mean_pdr"),
                    "sinr_db": m.get("mean_sinr_db"),
                    "throughput_mbps": m.get("mean_throughput"),
                    "latency_ms": m.get("mean_latency_ms"),
                })

    # Sort so best and chronological episodes appear naturally
    checkpoints.sort(key=lambda c: (not c["is_best"], c["episode"]))
    return {"checkpoints": checkpoints}


@router.post("/checkpoints/load")
async def load_checkpoint(checkpoint_id: str = "best"):
    """Load a specific saved model checkpoint folder into the simulation agent system."""
    models_dir = os.path.join(_project_root, "models", checkpoint_id)
    if not os.path.isdir(models_dir):
        raise HTTPException(status_code=404, detail=f"Checkpoint directory '{checkpoint_id}' not found.")

    try:
        sim_service._try_load_model(models_dir)
        return {
            "status": "loaded",
            "checkpoint_id": checkpoint_id,
            "path": models_dir,
            "message": f"Successfully loaded weights from models/{checkpoint_id}"
        }
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Error loading checkpoint: {ex}")
'''

if "def get_checkpoints():" not in content:
    content = content.rstrip() + new_endpoints + "\n"
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: /checkpoints and /checkpoints/load added to backend")
else:
    print("Already present.")
