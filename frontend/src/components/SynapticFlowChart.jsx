import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const flowData = [
  { month: 'Jan', nodes: 8000, throughput: 14000 },
  { month: 'Feb', nodes: 24000, throughput: 16000 },
  { month: 'Mar', nodes: 22000, throughput: 14500 },
  { month: 'Apr', nodes: 31000, throughput: 28000 },
  { month: 'May', nodes: 36000, throughput: 24000 },
  { month: 'Jun', nodes: 44000, throughput: 38000 },
  { month: 'Jul', nodes: 42000, throughput: 35000 },
  { month: 'Aug', nodes: 54000, throughput: 49000 },
];

export function SynapticFlowChart({ activeVehicles = 21, throughput = 18.7 }) {
  return (
    <div className="elysium-card p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
      {/* Background glow blob */}
      <div className="absolute -top-10 -left-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-white text-xs lg:text-sm tracking-wider uppercase font-sans flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          SYNAPTIC FLOW
        </h3>
        <button className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5 hover:border-cyan-500/40 transition-all">
          <span>Active Nodes</span>
          <span className="text-cyan-400 text-[10px]">▼</span>
        </button>
      </div>

      {/* Chart */}
      <div className="h-52 w-full my-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={flowData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="cyanGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="violetGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d946ef" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#d946ef" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(7, 11, 26, 0.95)',
                borderColor: 'rgba(0, 240, 255, 0.3)',
                borderRadius: '0.75rem',
                fontSize: '11px',
                boxShadow: '0 0 15px rgba(0, 240, 255, 0.2)'
              }}
            />
            <Area type="natural" dataKey="nodes" stroke="#00f0ff" strokeWidth={2.5} fillOpacity={1} fill="url(#cyanGlow)" dot={{ stroke: '#00f0ff', strokeWidth: 2, r: 3, fill: '#070b1a' }} />
            <Area type="natural" dataKey="throughput" stroke="#d946ef" strokeWidth={2.5} fillOpacity={1} fill="url(#violetGlow)" dot={{ stroke: '#d946ef', strokeWidth: 2, r: 3, fill: '#070b1a' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer info bar */}
      <div className="flex justify-between items-center text-xs font-mono pt-3 border-t border-slate-800/80 text-slate-300">
        <div>
          <span className="text-slate-400">Active Nodes: </span>
          <span className="text-cyan-300 font-bold font-sans">1,421</span>
        </div>
        <div>
          <span className="text-slate-400">Throughput: </span>
          <span className="text-purple-300 font-bold font-sans">18.7 PB/s</span>
        </div>
      </div>
    </div>
  );
}

export default SynapticFlowChart;
