import React from 'react';

export function CoreMetricsPillars({ compute = 76, memory = 89, storage = 45 }) {
  const pillars = [
    {
      label: 'Compute',
      percent: compute,
      color: 'from-cyan-400 to-cyan-500',
      glow: 'rgba(0, 240, 255, 0.6)',
    },
    {
      label: 'Memory',
      percent: memory,
      color: 'from-blue-400 to-cyan-400',
      glow: 'rgba(59, 130, 246, 0.6)',
    },
    {
      label: 'Storage',
      percent: storage,
      color: 'from-purple-400 to-fuchsia-500',
      glow: 'rgba(168, 85, 247, 0.6)',
    },
  ];

  return (
    <div className="elysium-card p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-white text-xs lg:text-sm tracking-wider uppercase font-sans flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          CORE METRICS
        </h3>
      </div>

      {/* 3 Pillars */}
      <div className="flex justify-around items-end h-44 py-2">
        {pillars.map((p, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
            {/* Pillar Track */}
            <div className="w-6 lg:w-7 h-28 rounded-full bg-slate-900/90 border border-slate-800 p-0.5 flex flex-col justify-end overflow-hidden relative shadow-inner">
              {/* Pillar Fill with glow */}
              <div
                className={`w-full rounded-full bg-gradient-to-t ${p.color} transition-all duration-1000 ease-out`}
                style={{
                  height: `${p.percent}%`,
                  boxShadow: `0 0 14px ${p.glow}`,
                }}
              />
            </div>
            <div className="text-center font-mono">
              <div className="text-[10px] text-slate-400">{p.label}</div>
              <div className="text-xs font-bold text-white font-sans">{p.percent}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CoreMetricsPillars;
