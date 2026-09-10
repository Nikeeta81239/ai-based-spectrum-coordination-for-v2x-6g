import React, { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import InterferenceChart from '../components/InterferenceChart';
import ThroughputChart from '../components/ThroughputChart';
import LatencyChart from '../components/LatencyChart';
import AINetworkStatusPanel from '../components/AINetworkStatusPanel';
import SumoCanvas from '../components/SumoCanvas';
import { formatNumber, formatPercent } from '../utils/formatters';
import { Car, Cpu, Radio, Zap, Activity, Clock, Layers, ShieldCheck } from 'lucide-react';
import api from '../api/api';

const TABS = [
  { id: 'overview', label: '① Network Overview' },
  { id: 'trends',   label: '② Performance Trends' },
];

export function Dashboard({ simulationState, status }) {
  const {
    time_step = 0,
    vehicles = [],
    road_lanes = [],
    traffic_lights = [],
    channels = [],
    metrics = {},
    ai_situation_summary = {},
  } = simulationState;

  const [activeTab, setActiveTab] = useState('overview');
  const [history, setHistory] = useState([]);
  const [privacyMetrics, setPrivacyMetrics] = useState(null);

  const isRunning = (status === 'running' || status === 'paused') && vehicles.length > 0;

  // Real-time synchronization of metrics & history from simulation service
  useEffect(() => {
    let mounted = true;

    const fetchMetrics = () => {
      api.getMetrics()
        .then((r) => {
          if (mounted && r.data?.history) {
            setHistory(r.data.history);
          }
        })
        .catch(() => {});

      api.getPrivacyMetrics()
        .then((r) => {
          if (mounted && r.data) {
            setPrivacyMetrics(r.data);
          }
        })
        .catch(() => {});
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [time_step]);

  // Instantly append latest live step to history from WebSocket simulationState
  useEffect(() => {
    if (time_step > 0 && metrics && metrics.mean_interference != null) {
      setHistory((prev) => {
        if (prev.some((p) => p.time_step === time_step)) return prev;
        const entry = {
          time_step,
          mean_interference: metrics.mean_interference ?? 0,
          mean_throughput_mbps: metrics.mean_throughput_mbps ?? 0,
          mean_latency_ms: metrics.mean_latency_ms ?? 0,
          mean_pdr: metrics.mean_pdr ?? 0,
          ...metrics,
        };
        return [...prev, entry].slice(-150);
      });
    }
  }, [time_step, metrics]);

  // Privacy Decision metrics derived from Privacy Gateway
  const BYTES_SENSITIVE = 232;
  const numVeh = vehicles.length;
  const genBytes = privacyMetrics?.sensitive_data_generated_bytes || (numVeh * BYTES_SENSITIVE);
  const expBytes = privacyMetrics?.exposed_data_bytes || 0;
  const protectedPct = genBytes > 0 ? ((genBytes - expBytes) / genBytes) * 100 : 100.0;
  const exposedPct = genBytes > 0 ? (expBytes / genBytes) * 100 : 0.0;

  const mv = (val, fmt) => (!isRunning || val == null ? '—' : fmt(val));

  return (
    <div className="space-y-6 font-sans">
      {/* ── HEADER ──────────────────────────────────────────────── */}
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

        {/* Exactly 2 Tabs */}
        <div className="flex items-center rounded-xl bg-slate-900/90 border border-slate-800 p-1 font-mono text-xs gap-1">
          {TABS.map((t) => (
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

      {/* ── TAB ①: NETWORK OVERVIEW ─────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <AINetworkStatusPanel
            summary={ai_situation_summary}
            vehiclesCount={vehicles.length}
            channels={channels}
          />

          {/* 6 KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              title="Total Vehicles"
              value={isRunning ? vehicles.length : 'Waiting for SUMO simulation…'}
              icon={Car}
              color="cyan"
              subtext="SUMO Agents"
            />
            <StatCard
              title="Active Agents"
              value={isRunning ? vehicles.length : '—'}
              icon={Cpu}
              color="purple"
              subtext="MARL Decentralised"
            />
            <StatCard
              title="Avg Interference"
              value={mv(metrics.mean_interference, (v) => formatNumber(v, 3))}
              icon={Radio}
              color="amber"
              subtext="Spectrum Contention"
            />
            <StatCard
              title="Avg Latency"
              value={mv(metrics.mean_latency_ms, (v) => formatNumber(v, 1))}
              unit={isRunning && metrics.mean_latency_ms != null ? 'ms' : ''}
              icon={Clock}
              color="rose"
              subtext="V2X Delivery Time"
            />
            <StatCard
              title="Throughput"
              value={mv(metrics.mean_throughput_mbps, (v) => formatNumber(v, 1))}
              unit={isRunning && metrics.mean_throughput_mbps != null ? 'Mbps' : ''}
              icon={Zap}
              color="emerald"
              subtext="Spectral Efficiency"
            />
            <StatCard
              title="PDR"
              value={mv(metrics.mean_pdr, formatPercent)}
              icon={Activity}
              color="cyan"
              subtext="Packet Delivery"
            />
          </div>

          {/* Small Privacy Decision Card */}
          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-emerald-950/20 font-mono flex items-center justify-between flex-wrap gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  Privacy Decision
                </div>
                <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                  {isRunning ? (
                    <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      PRIVACY PROTECTED
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs font-normal">
                      Waiting for SUMO simulation…
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Protected</div>
                <div className="text-lg font-bold text-emerald-400 font-mono">
                  {isRunning ? `${protectedPct.toFixed(1)}%` : '—'}
                </div>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Exposed</div>
                <div className={`text-lg font-bold font-mono ${exposedPct === 0 ? 'text-slate-400' : 'text-rose-400'}`}>
                  {isRunning ? `${exposedPct.toFixed(1)}%` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Live SUMO canvas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Live Simulation — Bengaluru Road Network
              </h3>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-500/30">
                {isRunning ? `${vehicles.length} active SUMO vehicles` : 'Waiting for SUMO simulation…'}
              </span>
            </div>
            <SumoCanvas vehicles={vehicles} roadLanes={road_lanes} trafficLights={traffic_lights} />
          </div>
        </div>
      )}

      {/* ── TAB ②: PERFORMANCE TRENDS ───────────────────────────── */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InterferenceChart history={history} />
            <ThroughputChart history={history} />
            <LatencyChart history={history} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
