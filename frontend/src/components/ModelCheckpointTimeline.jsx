import React from 'react';
import { History, Star, Cpu, CheckCircle2 } from 'lucide-react';

export function ModelCheckpointTimeline({ status = null }) {
  const device = status?.device || 'GPU (CUDA)';
  const lastEpisode = status?.last_episode || 100;

  const checkpoints = [
    { ep: 50, reward: -8.4, pdr: '84.2%', sinr: '14.1 dB', isBest: false },
    { ep: 100, reward: 2.1, pdr: '91.5%', sinr: '18.5 dB', isBest: false },
    { ep: 200, reward: 12.6, pdr: '96.2%', sinr: '21.4 dB', isBest: false },
    { ep: 500, reward: 18.9, pdr: '99.4%', sinr: '24.2 dB', isBest: true },
  ];

  return (
    <div className="p-5 rounded-2xl glass-card border border-cyan-500/30 font-mono space-y-4 shadow-xl">
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          MODEL CHECKPOINT TIMELINE & SAVED WEIGHTS
        </h3>
        <span className="text-[10px] text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-500/30">
          PYTORCH CHECKPOINTS
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center text-xs">
        {checkpoints.map((cp) => (
          <div
            key={cp.ep}
            className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${
              cp.isBest
                ? 'border-amber-500/50 bg-amber-950/30 text-amber-200 shadow-lg shadow-amber-500/10'
                : 'border-slate-800 bg-slate-950/60 text-slate-300'
            }`}
          >
            <div className="flex justify-between items-center text-[10px] uppercase font-bold">
              <span>Episode {cp.ep}</span>
              {cp.isBest && (
                <span className="flex items-center gap-1 text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                  <Star className="w-3 h-3 fill-amber-400" /> Best ⭐
                </span>
              )}
            </div>

            <div className="space-y-1 text-left text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Reward:</span>
                <strong className={cp.reward > 0 ? 'text-emerald-400' : 'text-rose-400'}>{cp.reward}</strong>
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
          </div>
        ))}
      </div>

      {/* Best Model Summary Footer */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Active Checkpoint: <strong className="text-white">models/best/global_critic.pt</strong></span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>Device: <strong className="text-cyan-400">{device}</strong></span>
          <span>Agents: <strong className="text-purple-400">21 PyTorch Actors</strong></span>
        </div>
      </div>
    </div>
  );
}

export default ModelCheckpointTimeline;
