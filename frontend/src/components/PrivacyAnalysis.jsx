import React, { useState } from 'react';
import {
  Shield, Lock, Database, Activity, EyeOff,
  ChevronDown, ChevronRight, Car, Cpu, Network, ArrowDown, AlertCircle
} from 'lucide-react';

/**
 * PrivacyAnalysis — Full detailed privacy page for Spectrum & Privacy tab ③
 *
 * All percentages are calculated from actual sensitive-data telemetry:
 *   Protected % = (Sensitive Generated - Sensitive Exposed) / Sensitive Generated × 100
 *   Exposed  %  = Sensitive Exposed / Sensitive Generated × 100
 *
 * Non-sensitive coordination data (shared tokens / density bins) is NOT
 * treated as privacy leakage.
 */
export function PrivacyAnalysis({ privacyMetrics }) {
  const [showTech, setShowTech] = useState(false);

  /* ── No data state ─────────────────────────────────────────── */
  if (!privacyMetrics?.available) {
    return (
      <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-col items-center gap-3 text-center">
        <AlertCircle className="w-10 h-10 text-slate-600" />
        <div className="text-slate-300 font-semibold text-lg">Privacy data unavailable</div>
        <div className="text-slate-500 text-sm max-w-md">
          Start a simulation to calculate real privacy metrics from SUMO telemetry.
          No fake values will be shown.
        </div>
      </div>
    );
  }

  /* ── Real calculations from telemetry ──────────────────────── */
  const generated = privacyMetrics.sensitive_data_generated_bytes  || 0;
  const kept      = privacyMetrics.protected_data_bytes             || 0;
  const shared    = privacyMetrics.proposed_transmitted_bytes       || 0;
  const exposed   = privacyMetrics.exposed_data_bytes               || 0;
  const overheadR = privacyMetrics.overhead_reduction_pct           || 0;
  const baselineMsgs  = privacyMetrics.baseline_messages            || 0;
  const proposedMsgs  = privacyMetrics.proposed_messages            || 0;
  const baselineBytes = privacyMetrics.baseline_transmitted_bytes   || 0;

  const protectedPct = generated > 0 ? ((generated - exposed) / generated) * 100 : 0;
  const exposedPct   = generated > 0 ? (exposed  / generated) * 100               : 0;

  const summaryLine =
    protectedPct >= 100
      ? '100% of measured sensitive data remained local in this simulation.'
      : `${protectedPct.toFixed(1)}% of measured sensitive data remained local in this simulation.`;

  const fmt = (n) => (n ?? 0).toLocaleString();

  /* ── Sub-components ────────────────────────────────────────── */
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
    <div className="space-y-6 font-sans">

      {/* ── MAIN MESSAGE ─────────────────────────────────────────── */}
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Shield className="w-7 h-7 text-emerald-400" />
          How Our Privacy Protection Works
        </h2>
        <p className="text-emerald-300 font-medium text-sm mt-2">
          Sensitive vehicle data stays local. Only necessary information is shared.
        </p>
      </div>

      {/* ── PRIVACY PROTECTION STATUS ────────────────────────────── */}
      <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 space-y-5">
        <div>
          <h3 className="text-base font-bold text-white mb-1">Privacy Protection Measurement</h3>
          <div className="text-xs text-slate-400 bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3 leading-relaxed">
            <span className="text-amber-400 font-bold">⚠ How this is measured: </span>
            The Privacy Gateway monitors every data field that crosses the vehicle's local boundary during the simulation.
            Sensitive fields — exact GPS, speed, trajectory, and vehicle ID — are tracked separately from
            non-sensitive coordination signals (density tokens, subchannel requests).
            The percentages below reflect <strong className="text-white">what was observed leaving the vehicle boundary in this run</strong>,
            not a formal cryptographic proof of privacy.
          </div>
        </div>

        <div className="space-y-3 max-w-xl">
          <Bar pct={protectedPct} color="bg-emerald-500" label="Sensitive Data Protected" valueColor="text-emerald-400" />
          <Bar pct={exposedPct}   color="bg-rose-500"    label="Sensitive Data Exposed"   valueColor={exposedPct > 0 ? 'text-rose-400' : 'text-slate-500'} />
        </div>

        <div className="text-sm text-slate-300 italic border-l-2 border-emerald-500/50 pl-3">
          {summaryLine}
        </div>

        {exposed === 0 && (
          <div className="text-xs text-slate-400 bg-slate-900/50 rounded-lg px-4 py-3 border border-slate-700">
            <span className="text-emerald-400 font-bold">Why 0 B exposed? </span>
            The Privacy Gateway implementation filters out sensitive fields before any data
            leaves the vehicle agent. Only the ephemeral token, coarse density bin, and subchannel
            request are transmitted. None of these fields contain raw GPS coordinates, exact speed,
            trajectory, or vehicle identifiers — so the boundary monitor records 0 B of sensitive exposure.
            This is based on the implementation's field classification, not an independent audit.
          </div>
        )}
      </div>

      {/* ── INFORMATION FLOW DIAGRAM ─────────────────────────────── */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
          <Network className="w-4 h-4 text-cyan-400" />
          Information Flow
        </h3>
        <div className="flex flex-col items-center gap-0 max-w-xs mx-auto text-sm">
          {[
            { icon: Car,      label: 'Vehicle',                          color: 'border-blue-500/40 bg-blue-950/20',    text: 'text-blue-300' },
            null,
            { icon: Lock,     label: 'Private Data Stays Local',         color: 'border-emerald-500/40 bg-emerald-950/20', text: 'text-emerald-300' },
            null,
            { icon: Cpu,      label: 'Local AI Decision',                color: 'border-purple-500/40 bg-purple-950/20', text: 'text-purple-300' },
            null,
            { icon: Activity, label: 'Only Required Information Shared', color: 'border-amber-500/40 bg-amber-950/20',  text: 'text-amber-300' },
            null,
            { icon: Network,  label: 'Network',                          color: 'border-cyan-500/40 bg-cyan-950/20',    text: 'text-cyan-300' },
          ].map((item, idx) =>
            item === null ? (
              <ArrowDown key={idx} className="w-5 h-5 text-slate-600 my-1" />
            ) : (
              <div key={idx} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border ${item.color}`}>
                <item.icon className={`w-5 h-5 ${item.text} shrink-0`} />
                <span className={`font-semibold text-sm ${item.text}`}>{item.label}</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── APPROACH COMPARISON ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-950/10">
          <h4 className="text-rose-400 font-bold text-sm mb-2">Traditional Approach</h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            Vehicles send detailed information to a central controller.
            More information is sent over the network.
          </p>
        </div>
        <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/10">
          <h4 className="text-emerald-400 font-bold text-sm mb-2">Our Approach</h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            Vehicles keep sensitive information locally and share only the information
            required for spectrum coordination.
            Less information is shared because decisions are made locally.
          </p>
        </div>
      </div>

      {/* ── KEY CONCEPT EXPLANATIONS ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-xl border border-purple-500/20 bg-slate-900/40">
          <h4 className="text-purple-400 font-bold text-sm mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Local Critic
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            The vehicle makes its spectrum decision using local information without
            sending all of its private data to a central controller.
          </p>
          <p className="text-[10px] text-slate-500 mt-1 italic">Academic term: CTDE Local Critic</p>
        </div>
        <div className="p-5 rounded-xl border border-cyan-500/20 bg-slate-900/40">
          <h4 className="text-cyan-400 font-bold text-sm mb-2 flex items-center gap-2">
            <Network className="w-4 h-4" /> MAPPO
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            MAPPO allows multiple vehicle agents to learn how to select suitable
            spectrum channels together.
          </p>
          <p className="text-[10px] text-slate-500 mt-1 italic">Multi-Agent PPO — decentralized execution</p>
        </div>
      </div>

      {/* ── DATA CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-950">
          <h4 className="text-white font-bold text-sm mb-3 pb-2 border-b border-slate-800 flex items-center gap-2">
            <Database className="w-4 h-4 text-rose-400" />
            What stays inside the vehicle?
          </h4>
          <ul className="space-y-2 text-sm text-slate-300 list-disc pl-5 marker:text-rose-500">
            <li>Exact GPS location</li>
            <li>Detailed trajectory and heading</li>
            <li>Precise speed</li>
            <li>Vehicle-specific identifiers</li>
          </ul>
        </div>
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-950">
          <h4 className="text-white font-bold text-sm mb-3 pb-2 border-b border-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            What is shared?
          </h4>
          <ul className="space-y-2 text-sm text-slate-300 list-disc pl-5 marker:text-emerald-500">
            <li>Ephemeral (temporary) session token</li>
            <li>Coarse density bin (e.g. "crowded" / "sparse")</li>
            <li>Subchannel request signal</li>
          </ul>
        </div>
      </div>

      {/* ── METRICS GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Data Created',
            value: `${fmt(generated)} B`,
            color: 'text-cyan-400',
            desc: 'Private information generated by the vehicle.',
          },
          {
            label: 'Data Kept Locally',
            value: `${fmt(kept)} B`,
            color: 'text-emerald-400',
            desc: 'Information that never leaves the vehicle.',
          },
          {
            label: 'Data Shared',
            value: `${fmt(shared)} B`,
            color: 'text-purple-400',
            desc: 'Minimum information required for coordination.',
          },
          {
            label: 'Sensitive Data Exposed',
            value: `${fmt(exposed)} B`,
            color: exposed > 0 ? 'text-rose-400' : 'text-emerald-400',
            desc: 'Sensitive information that leaves the protected local boundary.',
            note: exposed === 0 ? 'None in this simulation' : undefined,
          },
        ].map((m) => (
          <div key={m.label} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase">{m.label}</div>
            <div className={`text-xl font-mono font-bold ${m.color}`}>{m.value}</div>
            {m.note && <div className={`text-[10px] font-semibold ${m.color}`}>{m.note}</div>}
            <div className="text-[10px] text-slate-500 leading-snug">{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Overhead reduction banner */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10 flex-wrap gap-3">
        <div>
          <div className="text-sm font-bold text-white">Signalling Overhead Reduction</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Less information is shared because decisions are made locally.
          </div>
        </div>
        <div className="text-3xl font-mono font-bold text-emerald-400">{overheadR.toFixed(1)}%</div>
      </div>

      {/* ── EXPANDABLE TECHNICAL DETAILS ─────────────────────────── */}
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowTech(!showTech)}
          className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors focus:outline-none"
        >
          <span className="font-bold text-white flex items-center gap-2 text-sm">
            <Database className="w-4 h-4 text-cyan-400" />
            Technical Details
          </span>
          {showTech ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
        </button>

        {showTech && (
          <div className="p-6 border-t border-slate-800 space-y-6 bg-slate-900/20 font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h5 className="text-slate-300 font-bold mb-3 border-b border-slate-700 pb-2 text-[13px]">Academic Terminology</h5>
                <ul className="space-y-3 text-slate-400">
                  <li><strong className="text-cyan-400 block mb-0.5">CTDE:</strong> Centralized Training with Decentralized Execution.</li>
                  <li><strong className="text-purple-400 block mb-0.5">Local Critic Isolation:</strong> "Reduced information sharing through decentralized local decision making."</li>
                  <li><strong className="text-emerald-400 block mb-0.5">MAPPO:</strong> Multi-Agent Proximal Policy Optimization — decentralized execution with centralized value estimation during training.</li>
                </ul>
              </div>
              <div>
                <h5 className="text-slate-300 font-bold mb-3 border-b border-slate-700 pb-2 text-[13px]">Measured Signalling Calculations</h5>
                <ul className="space-y-2 text-slate-400">
                  {[
                    ['Baseline Messages / step', `${baselineMsgs}`, 'text-rose-400'],
                    ['Proposed Messages / step', `${proposedMsgs}`, 'text-emerald-400'],
                    ['Baseline Payload', `${fmt(baselineBytes)} B`, 'text-rose-400'],
                    ['Proposed Payload', `${fmt(shared)} B`, 'text-emerald-400'],
                    ['Overhead Reduction', `${overheadR.toFixed(2)}%`, 'text-emerald-400'],
                    ['Sensitive Exposed', `${fmt(exposed)} B`, exposed > 0 ? 'text-rose-400' : 'text-emerald-400'],
                  ].map(([k, v, vc]) => (
                    <li key={k} className="flex justify-between items-center border-b border-slate-800/50 pb-1">
                      <span>{k}:</span>
                      <span className={`font-bold ${vc}`}>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default PrivacyAnalysis;
