import React from 'react';
import { formatNumber, formatPercent, getAppTypeBadgeClass, getChannelColor } from '../utils/formatters';

export function VehicleTable({ vehicles = [], onSelectVehicle, selectedVehicleId }) {
  if (!vehicles.length) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-sm border border-slate-800 rounded-2xl glass-card">
        No active vehicles in the current simulation step.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 glass-card">
      <table className="w-full text-left text-xs font-mono">
        <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
          <tr>
            <th className="p-3.5 font-semibold">Vehicle ID</th>
            <th className="p-3.5 font-semibold">Speed (m/s)</th>
            <th className="p-3.5 font-semibold">App Type</th>
            <th className="p-3.5 font-semibold">Channel</th>
            <th className="p-3.5 font-semibold">Interference</th>
            <th className="p-3.5 font-semibold">SINR (dB)</th>
            <th className="p-3.5 font-semibold">PDR</th>
            <th className="p-3.5 font-semibold">Throughput (Mbps)</th>
            <th className="p-3.5 font-semibold">Latency (ms)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {vehicles.map((v) => {
            const isSelected = v.vehicle_id === selectedVehicleId;
            return (
              <tr
                key={v.vehicle_id}
                onClick={() => onSelectVehicle && onSelectVehicle(v)}
                className={`transition-colors cursor-pointer hover:bg-slate-800/50 ${
                  isSelected ? 'bg-cyan-500/10 font-semibold' : ''
                }`}
              >
                <td className="p-3.5 text-cyan-400 font-medium">{v.vehicle_id}</td>
                <td className="p-3.5">{formatNumber(v.speed_mps, 1)}</td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase ${getAppTypeBadgeClass(v.app_type)}`}>
                    {v.app_type}
                  </span>
                </td>
                <td className="p-3.5">
                  <span
                    className="px-2 py-0.5 rounded text-white font-bold"
                    style={{ backgroundColor: getChannelColor(v.selected_channel) }}
                  >
                    Ch {v.selected_channel + 1}
                  </span>
                </td>
                <td className="p-3.5">{formatNumber(v.interference, 3)}</td>
                <td className="p-3.5">{formatNumber(v.sinr_db, 1)}</td>
                <td className="p-3.5 text-emerald-400">{formatPercent(v.pdr)}</td>
                <td className="p-3.5">{formatNumber(v.throughput_mbps, 1)}</td>
                <td className="p-3.5">{formatNumber(v.latency_ms, 1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default VehicleTable;
