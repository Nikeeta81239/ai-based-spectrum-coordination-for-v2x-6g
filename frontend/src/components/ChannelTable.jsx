import React from 'react';
import { formatNumber, formatPercent, getChannelColor } from '../utils/formatters';

export function ChannelTable({ channels = [] }) {
  if (!channels.length) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-sm border border-slate-800 rounded-2xl glass-card">
        No channel data available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 glass-card">
      <table className="w-full text-left text-xs font-mono">
        <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
          <tr>
            <th className="p-3.5 font-semibold">Channel</th>
            <th className="p-3.5 font-semibold">Status</th>
            <th className="p-3.5 font-semibold">Interference</th>
            <th className="p-3.5 font-semibold">Utilisation</th>
            <th className="p-3.5 font-semibold">Active Users</th>
            <th className="p-3.5 font-semibold">Estimated Quality</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {channels.map((ch) => (
            <tr key={ch.channel_id} className="hover:bg-slate-800/40">
              <td className="p-3.5 flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ backgroundColor: getChannelColor(ch.channel_id) }}
                />
                <span className="font-bold text-white">{ch.label}</span>
              </td>
              <td className="p-3.5">
                <span
                  className={`px-2 py-0.5 rounded-full border text-[10px] uppercase font-semibold ${
                    ch.available
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-red-500/20 text-red-400 border-red-500/40'
                  }`}
                >
                  {ch.available ? 'Available' : 'Overloaded'}
                </span>
              </td>
              <td className="p-3.5 font-mono">{formatNumber(ch.interference, 3)}</td>
              <td className="p-3.5">{formatPercent(ch.utilisation)}</td>
              <td className="p-3.5 text-white font-bold">{ch.num_users}</td>
              <td className="p-3.5 text-cyan-400">{formatPercent(ch.estimated_quality)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ChannelTable;
