import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export function ExplanationEvidenceIndicator({ evidenceStrength = 'HIGH' }) {
  const checklist = [
    { label: 'Model Attention', verified: true },
    { label: 'Physical Metrics', verified: true },
    { label: 'Decision Output', verified: true },
    { label: 'Counterfactual Data', verified: true },
  ];

  return (
    <div className="p-4 rounded-2xl glass-card border border-emerald-500/30 font-mono text-xs space-y-3 shadow-lg">
      <div className="flex justify-between items-center">
        <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          EXPLANATION EVIDENCE CHECKLIST
        </span>
        <div className="px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 font-bold text-[10px]">
          Evidence Strength: {evidenceStrength}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {checklist.map((item, idx) => (
          <div key={idx} className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-300 text-[11px]">{item.label}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExplanationEvidenceIndicator;
