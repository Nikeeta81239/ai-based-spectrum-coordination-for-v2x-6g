import React from 'react';
import { History, ArrowDown, Zap, Activity } from 'lucide-react';

export function SpectrumDecisionReplay({ timeStep = 0, latestImpact = null }) {
  const replaySteps = [
    { time: `t=${Math.max(1, timeStep - 3)}s`, text: 'CH2 → Overloaded (High Co-Channel Interference)' },
    { time: `t=${Math.max(1, timeStep - 2)}s`, text: 'MARL detects channel contention' },
    { time: `t=${Math.max(1, timeStep - 1)}s`, text: latestImpact ? latestImpact.decision : 'V24: CH2 → CH5' },
    { time: `t=${timeStep}s`, text: 'CH2 utilization ↓ | Vehicle SINR ↑ (+4.2 dB)' },
  ];

  return (
    <div className="p-5 rounded-2xl glass-card border border-purple-500/30 font-mono space-y-4 shadow-xl">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" />
          SPECTRUM DECISION REPLAY (NETWORK-LEVEL EVOLUTION)
        </h3>
        <span className="text-[10px] text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded-full border border-purple-500/30">
          GLOBAL STATE TRANSITIONS
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
        {replaySteps.map((step, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <div className="w-full p-3 rounded-xl border border-purple-500/30 bg-slate-950/80 space-y-1.5 min-h-[100px] flex flex-col justify-between">
              <span className="text-[10px] text-purple-400 font-bold uppercase bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                {step.time}
              </span>
              <p className="text-xs text-slate-200 font-bold leading-tight">
                {step.text}
              </p>
            </div>
            {idx < replaySteps.length - 1 && (
              <div className="text-purple-400 text-xs my-1 hidden sm:block">→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SpectrumDecisionReplay;
