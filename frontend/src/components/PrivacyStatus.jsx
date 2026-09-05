import React from 'react';
import { Shield, Lock, AlertCircle } from 'lucide-react';

/**
 * Compact Privacy Status card for the Dashboard.
 * Uses the same real backend values as the full PrivacyAnalysis on the Spectrum page.
 * All percentages are calculated from actual sensitive-data telemetry only.
 */
export function PrivacyStatus({ privacyMetrics }) {

  /* ── No data state ─────────────────────────────────────────── */
  if (!privacyMetrics?.available) {
    return (
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 flex items-center gap-4 text-slate-400 text-sm">
        <AlertCircle className="w-6 h-6 text-slate-600 shrink-0" />
        <div>
          <div className="font-semibold text-slate-300">Privacy data unavailable</div>
          <div className="text-xs mt-0.5">Start a simulation to see real privacy metrics.</div>
        </div>
      </div>
    );
  }

  /* ── Calculations (from real telemetry only) ───────────────── */
  const generated  = privacyMetrics.sensitive_data_generated_bytes  || 0;
  const exposed    = privacyMetrics.exposed_data_bytes               || 0;
  const shared     = privacyMetrics.proposed_transmitted_bytes       || 0;
  const overheadR  = privacyMetrics.overhead_reduction_pct           || 0;

  const protectedPct = generated > 0 ? ((generated - exposed) / generated) * 100 : 0;
  const exposedPct   = generated > 0 ? (exposed / generated) * 100               : 0;

  const summaryLine =
    protectedPct >= 100
      ? '100% of measured sensitive data remained local in this simulation.'
      : `${protectedPct.toFixed(1)}% of measured sensitive data remained local in this simulation.`;

  /* ── Bar ───────────────────────────────────────────────────── */
  const Bar = ({ pct, color, label, valueColor }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-slate-400 uppercase tracking-wide">{label}</span>
        <span className={`font-bold ${valueColor}`}>{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(Math.max(pct, pct > 0 ? 1 : 0), 100)}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/10">
        <Shield className="w-7 h-7 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-3 w-full">
          <div>
            <h3 className="text-base font-bold text-white">Privacy Protection Measurement</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Figures reflect observed data crossing the vehicle boundary in this simulation run — not a formal privacy proof.
            </p>
          </div>

          {/* Bars */}
          <div className="space-y-2">
            <Bar pct={protectedPct} color="bg-emerald-500" label="Protected" valueColor="text-emerald-400" />
            <Bar pct={exposedPct}   color="bg-rose-500"    label="Exposed"   valueColor={exposedPct > 0 ? 'text-rose-400' : 'text-slate-500'} />
          </div>

          <p className="text-xs text-slate-300 italic border-l-2 border-emerald-500/40 pl-2">{summaryLine}</p>

          {exposed === 0 && (
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <span className="text-emerald-400 font-semibold">Why 0 B exposed: </span>
              The Privacy Gateway filters out GPS, speed, trajectory, and vehicle ID before transmission.
              Only non-sensitive coordination signals (density token, subchannel request) are sent.
              This is based on the implementation's field classification, not an independent audit.
            </p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 font-mono text-xs">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase mb-0.5">Data Shared</div>
          <div className="text-base font-bold text-purple-400">{shared.toLocaleString()} B</div>
          <div className="text-[10px] text-slate-500">Coordination only — not sensitive</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase mb-0.5">Overhead Reduction</div>
          <div className="text-base font-bold text-emerald-400">{overheadR.toFixed(1)}%</div>
          <div className="text-[10px] text-slate-500">vs Centralized baseline</div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 text-center">
        Full analysis available on the <span className="text-cyan-400">Spectrum &amp; Privacy</span> page.
      </p>
    </div>
  );
}

export default PrivacyStatus;
