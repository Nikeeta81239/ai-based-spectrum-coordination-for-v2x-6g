import React from 'react';
import { AlertTriangle, Zap, Radio, CheckCircle } from 'lucide-react';

export function LiveWhatChangedAlert({ alert = null }) {
  const currentAlert = alert || {
    title: '⚠ Spectrum Conflict Detected',
    vehicle_id: 'V24',
    current_channel: 'CH2',
    interference_pct: '82%',
    ai_action: 'CH2 → CH5',
    reason: 'CH5 has lower interference and sufficient capacity.',
  };

  const { title, vehicle_id, current_channel, interference_pct, ai_action, reason } = currentAlert;

  return (
    <div className="p-4 rounded-2xl glass-card border border-amber-500/40 bg-amber-950/20 font-mono space-y-3 shadow-lg relative">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
          LIVE EVENT — {title}
        </span>
        <span className="text-[10px] text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/30">
          AUTOMATIC DETECTION
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
          <div className="text-[10px] text-slate-500 uppercase">Vehicle</div>
          <div className="font-bold text-white mt-0.5">{vehicle_id}</div>
        </div>

        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
          <div className="text-[10px] text-slate-500 uppercase">Current Channel</div>
          <div className="font-bold text-rose-400 mt-0.5">
            {current_channel} (Interference: {interference_pct})
          </div>
        </div>

        <div className="p-2.5 rounded-xl border border-cyan-500/40 bg-cyan-950/30">
          <div className="text-[10px] text-cyan-400 font-bold uppercase">AI Action</div>
          <div className="font-bold text-cyan-300 mt-0.5">{ai_action}</div>
        </div>

        <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20">
          <div className="text-[10px] text-emerald-400 font-bold uppercase">Reason</div>
          <div className="text-[11px] text-emerald-300 mt-0.5 leading-snug">{reason}</div>
        </div>
      </div>
    </div>
  );
}

export default LiveWhatChangedAlert;
