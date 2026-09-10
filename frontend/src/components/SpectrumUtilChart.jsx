import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function SpectrumUtilChart({ history = [] }) {
  const formattedData = history.map((h) => ({
    ...h,
    util_pct: h.spectrum_utilization != null
      ? Number(h.spectrum_utilization.toFixed(1))
      : (h.active_channels != null ? Number(((h.active_channels / 6) * 100).toFixed(1)) : 0),
  }));

  return (
    <div className="p-5 rounded-2xl border border-slate-800 glass-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
          Spectrum Utilization Over Time
        </h3>
        <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
          Capacity Used (%)
        </span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData}>
            <defs>
              <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time_step" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis domain={[0, 100]} unit="%" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
              formatter={(val) => [`${val}%`, 'Spectrum Utilization']}
            />
            <Area
              type="monotone"
              dataKey="util_pct"
              name="Spectrum Utilization"
              stroke="#f59e0b"
              fillOpacity={1}
              fill="url(#utilGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default SpectrumUtilChart;
