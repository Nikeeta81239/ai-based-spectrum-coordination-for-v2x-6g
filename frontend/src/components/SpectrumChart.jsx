import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getChannelColor } from '../utils/formatters';

export function SpectrumChart({ channels = [] }) {
  const data = channels.map((ch) => ({
    name: ch.label,
    users: ch.num_users,
    interference: ch.interference,
    channelId: ch.channel_id,
  }));

  return (
    <div className="p-5 rounded-2xl border border-slate-800 glass-card space-y-4">
      <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
        Spectrum Allocation & Active Users
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
            />
            <Bar dataKey="users" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getChannelColor(entry.channelId)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default SpectrumChart;
