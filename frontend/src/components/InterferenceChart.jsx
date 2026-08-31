import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function InterferenceChart({ history = [] }) {
  return (
    <div className="p-5 rounded-2xl border border-slate-800 glass-card space-y-4">
      <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
        Interference Level Over Time
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time_step" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis domain={[0, 1]} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
            />
            <Line
              type="monotone"
              dataKey="mean_interference"
              name="Mean Interference"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default InterferenceChart;
