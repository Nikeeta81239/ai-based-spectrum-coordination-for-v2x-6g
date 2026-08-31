import React from 'react';
import { ArrowDown, ArrowRight, Activity, ShieldCheck, Zap } from 'lucide-react';

export function AIDecisionImpactCard({ impact = null }) {
  // Use real measured BEFORE/AFTER impact if available, otherwise display active demo measurement
  const currentImpact = impact || {
    vehicle_id: 'V17',
    before: {
      latency_ms: 31,
      interference: 'High',
      channel: 'CH2',
    },
    decision: 'V17 → CH4',
    after: {
      latency_ms: 18,
      interference: 'Low',
      channel: 'CH4',
    },
  };

  const { vehicle_id, before, decision, after } = currentImpact;

  return (
    <div className="p-5 rounded-2xl glass-card border border-purple-500/30 font-mono space-y-4 relative overflow-hidden">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          AI Decision Impact
        </h3>
        <span className="text-[10px] text-purple-300 bg-purple-950/40 px-2.5 py-1 rounded-full border border-purple-500/30">
          BEFORE / AFTER MEASURED METRICS
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-center">
        {/* BEFORE CARD */}
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/20 space-y-2">
          <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
            BEFORE
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Latency:</span>
              <strong className="text-rose-400">{before.latency_ms} ms</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Interference:</span>
              <strong className="text-rose-400">{before.interference}</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Channel:</span>
              <strong className="text-slate-200">{before.channel}</strong>
            </div>
          </div>
        </div>

        {/* DECISION ACTION */}
        <div className="p-3 rounded-xl border border-cyan-500/40 bg-cyan-950/40 space-y-1.5 flex flex-col items-center justify-center">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
            ↓ AI DECISION
          </span>
          <div className="px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-bold text-sm">
            {decision}
          </div>
        </div>

        {/* AFTER CARD */}
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
          <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
            AFTER
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Latency:</span>
              <strong className="text-emerald-400">{after.latency_ms} ms</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Interference:</span>
              <strong className="text-emerald-400">{after.interference}</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Channel:</span>
              <strong className="text-emerald-300">{after.channel}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIDecisionImpactCard;
