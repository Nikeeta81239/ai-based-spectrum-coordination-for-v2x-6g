import React from 'react';
import { formatNumber, formatPercent } from '../utils/formatters';
import AttentionHeatmap from './AttentionHeatmap';
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

export function ExplainabilityPanel({ explanation = null }) {
  if (!explanation) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-sm border border-slate-800 rounded-2xl glass-card">
        Select a vehicle to view decision explainability details.
      </div>
    );
  }

  const {
    vehicle_id,
    selected_channel,
    confidence,
    attention_importance = {},
    feature_importance = {},
    reasons = [],
  } = explanation;

  return (
    <div className="p-6 rounded-2xl border border-slate-800 glass-card space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white font-mono">Vehicle: {vehicle_id}</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-xs font-mono font-bold">
              Channel {selected_channel + 1} Selected
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Decision Confidence: <span className="text-emerald-400 font-bold">{confidence === undefined ? '—' : formatPercent(confidence)}</span>
          </p>
        </div>
        <HelpCircle className="w-6 h-6 text-cyan-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AttentionHeatmap attention={attention_importance} />

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3 font-mono">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Feature Importance Break-down
          </h4>
          <div className="space-y-2.5 text-xs">
            {Object.entries(feature_importance).map(([feature, val]) => (
              <div key={feature} className="flex justify-between items-center">
                <span className="text-slate-300">{feature}</span>
                <span className="text-cyan-400 font-bold">{formatPercent(val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
          Decision Rationale & Rule Explanations
        </h4>
        <div className="space-y-2">
          {reasons.map((reason, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-start gap-2.5 text-slate-300"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ExplainabilityPanel;
