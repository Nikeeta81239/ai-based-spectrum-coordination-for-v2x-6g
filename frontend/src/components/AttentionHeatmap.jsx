import React from 'react';

export function AttentionHeatmap({ attention = null }) {
  const streams = [
    { label: 'Spatial Attention', key: 'spatial', color: 'bg-cyan-500', barColor: '#06b6d4' },
    { label: 'Temporal Attention', key: 'temporal', color: 'bg-purple-500', barColor: '#8b5cf6' },
    { label: 'Application Attention', key: 'application', color: 'bg-amber-500', barColor: '#f59e0b' },
    { label: 'Frequency Attention', key: 'frequency', color: 'bg-emerald-500', barColor: '#10b981' },
  ];

  return (
    <div className="p-5 rounded-2xl border border-slate-800 glass-card space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
          Multi-Head Attention Weights
        </h3>
        <span className="text-xs text-slate-400 font-mono">PyTorch MultiStreamAttention</span>
      </div>

      {!attention ? (
        <p className="text-center text-xs font-mono text-slate-500 py-5">
          Start a simulation to inspect attention weights produced by the active policy.
        </p>
      ) : (
      <div className="space-y-3.5">
        {streams.map((stream) => {
          const val = Number(attention[stream.key] ?? 0);
          const percentage = Math.round(val * 100);

          return (
            <div key={stream.key} className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300 font-medium">{stream.label}</span>
                <span className="text-cyan-400 font-bold">{percentage}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full ${stream.color} transition-all duration-500 rounded-full`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

export default AttentionHeatmap;
