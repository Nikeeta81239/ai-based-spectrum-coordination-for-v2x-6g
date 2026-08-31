import React from 'react';
import { Gauge, Activity } from 'lucide-react';

export function ScenarioDifficultyRanking({ activeScenario = 'low' }) {
  const levels = [
    { id: 'low', label: 'Normal Traffic', bar: '███░░', difficulty: 'Low Contention', color: 'text-emerald-400' },
    { id: 'medium', label: 'Medium Density', bar: '████░', difficulty: 'Moderate Contention', color: 'text-cyan-400' },
    { id: 'high', label: 'High Density', bar: '█████', difficulty: 'High Stress', color: 'text-amber-400' },
    { id: 'very_high', label: 'Very High Density', bar: '██████', difficulty: 'Extreme Stress', color: 'text-amber-500' },
    { id: 'congestion', label: 'Traffic Congestion', bar: '███████', difficulty: 'Severe Gridlock', color: 'text-rose-400' },
  ];

  return (
    <div className="p-5 rounded-2xl glass-card border border-cyan-500/30 font-mono space-y-4 shadow-xl">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          SCENARIO DIFFICULTY RANKING (DERIVED FROM CONTEXT)
        </h3>
        <span className="text-[10px] text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-500/30">
          ENVIRONMENT DIFFICULTY
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
        {levels.map((lvl) => {
          const isActive = activeScenario === lvl.id;
          return (
            <div
              key={lvl.id}
              className={`p-3 rounded-xl border flex flex-col justify-between space-y-1.5 ${
                isActive
                  ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-md'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400'
              }`}
            >
              <div className="text-[11px] font-bold text-white">{lvl.label}</div>
              <div className={`text-xs font-mono font-bold tracking-widest ${lvl.color}`}>{lvl.bar}</div>
              <div className="text-[10px] text-slate-400">{lvl.difficulty}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ScenarioDifficultyRanking;
