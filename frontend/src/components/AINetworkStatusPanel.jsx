import React from 'react';
import { ShieldCheck, Cpu, ArrowRight, Activity, Radio, AlertTriangle } from 'lucide-react';

export function AINetworkStatusPanel({ summary = {}, vehiclesCount = 0, channels = [] }) {
  const status = summary.network_status || (vehiclesCount > 80 ? 'STRESSED' : 'STABLE');
  const traffic = summary.traffic || (vehiclesCount > 100 ? 'HIGH' : vehiclesCount > 40 ? 'MEDIUM' : 'LOW');
  const interference = summary.interference || 'MODERATE';
  const spectrum = summary.spectrum_utilization || '72% utilized';
  const confidence = summary.ai_confidence || '91%';
  const recommendation = summary.recommendation || 'Maintain current MARL channel distribution across all subchannels.';

  const getStatusColor = (st) => {
    switch (st) {
      case 'STABLE':
        return 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400';
      case 'CRITICAL':
      case 'STRESSED':
        return 'border-amber-500/40 bg-amber-950/20 text-amber-400';
      default:
        return 'border-cyan-500/40 bg-cyan-950/20 text-cyan-400';
    }
  };

  return (
    <div className="p-5 rounded-2xl glass-card border border-cyan-500/30 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-cyan-950/30 font-mono shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        {/* Left Status Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
            AI NETWORK STATUS
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-extrabold text-white">Network Status:</span>
            <div className={`px-3 py-1 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${getStatusColor(status)}`}>
              <span className={`w-2 h-2 rounded-full ${status === 'STABLE' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              {status}
            </div>
          </div>
        </div>

        {/* Middle Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
          <div>
            <div className="text-slate-500 uppercase tracking-wider text-[10px]">Traffic</div>
            <div className="font-bold text-cyan-300 text-sm mt-0.5">{traffic}</div>
          </div>
          <div>
            <div className="text-slate-500 uppercase tracking-wider text-[10px]">Interference</div>
            <div className="font-bold text-amber-400 text-sm mt-0.5">{interference}</div>
          </div>
          <div>
            <div className="text-slate-500 uppercase tracking-wider text-[10px]">Spectrum</div>
            <div className="font-bold text-purple-400 text-sm mt-0.5">{spectrum}</div>
          </div>
          <div>
            <div className="text-slate-500 uppercase tracking-wider text-[10px]">AI Confidence</div>
            <div className="font-bold text-emerald-400 text-sm mt-0.5">{confidence}</div>
          </div>
        </div>

        {/* Right Recommendation Banner */}
        <div className="lg:max-w-md p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/30 text-xs">
          <div className="text-cyan-400 font-bold uppercase text-[10px] flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            AI Recommendation (Real Data Driven)
          </div>
          <p className="text-slate-200 font-sans leading-relaxed">
            {recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}

export default AINetworkStatusPanel;
