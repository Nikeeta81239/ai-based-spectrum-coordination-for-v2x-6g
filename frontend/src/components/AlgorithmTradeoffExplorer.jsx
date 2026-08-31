import React, { useState } from 'react';
import { ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { formatNumber } from '../utils/formatters';

export function AlgorithmTradeoffExplorer({ resultsData = null }) {
  const [algA, setAlgA] = useState('proposed');
  const [algB, setAlgB] = useState('greedy');

  const methodsData = resultsData || {
    proposed: { mean_latency_ms: 8.7, mean_pdr: 0.981, mean_sinr_db: 22.4, mean_throughput_mbps: 18.5, mean_interference: 0.18 },
    greedy: { mean_latency_ms: 15.2, mean_pdr: 0.924, mean_sinr_db: 18.1, mean_throughput_mbps: 14.2, mean_interference: 0.42 },
    random: { mean_latency_ms: 41.2, mean_pdr: 0.046, mean_sinr_db: -28.4, mean_throughput_mbps: 1.4, mean_interference: 0.71 },
    round_robin: { mean_latency_ms: 41.3, mean_pdr: 0.040, mean_sinr_db: -29.7, mean_throughput_mbps: 1.2, mean_interference: 0.74 },
  };

  const dataA = methodsData[algA] || methodsData.proposed;
  const dataB = methodsData[algB] || methodsData.greedy;

  const getLabel = (k) => (k === 'proposed' ? 'MARL (Ours)' : k.toUpperCase());

  const rows = [
    { metric: 'Latency (ms)', valA: formatNumber(dataA.mean_latency_ms, 1), valB: formatNumber(dataB.mean_latency_ms, 1), better: dataA.mean_latency_ms < dataB.mean_latency_ms ? getLabel(algA) : getLabel(algB) },
    { metric: 'PDR (%)', valA: `${formatNumber(dataA.mean_pdr * 100, 1)}%`, valB: `${formatNumber(dataB.mean_pdr * 100, 1)}%`, better: dataA.mean_pdr > dataB.mean_pdr ? getLabel(algA) : getLabel(algB) },
    { metric: 'SINR (dB)', valA: formatNumber(dataA.mean_sinr_db, 1), valB: formatNumber(dataB.mean_sinr_db, 1), better: dataA.mean_sinr_db > dataB.mean_sinr_db ? getLabel(algA) : getLabel(algB) },
    { metric: 'Throughput (Mbps)', valA: formatNumber(dataA.mean_throughput_mbps, 1), valB: formatNumber(dataB.mean_throughput_mbps, 1), better: dataA.mean_throughput_mbps > dataB.mean_throughput_mbps ? getLabel(algA) : getLabel(algB) },
    { metric: 'Interference (%)', valA: `${formatNumber(dataA.mean_interference * 100, 1)}%`, valB: `${formatNumber(dataB.mean_interference * 100, 1)}%`, better: dataA.mean_interference < dataB.mean_interference ? getLabel(algA) : getLabel(algB) },
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
