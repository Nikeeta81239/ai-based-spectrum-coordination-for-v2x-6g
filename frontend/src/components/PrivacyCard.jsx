import React from 'react';
import { ShieldCheck, ArrowDownRight, MessageSquare } from 'lucide-react';
import { formatPercent } from '../utils/formatters';

export function PrivacyCard({ privacyMetrics = null }) {
  if (!privacyMetrics?.available) {
    return (
      <div className="p-6 rounded-2xl border border-slate-800 glass-card text-center">
        <h3 className="font-bold text-white">Privacy metrics are waiting for a simulation run</h3>
        <p className="mt-2 text-xs text-slate-400 font-mono">
          Start and advance a simulation to calculate modelled signalling overhead.
        </p>
      </div>
    );
  }

  const { baseline_messages: baselineMessages, proposed_messages: proposedMessages, reduction } = privacyMetrics;

  return (
    <div className="p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 glass-card space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Privacy-Aware Coordination</h3>
            <p className="text-xs text-slate-400 font-mono">Decentralised Local-Critic Deployment</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold">
          {formatPercent(reduction)} Overhead Reduction
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 font-mono">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
            Baseline Centralised Sharing
          </div>
          <div className="text-xl font-bold text-rose-400">{baselineMessages.toLocaleString()} messages</div>
          <div className="text-[11px] text-slate-500 mt-1">One channel-state reading per vehicle and channel</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
            Proposed Local Decisions
          </div>
          <div className="text-xl font-bold text-emerald-400">{proposedMessages.toLocaleString()} messages</div>
          <div className="text-[11px] text-slate-500 mt-1">Compact availability beacon + Local Critic inference</div>
        </div>
      </div>
    </div>
  );
}

export default PrivacyCard;
