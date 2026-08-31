import React from 'react';

export function SystemHealthRings({ efficiency = 94, threats = 0 }) {
  // SVG circular gauge math
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (efficiency / 100) * circumference;

  return (
    <div className="elysium-card p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-white text-xs lg:text-sm tracking-wider uppercase font-sans flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          SYSTEM HEALTH
        </h3>
      </div>

      {/* Dual Concentric Rings */}
      <div className="flex justify-center items-center gap-6 py-2">
        {/* Ring 1: Efficiency (Cyan) */}
        <div className="relative flex items-center justify-center">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="rgba(30, 41, 59, 0.8)"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="url(#efficiencyCyanGradient)"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
              style={{ filter: 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.7))' }}
            />
            <defs>
              <linearGradient id="efficiencyCyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f0ff" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center shadow-inner">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </div>
          </div>
        </div>

        {/* Ring 2: Threats / Collisions (Violet) */}
        <div className="relative flex items-center justify-center">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="rgba(30, 41, 59, 0.8)"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="url(#threatsVioletGradient)"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * 0.98} // zero threats = full circle clean
              strokeLinecap="round"
              fill="transparent"
              style={{ filter: 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.7))' }}
            />
            <defs>
              <linearGradient id="threatsVioletGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#d946ef" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-purple-950/40 border border-purple-500/30 flex items-center justify-center shadow-inner">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Labels below */}
      <div className="flex justify-around items-center text-xs font-mono pt-2 border-t border-slate-800/80">
        <div>
          <span className="text-slate-400 text-[11px]">Efficiency: </span>
          <span className="text-cyan-300 font-bold font-sans">{efficiency}%</span>
        </div>
        <div>
          <span className="text-slate-400 text-[11px]">Threats: </span>
          <span className="text-purple-300 font-bold font-sans">{threats}</span>
        </div>
      </div>
    </div>
  );
}

export default SystemHealthRings;
