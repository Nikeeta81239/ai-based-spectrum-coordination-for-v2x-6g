import React from 'react';
import { Sliders, Cpu, CheckCircle2, ShieldCheck } from 'lucide-react';

export function ExperimentConfigSnapshot({ scenario = 'high', expId = 'EXP-2026-0831-0042' }) {
  const config = {
    scenario: scenario.toUpperCase(),
    vehicles: scenario === 'congestion' ? 300 : scenario === 'high' ? 100 : scenario === 'medium' ? 50 : 21,
    channels: 6,
    frequency: '28 GHz (mmWave)',
    bandwidth: '10 MHz',
    tx_power: '23 dBm',
    steps: 100,
    model_checkpoint: 'models/best/global_critic.pt',
    timestamp: '2026-08-31 08:48:00',
  };

  return (
    <div className="p-5 rounded-2xl glass-card border border-cyan-500/30 font-mono space-y-4 shadow-xl">
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-white font-bold text-xs uppercase">
          <Sliders className="w-4 h-4 text-cyan-400" />
          EXPERIMENT CONFIGURATION SNAPSHOT
        </div>
        <div className="px-3 py-1 rounded-xl bg-slate-950 border border-cyan-500/40 text-cyan-300 font-bold text-xs">
          Reproducibility ID: {expId}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
          <div className="text-[10px] text-slate-500 uppercase">Scenario / Vehicles</div>
          <div className="font-bold text-white mt-0.5">{config.scenario} ({config.vehicles} veh)</div>
        </div>

        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
          <div className="text-[10px] text-slate-500 uppercase">Carrier Freq / Bandwidth</div>
          <div className="font-bold text-purple-400 mt-0.5">{config.frequency} | {config.bandwidth}</div>
        </div>

        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
          <div className="text-[10px] text-slate-500 uppercase">Tx Power / Channels</div>
          <div className="font-bold text-amber-400 mt-0.5">{config.tx_power} | {config.channels} Ch</div>
        </div>

        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
          <div className="text-[10px] text-slate-500 uppercase">Active Checkpoint</div>
          <div className="font-bold text-emerald-400 mt-0.5 truncate">{config.model_checkpoint}</div>
        </div>
      </div>
    </div>
  );
}

export default ExperimentConfigSnapshot;
