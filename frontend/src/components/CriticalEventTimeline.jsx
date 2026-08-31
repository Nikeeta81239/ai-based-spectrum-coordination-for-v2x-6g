import React from 'react';
import { Clock, Activity, Zap, CheckCircle, Radio } from 'lucide-react';

export function CriticalEventTimeline({ events = [] }) {
  // If no timeline events yet, display standard story events
  const timelineEvents = events && events.length > 0 ? events.slice(-8) : [
    { time: '12:31:04', text: 'V17 entered congested area' },
    { time: '12:31:05', text: 'CH2 interference increased' },
    { time: '12:31:05', text: 'MARL detected channel conflict' },
    { time: '12:31:06', text: 'V17 → CH4' },
    { time: '12:31:07', text: 'SINR improved (+4.2 dB)' },
  ];

  return (
    <div className="p-5 rounded-2xl glass-card border border-cyan-500/20 font-mono space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Critical Event Timeline
        </h3>
        <span className="text-[10px] text-cyan-400/80 bg-cyan-950/40 px-2.5 py-1 rounded-full border border-cyan-500/20">
          LIVE AI STORY LOG
        </span>
      </div>

      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
        {timelineEvents.map((item, idx) => {
          const isDecision = item.text.includes('→');
          const isImprovement = item.text.includes('improved');
          const isConflict = item.text.includes('conflict') || item.text.includes('increased');

          return (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border text-xs flex items-center gap-3 transition-all ${
                isDecision
                  ? 'border-cyan-500/40 bg-cyan-950/30 text-cyan-200'
                  : isImprovement
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                  : isConflict
                  ? 'border-amber-500/30 bg-amber-950/20 text-amber-300'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300'
              }`}
            >
              <span className="text-[11px] text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                {item.time || '12:31:' + (10 + idx)}
              </span>
              <span className="flex-1 text-slate-200 leading-snug">
                {item.text}
              </span>
              {isDecision && <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-bounce" />}
              {isImprovement && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CriticalEventTimeline;
