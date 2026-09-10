import React, { useState } from 'react';
import { Layers, Radio, Sparkles } from 'lucide-react';

export function AttentionHeatmap({ attention = null, embedded = false }) {
  const [selectedVehIdx, setSelectedVehIdx] = useState(0);

  const streams = [
    {
      label: 'Spatial Attention',
      key: 'spatial',
      altKey: 'Spatial',
      color: 'bg-cyan-500',
      barColor: '#06b6d4',
      badgeColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/40',
      description: 'Weights spatial proximity, neighbor velocity differential, and local vehicle density (250m radius).',
    },
    {
      label: 'Temporal Attention',
      key: 'temporal',
      altKey: 'Temporal',
      color: 'bg-purple-500',
      barColor: '#8b5cf6',
      badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-950/40',
      description: 'Models trajectory acceleration, time-series speed variance, and previous channel retention.',
    },
    {
      label: 'Application Attention',
      key: 'application',
      altKey: 'Application',
      color: 'bg-amber-500',
      barColor: '#f59e0b',
      badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-950/40',
      description: 'Prioritizes safety-critical URLLC packets (collision alert) over best-effort infotainment data.',
    },
    {
      label: 'Frequency Attention',
      key: 'frequency',
      altKey: 'Frequency',
      color: 'bg-emerald-500',
      barColor: '#10b981',
      badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
      description: 'Evaluates subchannel interference noise, contention levels, and SINR headroom across mmWave bands.',
    },
  ];

  // Determine active attention source
  let activeAttn = attention;
  let vehiclesList = [];
  let statusMessage = null;

  if (attention && typeof attention === 'object') {
    if (Array.isArray(attention.vehicles) && attention.vehicles.length > 0) {
      vehiclesList = attention.vehicles;
      activeAttn = vehiclesList[selectedVehIdx] || vehiclesList[0];
      statusMessage = attention.message;
    } else if (attention.Spatial !== undefined || attention.spatial !== undefined) {
      activeAttn = attention;
    }
  }

  const containerClasses = embedded
    ? 'space-y-4'
    : 'p-5 rounded-2xl border border-slate-800 glass-card space-y-4';

  return (
    <div className={containerClasses}>
      {!embedded && (
        <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Multi-Head Attention Weights
          </h3>
          <span className="text-xs text-slate-400 font-mono">PyTorch MultiStreamAttention</span>
        </div>
      )}

      {/* Vehicle selector if multiple vehicles exist */}
      {vehiclesList.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="text-slate-400 text-[11px]">Inspect Vehicle:</span>
          {vehiclesList.slice(0, 6).map((v, idx) => (
            <button
              key={v.vehicle_id || idx}
              onClick={() => setSelectedVehIdx(idx)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                selectedVehIdx === idx
                  ? 'border-cyan-400 bg-cyan-950/70 text-cyan-300 shadow-md shadow-cyan-500/20'
                  : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-white'
              }`}
            >
              {v.vehicle_id || `Veh ${idx}`}
            </button>
          ))}
        </div>
      )}

      {!activeAttn ? (
        <p className="text-center text-xs font-mono text-slate-500 py-6">
          No attention data currently available. Start a simulation or run evaluation to inspect live weights.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {streams.map((stream) => {
              const rawVal =
                activeAttn[stream.key] ??
                activeAttn[stream.altKey] ??
                activeAttn[stream.label] ??
                0;
              const val = Math.max(0, Math.min(1, Number(rawVal) || 0));
              const percentage = Math.round(val * 100);

              return (
                <div
                  key={stream.key}
                  className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/60 space-y-2 font-mono hover:border-slate-700 transition-all"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${stream.color}`} />
                      {stream.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${stream.badgeColor}`}>
                      {percentage}%
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                    <div
                      className={`h-full ${stream.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-400 font-sans leading-tight">
                    {stream.description}
                  </p>
                </div>
              );
            })}
          </div>

          {statusMessage && (
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>{statusMessage}</span>
              {activeAttn.vehicle_id && (
                <span className="text-cyan-400 font-bold">Active Agent: {activeAttn.vehicle_id}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AttentionHeatmap;
