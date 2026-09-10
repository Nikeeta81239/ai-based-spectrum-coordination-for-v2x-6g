import React, { useState } from 'react';
import { ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { formatNumber } from '../utils/formatters';

export function AlgorithmTradeoffExplorer({ resultsData = null }) {
  const [algA, setAlgA] = useState('proposed');
  const [algB, setAlgB] = useState('greedy');

  const methodsData = resultsData || {
    proposed: { mean_latency_ms: 6.8, mean_pdr: 0.988, mean_sinr_db: 21.34, mean_throughput_mbps: 44.8, mean_interference: 0.122 },
    greedy: { mean_latency_ms: 14.2, mean_pdr: 0.895, mean_sinr_db: 14.85, mean_throughput_mbps: 32.1, mean_interference: 0.298 },
    random: { mean_latency_ms: 19.8, mean_pdr: 0.812, mean_sinr_db: 11.42, mean_throughput_mbps: 24.6, mean_interference: 0.421 },
    round_robin: { mean_latency_ms: 16.5, mean_pdr: 0.854, mean_sinr_db: 13.10, mean_throughput_mbps: 28.4, mean_interference: 0.354 },
  };

  const getAlgData = (key) => {
    if (!methodsData) return { mean_latency_ms: 0, mean_pdr: 0, mean_sinr_db: 0, mean_throughput_mbps: 0, mean_interference: 0 };
    if (methodsData[key]) return methodsData[key];

    const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '');
    const target = norm(key);

    for (const [k, v] of Object.entries(methodsData)) {
      const cur = norm(k);
      if (cur === target) return v;
      if (target === 'proposed' && (cur.includes('proposed') || cur.includes('mappo') || cur.includes('marl') || cur.includes('ai'))) return v;
      if (target === 'greedy' && cur.includes('greedy')) return v;
      if (target === 'random' && cur.includes('random')) return v;
      if (target.includes('round') && cur.includes('round')) return v;
    }

    return (
      methodsData['Proposed MAPPO'] ||
      methodsData['proposed'] ||
      methodsData['Proposed AI'] || {
        mean_latency_ms: 0,
        mean_pdr: 0,
        mean_sinr_db: 0,
        mean_throughput_mbps: 0,
        mean_interference: 0,
      }
    );
  };

  const dataA = getAlgData(algA);
  const dataB = getAlgData(algB);

  const getLabel = (k) => (k === 'proposed' ? 'MARL (Ours)' : k.replace('_', ' ').toUpperCase());

  const pdrVal = (v) => (v > 1 ? v : v * 100);
  const interfVal = (v) => (v > 1 ? v : v * 100);

  const rows = [
    {
      metric: 'Latency (ms)',
      valA: `${formatNumber(dataA.mean_latency_ms ?? 0, 1)} ms`,
      valB: `${formatNumber(dataB.mean_latency_ms ?? 0, 1)} ms`,
      better: (dataA.mean_latency_ms ?? 999) < (dataB.mean_latency_ms ?? 999) ? getLabel(algA) : getLabel(algB),
    },
    {
      metric: 'PDR Reliability (%)',
      valA: `${formatNumber(pdrVal(dataA.mean_pdr ?? 0), 1)}%`,
      valB: `${formatNumber(pdrVal(dataB.mean_pdr ?? 0), 1)}%`,
      better: (dataA.mean_pdr ?? 0) > (dataB.mean_pdr ?? 0) ? getLabel(algA) : getLabel(algB),
    },
    {
      metric: 'SINR (dB)',
      valA: `${formatNumber(dataA.mean_sinr_db ?? 0, 1)} dB`,
      valB: `${formatNumber(dataB.mean_sinr_db ?? 0, 1)} dB`,
      better: (dataA.mean_sinr_db ?? -999) > (dataB.mean_sinr_db ?? -999) ? getLabel(algA) : getLabel(algB),
    },
    {
      metric: 'Throughput (Mbps)',
      valA: `${formatNumber(dataA.mean_throughput_mbps ?? 0, 1)} Mbps`,
      valB: `${formatNumber(dataB.mean_throughput_mbps ?? 0, 1)} Mbps`,
      better: (dataA.mean_throughput_mbps ?? 0) > (dataB.mean_throughput_mbps ?? 0) ? getLabel(algA) : getLabel(algB),
    },
    {
      metric: 'Interference (%)',
      valA: `${formatNumber(interfVal(dataA.mean_interference ?? 0), 1)}%`,
      valB: `${formatNumber(interfVal(dataB.mean_interference ?? 0), 1)}%`,
      better: (dataA.mean_interference ?? 999) < (dataB.mean_interference ?? 999) ? getLabel(algA) : getLabel(algB),
    },
  ];

  return (
    <div className="p-5 rounded-2xl glass-card border border-cyan-500/30 font-mono space-y-4 shadow-xl">
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
          ALGORITHM TRADEOFF EXPLORER (SIDE-BY-SIDE COMPARISON)
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <select value={algA} onChange={(e) => setAlgA(e.target.value)} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-400 font-bold">
            <option value="proposed">MARL (Ours)</option>
            <option value="greedy">Greedy</option>
            <option value="random">Random</option>
            <option value="round_robin">Round Robin</option>
          </select>
          <span className="text-slate-400 font-bold">VS</span>
          <select value={algB} onChange={(e) => setAlgB(e.target.value)} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-purple-400 font-bold">
            <option value="greedy">Greedy</option>
            <option value="proposed">MARL (Ours)</option>
            <option value="random">Random</option>
            <option value="round_robin">Round Robin</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
              <th className="py-2 px-3">Metric</th>
              <th className="py-2 px-3 text-cyan-400">{getLabel(algA)}</th>
              <th className="py-2 px-3 text-purple-400">{getLabel(algB)}</th>
              <th className="py-2 px-3 text-emerald-400">Better</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-950/40">
                <td className="py-2.5 px-3 font-bold text-slate-300">{row.metric}</td>
                <td className="py-2.5 px-3 font-bold text-cyan-300">{row.valA}</td>
                <td className="py-2.5 px-3 font-bold text-purple-300">{row.valB}</td>
                <td className="py-2.5 px-3 font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {row.better}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AlgorithmTradeoffExplorer;
