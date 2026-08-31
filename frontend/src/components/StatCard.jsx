import React from 'react';

export function StatCard({ title, value, unit = '', icon: Icon, color = 'cyan', subtext = '' }) {
  const colorMap = {
    cyan: 'from-cyan-500/20 to-blue-500/5 text-cyan-400 border-cyan-500/30',
    emerald: 'from-emerald-500/20 to-green-500/5 text-emerald-400 border-emerald-500/30',
    amber: 'from-amber-500/20 to-orange-500/5 text-amber-400 border-amber-500/30',
    purple: 'from-purple-500/20 to-indigo-500/5 text-purple-400 border-purple-500/30',
    rose: 'from-rose-500/20 to-pink-500/5 text-rose-400 border-rose-500/30',
  };

  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-br border ${colorMap[color] || colorMap.cyan} glass-card relative overflow-hidden transition-all duration-300 hover:scale-[1.02]`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-white font-mono">{value}</span>
        {unit && <span className="text-sm text-slate-400 font-mono">{unit}</span>}
      </div>
      {subtext && <div className="mt-2 text-xs text-slate-400">{subtext}</div>}
    </div>
  );
}

export default StatCard;
