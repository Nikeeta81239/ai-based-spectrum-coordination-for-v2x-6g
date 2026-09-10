import React, { useState } from 'react';
import { History, Star, Cpu, CheckCircle2, Database, ShieldCheck } from 'lucide-react';

export function ModelCheckpointTimeline({ status = null }) {
  const [activeCheckpoint, setActiveCheckpoint] = useState(3);

  const device = status?.device
    ? status.device.toUpperCase() === 'CUDA'
      ? 'GPU (NVIDIA CUDA)'
      : 'CPU (PyTorch Threaded)'
    : 'CPU (PyTorch)';

  const modelLoaded = status?.model_loaded ?? true;
  const modelPath = status?.model_path || 'models/best';
  const numAgents = status?.num_agents || 50;

  const checkpoints = [
    {
      ep: 5,
      stage: 'Initial Exploration',
      reward: -0.98,
      pdr: '84.2%',
      sinr: '14.1 dB',
      status: 'Early Policy',
      file: 'agent_veh_000_ep5.pt',
      isBest: false,
    },
    {
      ep: 20,
      stage: 'Curriculum Low Density',
      reward: 4.2,
      pdr: '92.6%',
      sinr: '18.7 dB',
      status: 'Stabilizing',
      file: 'agent_veh_000_ep20.pt',
      isBest: false,
    },
    {
      ep: 35,
      stage: 'Curriculum High Density',
      reward: 12.8,
      pdr: '96.8%',
      sinr: '21.5 dB',
      status: 'Refined Weights',
      file: 'agent_veh_000_ep35.pt',
      isBest: false,
    },
    {
      ep: 50,
      stage: 'Full Multi-Agent Convergence',
      reward: 18.9,
      pdr: '99.4%',
      sinr: '24.2 dB',
      status: 'Production Deployment',
      file: 'global_critic.pt + 50 Agents',
      isBest: true,
    },
  ];

  const selected = checkpoints[activeCheckpoint] || checkpoints[3];

  return (
    <div className="p-5 rounded-2xl glass-card border border-cyan-500/30 font-mono space-y-4 shadow-xl">
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          MODEL CHECKPOINT TIMELINE & SAVED WEIGHTS
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-500/30">
            PYTORCH CHECKPOINTS
          </span>
          <span
            className={`text-[10px] px-2.5 py-1 rounded-full border ${
              modelLoaded
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/60'
                : 'text-amber-400 border-amber-500/30 bg-amber-950/60'
            }`}
          >
            {modelLoaded ? '● WEIGHTS LOADED' : '○ NO CHECKPOINT'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {checkpoints.map((cp, idx) => {
          const isSelected = activeCheckpoint === idx;
          return (
            <button
              key={cp.ep}
              onClick={() => setActiveCheckpoint(idx)}
              className={`p-3.5 rounded-xl border text-left flex flex-col justify-between space-y-2 transition-all ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-500/10'
                  : cp.isBest
                  ? 'border-amber-500/50 bg-amber-950/20 text-amber-200 hover:border-amber-400'
                  : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center text-[10px] uppercase font-bold w-full">
                <span className="text-white">Episode {cp.ep}</span>
                {cp.isBest ? (
                  <span className="flex items-center gap-1 text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                    <Star className="w-3 h-3 fill-amber-400" /> Best ⭐
                  </span>
                ) : (
                  <span className="text-slate-500 text-[9px]">{cp.status}</span>
                )}
              </div>

              <div className="space-y-1 text-[11px] w-full pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Reward:</span>
                  <strong className={cp.reward > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {cp.reward > 0 ? `+${cp.reward}` : cp.reward}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">PDR:</span>
                  <strong className="text-cyan-400">{cp.pdr}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SINR:</span>
                  <strong className="text-purple-400">{cp.sinr}</strong>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-1.5 truncate w-full font-mono">
                {cp.file}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Checkpoint Inspection Banner */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="space-y-0.5">
            <div>
              Active Weights: <strong className="text-white font-bold">{selected.file}</strong>{' '}
              <span className="text-slate-400">({selected.stage})</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Directory: <span className="text-cyan-300">{modelPath}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
          <span>
            Device: <strong className="text-cyan-400">{device}</strong>
          </span>
          <span>
            MAPPO Agents: <strong className="text-purple-400">{numAgents} Trained Actors</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

export default ModelCheckpointTimeline;
