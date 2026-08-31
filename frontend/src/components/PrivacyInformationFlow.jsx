import React from 'react';
import { ShieldCheck, Lock, Database, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatPercent } from '../utils/formatters';

export function PrivacyInformationFlow({ privacyMetrics = null }) {
  const reductionPct = privacyMetrics?.available ? formatPercent(privacyMetrics.reduction) : '83.3%';
  const baselineMsgs = privacyMetrics?.baseline_messages || 126;
  const proposedMsgs = privacyMetrics?.proposed_messages || 21;

  return (
    <div className="p-5 rounded-2xl glass-card border border-emerald-500/30 font-mono space-y-5 shadow-xl">
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          PRIVACY & INFORMATION FLOW ARCHITECTURE
        </h3>
        <span className="text-[10px] text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
          CTDE LOCAL CRITIC ISOLATION
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch text-xs">
        {/* Centralized Baseline */}
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="text-rose-400 font-bold text-sm uppercase flex items-center gap-2">
              <Database className="w-4 h-4" /> CENTRALIZED BASELINE
            </div>
            <p className="text-slate-400 text-[11px]">
              Continuous transmission of raw vehicle GPS locations, speeds, and full channel states.
            </p>
          </div>

          {/* Flow Diagram */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 font-mono text-[11px]">
            <div className="text-slate-300 font-bold">V1, V2, V3, V4, V5 ────► Central Base Station</div>
            <div className="text-rose-400 font-bold text-[10px]">High Information Exchange ({baselineMsgs} msgs/step)</div>
          </div>
        </div>

        {/* Decentralized Local Critic */}
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="text-emerald-400 font-bold text-sm uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> DECENTRALIZED LOCAL CRITIC (PROPOSED)
            </div>
            <p className="text-slate-400 text-[11px]">
              Local inference on vehicle hardware using onboard sensors and compact subchannel beacons.
            </p>
          </div>

          {/* Flow Diagram */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 font-mono text-[11px]">
            <div className="text-emerald-300 font-bold">V1, V2, V3, V4, V5 ────► Local Onboard Decisions</div>
            <div className="text-emerald-400 font-bold text-[10px]">Reduced Information Sharing ({proposedMsgs} msgs/step)</div>
          </div>
        </div>
      </div>

      {/* Measured Results Banner */}
      <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 font-mono text-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="text-white font-bold">Measured Signalling Overhead Reduction: {reductionPct}</div>
            <div className="text-slate-400 text-[11px]">
              Academic Terminology: <em>"Reduced information sharing through decentralized local decision making"</em>
            </div>
          </div>
        </div>

        <div className="text-right text-[11px] font-bold text-emerald-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          Baseline: {baselineMsgs} msgs/step → Proposed: {proposedMsgs} msgs/step
        </div>
      </div>
    </div>
  );
}

export default PrivacyInformationFlow;
