import React, { useState } from 'react';
import { AlertTriangle, Radio, Users, Cpu, ArrowRightLeft } from 'lucide-react';

export function ChannelConflictGraph({ channels = [], vehicles = [] }) {
  const [selectedChannelId, setSelectedChannelId] = useState(0);

  const selectedCh = channels.find((c) => c.channel_id === selectedChannelId) || channels[0] || {
    channel_id: 0,
    label: 'Ch 1',
    interference: 0.25,
    utilisation: 0.6,
    num_users: 3,
    assigned_vehicles: ['V12', 'V19', 'V24'],
    conflicts: ['V12 ↔ V19', 'V19 ↔ V24', 'V12 ↔ V24'],
  };

  const assigned = selectedCh.assigned_vehicles || ['V12', 'V19', 'V24'];
  const conflicts = selectedCh.conflicts || ['V12 ↔ V19', 'V19 ↔ V24', 'V12 ↔ V24'];

  const interfPct = Math.round((selectedCh.interference || 0) * 100);
  const isHighInterf = interfPct > 45;

  return (
    <div className="p-5 rounded-2xl glass-card border border-cyan-500/30 font-mono space-y-5 shadow-xl">
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          CHANNEL CONFLICT GRAPH (VEHICLE-TO-SPECTRUM INTERACTION)
        </h3>
        <span className="text-[10px] text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-500/30">
          NETWORK CONTEXT
        </span>
      </div>

      {/* Subchannel Selector Pills */}
      <div className="flex flex-wrap gap-2">
        {channels.map((ch) => {
          const isSelected = ch.channel_id === selectedChannelId;
          const userCount = ch.num_users || 0;
          return (
            <button
              key={ch.channel_id}
              onClick={() => setSelectedChannelId(ch.channel_id)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                isSelected
                  ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 shadow-md shadow-cyan-500/20'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span>{ch.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${userCount > 2 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>
                {userCount} veh
              </span>
            </button>
          );
        })}
      </div>

      {/* Graph Visualizer & Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Visual Graph Diagram */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 flex flex-col items-center justify-center space-y-4 min-h-[220px] relative overflow-hidden">
          <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">
            Interference Topology for {selectedCh.label}
          </div>

          {/* Central Channel Node */}
          <div className={`px-4 py-2 rounded-2xl border font-bold text-xs uppercase flex items-center gap-2 shadow-lg ${isHighInterf ? 'border-amber-500 bg-amber-950/40 text-amber-300' : 'border-cyan-500 bg-cyan-950/40 text-cyan-300'}`}>
            <Radio className="w-4 h-4 animate-pulse" />
            {selectedCh.label} ({interfPct}% Interference)
          </div>

          {/* Connected Vehicle Nodes */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {assigned.slice(0, 5).map((vid, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="min-w-10 px-2 h-10 rounded-full border border-purple-500/50 bg-purple-950/40 flex items-center justify-center text-purple-300 font-bold text-xs shadow-md">
                  {vid.toString().toLowerCase().startsWith('veh') ? vid : `Veh ${vid}`}
                </div>
                <span className="text-[9px] text-slate-400 mt-1">Agent {idx + 1}</span>
              </div>
            ))}
          </div>

          {isHighInterf && (
            <div className="text-[11px] text-amber-400 font-bold flex items-center gap-1 bg-amber-950/40 px-3 py-1 rounded-full border border-amber-500/30">
              <AlertTriangle className="w-3.5 h-3.5" /> High Interference Contention Detected
            </div>
          )}
        </div>

        {/* Selected Channel Analysis Breakdown */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-3">
          <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider">
            {selectedCh.label} Conflict Analysis
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Vehicles</div>
              <div className="font-bold text-white mt-0.5">{selectedCh.num_users || assigned.length}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Utilization</div>
              <div className="font-bold text-purple-400 mt-0.5">{Math.round((selectedCh.utilisation || 0) * 100)}%</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Interference</div>
              <div className={`font-bold mt-0.5 ${isHighInterf ? 'text-amber-400' : 'text-emerald-400'}`}>
                {isHighInterf ? 'High' : 'Low'} ({interfPct}%)
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3 text-cyan-400" /> Main Vehicle Conflicts:
              </div>
              <span className="text-[10px] text-slate-500 font-sans">Co-channel radio contention pairs</span>
            </div>
            {conflicts.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {conflicts.map((pair, idx) => {
                    // Normalize "103 ↔ 104" to "Veh 103 ↔ Veh 104"
                    const formattedPair = pair
                      .split('↔')
                      .map((s) => s.trim())
                      .map((v) => (v.toLowerCase().startsWith('veh') ? v : `Veh ${v}`))
                      .join(' ↔ ');
                    return (
                      <span key={idx} className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-950/30 text-amber-300 text-[11px] font-bold">
                        {formattedPair}
                      </span>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-tight">
                  <span className="text-amber-400 font-bold">What this means:</span> These vehicle pairs are transmitting on this same frequency at the same time, interfering with each other's V2X signals.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-emerald-400 italic">No co-channel vehicle conflicts detected on this subchannel.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChannelConflictGraph;
