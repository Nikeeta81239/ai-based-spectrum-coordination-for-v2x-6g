import React, { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import SpectrumChart from '../components/SpectrumChart';
import InterferenceChart from '../components/InterferenceChart';
import ThroughputChart from '../components/ThroughputChart';
import LatencyChart from '../components/LatencyChart';
import VehicleMap from '../components/VehicleMap';
import PrivacyCard from '../components/PrivacyCard';
import AINetworkStatusPanel from '../components/AINetworkStatusPanel';
import CriticalEventTimeline from '../components/CriticalEventTimeline';
import AIDecisionImpactCard from '../components/AIDecisionImpactCard';
import { formatNumber, formatPercent } from '../utils/formatters';
import { Car, Cpu, Radio, Zap, Activity, Clock, Layers } from 'lucide-react';
import api from '../api/api';

const TABS = [
  { id: 'overview', label: '① Network Overview' },
  { id: 'intelligence', label: '② Live Intelligence' },
  { id: 'trends', label: '③ Performance Trends' },
];

export function Dashboard({ simulationState, status }) {
  const {
    time_step,
    vehicles = [],
    channels = [],
    metrics = {},
    ai_situation_summary = {},
    event_timeline = [],
    latest_impact = null,
  } = simulationState;

  const [activeTab, setActiveTab] = useState('overview');
  const [history, setHistory] = useState([]);
  const [privacyMetrics, setPrivacyMetrics] = useState(null);

  const mv = (val, fmt) => (val == null ? '—' : fmt(val));

  useEffect(() => {
    api.getMetrics().then(r => { if (r.data.history) setHistory(r.data.history); }).catch(() => {});
    api.getPrivacyMetrics().then(r => setPrivacyMetrics(r.data)).catch(() => {});
  }, [time_step]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <Layers className="w-6 h-6 text-cyan-400" />
            6G V2X System Dashboard
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Observe + Understand the current network + See what the AI is doing in real-time
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

      {/* ① NETWORK OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <AINetworkStatusPanel
            summary={ai_situation_summary}
            vehiclesCount={vehicles.length}
            channels={channels}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard title="Total Vehicles" value={vehicles.length} icon={Car} color="cyan" subtext="SUMO Agents" />
            <StatCard title="Active Agents" value={vehicles.length} icon={Cpu} color="purple" subtext="MARL Decentralised" />
            <StatCard title="Avg Interference" value={mv(metrics.mean_interference, v => formatNumber(v, 3))} icon={Radio} color="amber" subtext="Spectrum Contention" />
            <StatCard title="Avg Latency" value={mv(metrics.mean_latency_ms, v => formatNumber(v, 1))} unit="ms" icon={Clock} color="rose" subtext="V2X Delivery Time" />
            <StatCard title="Throughput" value={mv(metrics.mean_throughput_mbps, v => formatNumber(v, 1))} unit="Mbps" icon={Zap} color="emerald" subtext="Spectral Efficiency" />
            <StatCard title="PDR" value={mv(metrics.mean_pdr, formatPercent)} icon={Activity} color="cyan" subtext="Packet Delivery" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CriticalEventTimeline events={event_timeline} />
            <AIDecisionImpactCard impact={latest_impact} />
          </div>
        </div>
      )}

      {/* ② LIVE INTELLIGENCE */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
                Live Vehicle Mobility Map (Bengaluru SUMO Network)
              </h3>
              <VehicleMap vehicles={vehicles} />
            </div>
            <SpectrumChart channels={channels} />
          </div>
        </div>
      )}

      {/* ③ PERFORMANCE TRENDS */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InterferenceChart history={history} />
            <ThroughputChart history={history} />
            <LatencyChart history={history} />
          </div>
          <PrivacyCard privacyMetrics={privacyMetrics} />
        </div>
      )}
    </div>
  );
}

export default Dashboard;
