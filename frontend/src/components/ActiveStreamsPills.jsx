import React from 'react';

export function ActiveStreamsPills({ streams = null }) {
  const defaultStreams = [
    {
      name: 'URLLC Safety (Alpha)',
      percent: 72,
      color: 'from-cyan-400 to-cyan-500',
      glow: 'rgba(0, 240, 255, 0.7)',
    },
    {
      name: 'MARL Coordination (Delta-9)',
      percent: 88,
      color: 'from-blue-500 to-indigo-500',
      glow: 'rgba(59, 130, 246, 0.7)',
    },
    {
      name: 'Privacy Isolation (Epsilon Hub)',
      percent: 65,
      color: 'from-purple-500 to-pink-500',
      glow: 'rgba(217, 70, 239, 0.7)',
    },
  ];

  const streamList = streams || defaultStreams;

  return (
    <div className="elysium-card p-5 rounded-2xl space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-white text-xs lg:text-sm tracking-wider uppercase font-sans flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          ACTIVE PROJECT STREAMS
        </h3>
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400">Status</span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Active
          </span>
        </div>
      </div>

      {/* 3 Horizontal Pill Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {streamList.map((st, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/90 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-slate-700 transition-all shadow-inner"
          >
            <div className="flex justify-between items-center text-xs font-sans">
              <span className="font-bold text-slate-200">{st.name}</span>
              <span className="font-mono font-bold text-white text-sm">{st.percent}%</span>
            </div>

            {/* Glowing horizontal capsule bar */}
            <div className="w-full h-2 rounded-full bg-slate-950 p-0.5 overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${st.color} transition-all duration-1000 ease-out`}
                style={{
                  width: `${st.percent}%`,
                  boxShadow: `0 0 12px ${st.glow}`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActiveStreamsPills;
