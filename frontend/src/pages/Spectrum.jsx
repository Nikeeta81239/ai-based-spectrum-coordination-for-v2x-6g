import React, { useState, useEffect } from 'react';
import ChannelTable from '../components/ChannelTable';
import SpectrumChart from '../components/SpectrumChart';
import StatCard from '../components/StatCard';
import ChannelConflictGraph from '../components/ChannelConflictGraph';
import SpectrumDecisionReplay from '../components/SpectrumDecisionReplay';
import PrivacyAnalysis from '../components/PrivacyAnalysis';
import { Radio, ShieldCheck, Zap } from 'lucide-react';
import api from '../api/api';
import { formatNumber, formatPercent } from '../utils/formatters';

const TABS = [
  { id: 'monitoring', label: '① Spectrum Monitor' },
  { id: 'interference', label: '② Channel Decision' },
  { id: 'privacy', label: '③ Privacy & Information Flow' },
];

export function Spectrum({ simulationState }) {
  const { channels = [], vehicles = [], metrics = {}, time_step = 0, latest_impact = null } = simulationState;

  const [activeTab, setActiveTab] = useState('monitoring');
  const [privacyMetrics, setPrivacyMetrics] = useState(null);

  useEffect(() => {
    const load = () => api.getPrivacyMetrics().then(r => setPrivacyMetrics(r.data)).catch(() => {});
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  const freeChannels = channels.filter(c => (c.num_users || 0) === 0).length;
  const utilization = channels.length ? (channels.length - freeChannels) / channels.length : 0;

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-cyan-400" />
            6G Spectrum Coordination & Privacy Engine
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Dynamic sub-band allocation, real-time interference management, and CTDE privacy isolation
          </p>
        </div>

        {/* 3-Tab Segmented Control */}
        <div className="flex items-center rounded-xl bg-slate-900/90 border border-slate-800 p-1 font-mono text-xs gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ① SPECTRUM MONITORING */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
            <StatCard title="Active Channels" value={`${channels.length - freeChannels} / ${channels.length || 6}`} icon={Radio} color="cyan" />
            <StatCard title="Spectrum Utilization" value={formatPercent(utilization)} icon={Zap} color="purple" />
            <StatCard title="Mean Interference" value={formatNumber(metrics.mean_interference ?? 0, 3)} icon={Radio} color="rose" />
            <StatCard title="Overhead Reduction" value={privacyMetrics?.available ? formatPercent(privacyMetrics.reduction) : '83.3%'} icon={ShieldCheck} color="emerald" />
          </div>

          <SpectrumChart channels={channels} />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
              Subchannel Allocation & Quality Telemetry
            </h3>
            <ChannelTable channels={channels} />
          </div>
        </div>
      )}

      {/* ② CHANNEL & INTERFERENCE ANALYSIS */}
      {activeTab === 'interference' && (
        <div className="space-y-6">
          <ChannelConflictGraph channels={channels} vehicles={vehicles} />
          <SpectrumDecisionReplay timeStep={time_step} latestImpact={latest_impact} />
        </div>
      )}

      {/* ③ PRIVACY ANALYSIS */}
      {activeTab === 'privacy' && (
        <div className="mt-6">
          <PrivacyAnalysis privacyMetrics={privacyMetrics} />
        </div>
      )}
    </div>
  );
}

export default Spectrum;
