import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function PDRChart({ history = [] }) {
  const formattedData = history.map((h) => ({
    ...h,
    pdr_pct: h.mean_pdr != null ? Number((h.mean_pdr > 1 ? h.mean_pdr : h.mean_pdr * 100).toFixed(1)) : 0,
  }));

  return (
    <div className="p-5 rounded-2xl border border-slate-800 glass-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
          Packet Delivery Ratio (PDR)
        </h3>
        <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
          Reliability (%)
        </span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData}>
            <defs>
              <linearGradient id="pdrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time_step" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis domain={[0, 100]} unit="%" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
              formatter={(val) => [`${val}%`, 'PDR']}
            />
            <Area
              type="monotone"
              dataKey="pdr_pct"
              name="Packet Delivery Ratio"
              stroke="#06b6d4"
              fillOpacity={1}
              fill="url(#pdrGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default PDRChart;
