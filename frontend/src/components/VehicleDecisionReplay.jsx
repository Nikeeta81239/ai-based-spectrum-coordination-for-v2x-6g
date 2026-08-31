import React, { useState } from 'react';
import { History, ArrowDown, Cpu, Activity, CheckCircle } from 'lucide-react';

export function VehicleDecisionReplay({ vehicles = [], histories = {} }) {
  const [selectedVid, setSelectedVid] = useState(vehicles[0]?.vehicle_id || 'V24');

  // Fallback replay history if simulation step hasn't accumulated enough history
  const activeHistory = histories[selectedVid] || [
    { step: 102, channel: 'CH2', status: 'Assigned CH2' },
    { step: 108, channel: 'CH2', status: 'Interference ↑ (0.82)' },
    { step: 109, channel: 'Evaluating', status: 'AI considers CH1, CH3, CH4, CH5' },
    { step: 110, channel: 'CH5', status: 'CH5 SELECTED (MARL Action)' },
    { step: 111, channel: 'CH5', status: 'SINR ↑, Latency ↓ (14 ms)' },
  ];

  return (
    <div className="p-5 rounded-2xl glass-card border border-purple-500/30 font-mono space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" />
          VEHICLE DECISION REPLAY
        </h3>

        {/* Vehicle Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold">Select:</span>
          <select
            value={selectedVid}
            onChange={(e) => setSelectedVid(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-purple-500/40 bg-slate-900 text-purple-300 text-xs font-bold focus:outline-none"
          >
            {vehicles.length > 0 ? (
              vehicles.map((v) => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  Vehicle {v.vehicle_id}
                </option>
              ))
            ) : (
              <option value="V24">Vehicle V24</option>
            )}
          </select>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div className="text-xs text-purple-300 font-bold uppercase tracking-wider">
          {selectedVid} DECISION TIMELINE
        </div>

        <div className="space-y-2 relative pl-4 border-l border-purple-500/30">
          {activeHistory.slice(-6).map((item, idx) => (
            <div key={idx} className="relative space-y-0.5">
              {/* Dot on timeline */}
              <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-purple-400 border border-slate-900" />

              <div className="flex items-center justify-between text-xs">
                <span className="text-cyan-400 font-bold">Step {item.step}</span>
                <span className="text-slate-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {item.channel}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{item.status || item.action_taken}</p>

              {idx < activeHistory.slice(-6).length - 1 && (
                <div className="text-purple-400/60 text-center text-[10px] my-1">↓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 italic">
        "The vehicle does not randomly change channels. The MARL agent observes the environment and changes the channel when the network condition changes."
      </p>
    </div>
  );
}

export default VehicleDecisionReplay;
