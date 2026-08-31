import React from 'react';
import { History, FileText, CheckCircle2 } from 'lucide-react';

export function ExplanationHistoryLog({ onSelectVehicle }) {
  const historyItems = [
    { time: '08:31:04', vid: 'veh_024', ch: 'CH4', strength: 'High' },
    { time: '08:31:08', vid: 'veh_017', ch: 'CH2', strength: 'Medium' },
    { time: '08:31:12', vid: 'veh_031', ch: 'CH5', strength: 'High' },
    { time: '08:31:16', vid: 'bus_001', ch: 'CH1', strength: 'High' },
  ];

  return (
    <div className="p-5 rounded-2xl glass-card border border-purple-500/30 font-mono space-y-4 shadow-xl">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" />
          EXPLANATION HISTORY LOG
        </h3>
        <span className="text-[10px] text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
          LOGGED XAI RECORDS
        </span>
      </div>

      <div className="space-y-2">
        {historyItems.map((item, idx) => (
          <div
            key={idx}
            onClick={() => onSelectVehicle && onSelectVehicle(item.vid)}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-purple-500/40 cursor-pointer flex items-center justify-between text-xs transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">{item.time}</span>
              <strong className="text-white font-bold">{item.vid} → {item.ch}</strong>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-slate-400">Evidence: <strong className="text-emerald-400">{item.strength}</strong></span>
              <span className="text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">Generated</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExplanationHistoryLog;
