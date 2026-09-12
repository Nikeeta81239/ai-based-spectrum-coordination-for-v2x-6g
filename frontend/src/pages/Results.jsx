import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/api';
import { formatNumber, formatPercent } from '../utils/formatters';
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  CartesianGrid, LineChart, Line,
} from 'recharts';
import {
  Play, Square, RefreshCw, Download, Layers, Activity,
  AlertTriangle, CheckCircle2, Clock, Radio, Cpu, FileSpreadsheet,
  Wifi, ChevronRight,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'scenarios',  label: '① Scenarios' },
  { id: 'benchmark',  label: '② Benchmark Results' },
  { id: 'research',   label: '③ Research Results' },
];

const SCENARIO_META = [
  { name: 'low',       label: 'Low Density',       carriers: '28 GHz (mmWave)', bw: '10 MHz', channels: 6 },
  { name: 'medium',    label: 'Medium Density',     carriers: '28 GHz (mmWave)', bw: '10 MHz', channels: 6 },
  { name: 'high',      label: 'High Density',       carriers: '28 GHz (mmWave)', bw: '10 MHz', channels: 6 },
  { name: 'very_high', label: 'Very High Density',  carriers: '28 GHz (mmWave)', bw: '10 MHz', channels: 6 },
  { name: 'congestion',label: 'Congestion',         carriers: '28 GHz (mmWave)', bw: '10 MHz', channels: 6 },
];

const METHOD_LABELS = {
  'Proposed MAPPO': 'MAPPO',
  'Random':         'Random',
  'Greedy (Max-SINR)': 'Greedy',
  'Round Robin':    'Round Robin',
};

const CHART_COLORS = {
  'Proposed MAPPO':    '#10b981',
  'Random':            '#f43f5e',
  'Greedy (Max-SINR)': '#f59e0b',
  'Round Robin':       '#06b6d4',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const sourceLabel = (src) => {
  if (src === 'live') return { text: '● LIVE RUN',       cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40' };
  if (src === 'file') return { text: '● EVALUATION FILE', cls: 'text-cyan-400    border-cyan-500/30    bg-cyan-950/40'    };
  return                      { text: '● AWAITING BENCHMARK', cls: 'text-slate-400 border-slate-600 bg-slate-900' };
};

const simStatusBadge = (status) => {
  const map = {
    running:   { text: 'RUNNING',   cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/50 animate-pulse' },
    starting:  { text: 'STARTING',  cls: 'text-yellow-400  border-yellow-500/30  bg-yellow-950/50  animate-pulse' },
    paused:    { text: 'PAUSED',    cls: 'text-amber-400   border-amber-500/30   bg-amber-950/50'  },
    completed: { text: 'COMPLETED', cls: 'text-cyan-400    border-cyan-500/30    bg-cyan-950/50'   },
    stopped:   { text: 'STOPPED',   cls: 'text-slate-400   border-slate-600      bg-slate-900'     },
    error:     { text: 'ERROR',     cls: 'text-rose-400    border-rose-500/30    bg-rose-950/50'   },
    idle:      { text: 'IDLE',      cls: 'text-slate-400   border-slate-600      bg-slate-900'     },
  };
  return map[status] || map.idle;
};

const fmtVal  = (v, decimals = 1) => (v === undefined || v === null || v === 0) ? '—' : formatNumber(v, decimals);
const fmtPct  = (v) => (v === undefined || v === null) ? '—' : formatPercent(v);
const fmtMs   = (v) => (v === undefined || v === null || v === 0) ? '—' : `${formatNumber(v, 1)} ms`;
const fmtMbps = (v) => (v === undefined || v === null || v === 0) ? '—' : `${formatNumber(v, 1)} Mbps`;
const fmtDb   = (v) => (v === undefined || v === null) ? '—' : `${formatNumber(v, 1)} dB`;

// Tooltip style shared across charts
const ttStyle = { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px', fontFamily: 'monospace' };

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status, className = '' }) {
  const b = simStatusBadge(status);
  return (
    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${b.cls} ${className}`}>
      {b.text}
    </span>
  );
}

function DataSourceBadge({ source }) {
  const s = sourceLabel(source);
  return (
    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${s.cls}`}>
      {s.text}
    </span>
  );
}

function NoDataBanner({ message }) {
  return (
    <div className="p-6 rounded-2xl border border-slate-700 bg-slate-900/50 text-center font-mono space-y-2">
      <AlertTriangle className="w-6 h-6 text-slate-500 mx-auto" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

function MetricCell({ value, highlight = false }) {
  return (
    <td className={`px-3 py-2.5 text-center font-mono text-xs ${highlight ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
      {value}
    </td>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function Results() {
  const [activeTab,        setActiveTab]        = useState('scenarios');
  const [selectedScenario, setSelectedScenario] = useState('low');
  const [scenarioList,     setScenarioList]     = useState(SCENARIO_META);

  // Simulation state
  const [simStatus,  setSimStatus]  = useState('idle');
  const [simSnap,    setSimSnap]    = useState(null);
  const [simError,   setSimError]   = useState('');

  // Benchmark state
  const [benchResults,  setBenchResults]  = useState({});   // scenario → { results, source }
  const [benchStatus,   setBenchStatus]   = useState({});   // scenario → { status, steps_done, total_steps }
  const [benchRunning,  setBenchRunning]  = useState(false);
  const [benchError,    setBenchError]    = useState('');

  // Research: density scalability across all scenarios
  const [densityRows, setDensityRows] = useState({});

  const simPollRef   = useRef(null);
  const benchPollRef = useRef(null);

  // ── Fetch helpers ────────────────────────────────────────────────────────────
  const fetchSimStatus = useCallback(async () => {
    try {
      const [statusR, snapR] = await Promise.all([
        api.getSimulationStatus(),
        api.getCurrentSimulation(),
      ]);
      setSimStatus(statusR.data?.status || 'idle');
      setSimSnap(snapR.data || null);
    } catch { /* backend may be restarting */ }
  }, []);

  const fetchBenchResults = useCallback(async (scenario) => {
    try {
      const r = await api.getScenarioResults(scenario);
      const { results, source } = r.data || {};
      if (source && source !== 'none' && results && Object.keys(results).filter(k => k !== '_meta').length > 0) {
        setBenchResults(prev => ({ ...prev, [scenario]: { results, source } }));
        // Also populate density rows for Research tab
        setDensityRows(prev => ({ ...prev, [scenario]: { results, source } }));
      }
    } catch { /* ignore */ }
  }, []);

  // ── Init: load scenarios list + existing results for all scenarios ────────────
  useEffect(() => {
    api.getScenarios()
      .then(r => { if (r.data?.scenarios?.length) setScenarioList(r.data.scenarios); })
      .catch(() => {});

    fetchSimStatus();
    ['low', 'medium', 'high', 'very_high', 'congestion'].forEach(fetchBenchResults);
  }, [fetchSimStatus, fetchBenchResults]);

  // ── Sim status polling (while running/starting) ──────────────────────────────
  useEffect(() => {
    if (simStatus === 'running' || simStatus === 'starting') {
      simPollRef.current = setInterval(fetchSimStatus, 2000);
    } else {
      clearInterval(simPollRef.current);
    }
    return () => clearInterval(simPollRef.current);
  }, [simStatus, fetchSimStatus]);

  // ── Benchmark status polling ─────────────────────────────────────────────────
  const pollBenchStatus = useCallback(async (scenario) => {
    try {
      const r = await api.getBenchmarkStatus(scenario);
      const bs = r.data || {};
      setBenchStatus(prev => ({ ...prev, [scenario]: bs }));
      if (bs.status === 'completed') {
        clearInterval(benchPollRef.current);
        setBenchRunning(false);
        await fetchBenchResults(scenario);
      } else if (bs.status === 'error') {
        clearInterval(benchPollRef.current);
        setBenchRunning(false);
        setBenchError(bs.error || 'Benchmark failed.');
      }
    } catch { /* ignore */ }
  }, [fetchBenchResults]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleRunScenario = async () => {
    setSimError('');
    try {
      await api.startSimulation({
        scenario: selectedScenario,
        ai_mode: 'marl',
        use_sumo: true,
        gui: false,
        duration_steps: 600,
      });
      setSimStatus('starting');
    } catch (err) {
      setSimError(err?.response?.data?.detail || err.message || 'Failed to start simulation.');
    }
  };

  const handleStopSimulation = async () => {
    try {
      await api.stopSimulation();
      setSimStatus('stopped');
      setSimSnap(null);
    } catch (err) {
      setSimError(err?.response?.data?.detail || err.message || 'Failed to stop simulation.');
    }
  };

  const handleRunBenchmark = async () => {
    setBenchError('');
    setBenchRunning(true);
    setBenchStatus(prev => ({ ...prev, [selectedScenario]: { status: 'running', steps_done: 0, total_steps: 400 } }));
    try {
      await api.runScenario({
        scenario: selectedScenario,
        methods: ['random', 'greedy', 'round_robin', 'proposed'],
        steps: 100,
      });
      benchPollRef.current = setInterval(() => pollBenchStatus(selectedScenario), 3000);
    } catch (err) {
      setBenchRunning(false);
      setBenchError(err?.response?.data?.detail || err.message || 'Failed to start benchmark.');
    }
  };

  const handleExportCSV = () => {
    const entry = benchResults[selectedScenario];
    if (!entry?.results) return;
    const meta = entry.results._meta || {};
    const rows = [
      ['Algorithm', 'Latency (ms)', 'PDR', 'Throughput (Mbps)', 'SINR (dB)', 'Interference', 'Comm Overhead'],
    ];
    Object.entries(entry.results).forEach(([k, v]) => {
      if (k === '_meta') return;
      rows.push([k, v.mean_latency_ms, v.mean_pdr, v.mean_throughput_mbps, v.mean_sinr_db, v.mean_interference, v.comm_overhead]);
    });
    const ts = meta.timestamp ? new Date(meta.timestamp * 1000).toISOString().slice(0, 10) : 'unknown';
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `6g_v2x_benchmark_${selectedScenario}_${ts}.csv`;
    a.click();
  };

  // ── Derived data ─────────────────────────────────────────────────────────────
  const currentBench  = benchResults[selectedScenario];
  const hasRealData   = !!currentBench && Object.keys(currentBench.results || {}).filter(k => k !== '_meta').length > 0;
  const currentBs     = benchStatus[selectedScenario] || {};
  const currentMeta   = currentBench?.results?._meta || {};

  const methods       = hasRealData ? Object.keys(currentBench.results).filter(k => k !== '_meta') : [];
  const proposed      = hasRealData ? (currentBench.results['Proposed MAPPO'] || {}) : null;
  const greedy        = hasRealData ? (currentBench.results['Greedy (Max-SINR)'] || {}) : null;

  // Performance improvement vs greedy baseline
  const latImprovement = (proposed && greedy && greedy.mean_latency_ms > 0)
    ? ((greedy.mean_latency_ms - proposed.mean_latency_ms) / greedy.mean_latency_ms * 100).toFixed(1)
    : null;
  const pdrImprovement = (proposed && greedy && greedy.mean_pdr > 0)
    ? ((proposed.mean_pdr - greedy.mean_pdr) / greedy.mean_pdr * 100).toFixed(1)
    : null;
  const throughputImprovement = (proposed && greedy && greedy.mean_throughput_mbps > 0)
    ? ((proposed.mean_throughput_mbps - greedy.mean_throughput_mbps) / greedy.mean_throughput_mbps * 100).toFixed(1)
    : null;

  // Chart data
  const chartData = hasRealData
    ? methods.map(m => ({
        name: METHOD_LABELS[m] || m,
        _key: m,
        Latency:      Number((currentBench.results[m]?.mean_latency_ms || 0).toFixed(1)),
        Throughput:   Number((currentBench.results[m]?.mean_throughput_mbps || 0).toFixed(1)),
        PDR:          Number(((currentBench.results[m]?.mean_pdr || 0) * 100).toFixed(1)),
        SINR:         Number((currentBench.results[m]?.mean_sinr_db || 0).toFixed(1)),
      }))
    : [];

  // Live sim info
  const liveVehicles = simSnap?.vehicles?.length || 0;
  const liveStep     = simSnap?.step || 0;
  const selectedMeta = scenarioList.find(s => s.name === selectedScenario) || {};

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 font-sans">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-cyan-400" />
            Scenarios, Benchmark &amp; Research Results
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            All results sourced from real SUMO simulation + MAPPO / baseline execution
          </p>
        </div>

        {/* Tab bar */}
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

      {/* ── Scenario selector (always visible) ────────────────────────────── */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
          Active Scenario
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 font-mono">
          {SCENARIO_META.map(sc => {
            const active = selectedScenario === sc.name;
            const hasBench = !!benchResults[sc.name];
            return (
              <button
                key={sc.name}
                onClick={() => setSelectedScenario(sc.name)}
                className={`p-3 rounded-xl text-left transition-all duration-150 flex flex-col gap-1 ${
                  active
                    ? 'border-2 border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-500/10'
                    : 'border border-slate-800 glass-card hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold text-white">{sc.label}</span>
                <span className="text-[10px] text-slate-500 uppercase">{sc.name}</span>
                {hasBench && (
                  <span className="text-[9px] text-emerald-400">● benchmarked</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB ① — SCENARIOS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'scenarios' && (
        <div className="space-y-5">

          {/* Sim status + controls */}
          <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-2xl glass-card border border-slate-800 font-mono text-xs">
            <div className="flex items-center gap-3">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300 font-semibold uppercase">SUMO Simulation</span>
              <StatusBadge status={simStatus} />
            </div>
            <div className="flex items-center gap-2">
              {(simStatus !== 'running' && simStatus !== 'starting') && (
                <button
                  onClick={handleRunScenario}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all uppercase"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run SUMO Scenario
                </button>
              )}
              {(simStatus === 'running' || simStatus === 'starting') && (
                <button
                  onClick={handleStopSimulation}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all uppercase"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop Simulation
                </button>
              )}
            </div>
          </div>

          {simError && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/30 text-xs text-rose-300 font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {simError}
            </div>
          )}

          {/* Scenario info panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Config */}
            <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4 font-mono text-xs">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Scenario Configuration
              </h4>
              <div className="space-y-2.5 text-[11px]">
                {[
                  ['Scenario',         selectedMeta.label || selectedScenario],
                  ['Target Vehicles',  selectedMeta.num_vehicles || '—'],
                  ['Carrier Freq',     selectedMeta.carriers || '28 GHz (mmWave)'],
                  ['Bandwidth',        selectedMeta.bw || '10 MHz'],
                  ['Channels',         selectedMeta.channels || 6],
                  ['Density Factor',   selectedMeta.density_factor ? `${selectedMeta.density_factor}×` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-400">{k}</span>
                    <span className="text-white font-bold">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live snapshot */}
            <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4 font-mono text-xs">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" /> Live SUMO Snapshot
              </h4>
              {simStatus === 'running' && liveVehicles > 0 ? (
                <div className="space-y-2.5 text-[11px]">
                  {[
                    ['Active Vehicles',  liveVehicles],
                    ['Simulation Step',  liveStep],
                    ['Scenario',         simSnap?.scenario || selectedScenario],
                    ['AI Mode',          simSnap?.ai_mode  || 'MARL'],
                    ['Status',           simStatus.toUpperCase()],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center border-b border-slate-800/60 pb-1.5">
                      <span className="text-slate-400">{k}</span>
                      <span className="text-emerald-400 font-bold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <NoDataBanner
                  message={
                    simStatus === 'starting'
                      ? 'SUMO is initialising — waiting for first step…'
                      : 'Start the simulation to see live SUMO vehicle data.'
                  }
                />
              )}
            </div>
          </div>

          {/* Per-vehicle quick table */}
          {simStatus === 'running' && liveVehicles > 0 && (
            <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3 font-mono">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-purple-400" /> Active V2X Agents (top 8)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400">
                      {['Vehicle ID', 'Channel', 'Speed (m/s)', 'SINR (dB)', 'PDR', 'App Type'].map(h => (
                        <th key={h} className="px-3 py-2 font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(simSnap?.vehicles || []).slice(0, 8).map((v, i) => (
                      <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                        <td className="px-3 py-2 text-cyan-400 font-bold">{v.vehicle_id}</td>
                        <td className="px-3 py-2 text-white">CH{(v.selected_channel ?? 0) + 1}</td>
                        <td className="px-3 py-2 text-slate-300">{fmtVal(v.speed_mps)}</td>
                        <td className="px-3 py-2 text-emerald-400">{fmtDb(v.sinr_db)}</td>
                        <td className="px-3 py-2 text-purple-400">{fmtPct(v.pdr)}</td>
                        <td className="px-3 py-2 text-slate-400">{v.app_type || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB ② — BENCHMARK RESULTS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'benchmark' && (
        <div className="space-y-5">

          {/* Controls bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-2xl glass-card border border-slate-800 font-mono text-xs">
            <div className="space-y-0.5">
              <div className="text-white font-bold text-sm">
                4-Algorithm Benchmark — {selectedMeta.label || selectedScenario}
              </div>
              <div className="text-slate-400 text-[11px]">
                Runs 100 actual steps: MAPPO + Attention vs Random vs Greedy vs Round Robin
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasRealData && (
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-xs font-bold uppercase transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
                </button>
              )}
              <button
                onClick={handleRunBenchmark}
                disabled={benchRunning}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-60 uppercase"
              >
                {benchRunning
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running…</>
                  : <><Play className="w-3.5 h-3.5 fill-current" /> Run 100-Step Benchmark</>
                }
              </button>
            </div>
          </div>

          {/* Benchmark progress */}
          {benchRunning && currentBs.status === 'running' && (
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 font-mono text-xs space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Benchmark running — evaluating all 4 algorithms…</span>
                <span className="text-cyan-400 font-bold">
                  {currentBs.steps_done || 0} / {currentBs.total_steps || 400} steps
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div
                  className="bg-cyan-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(((currentBs.steps_done || 0) / (currentBs.total_steps || 400)) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {benchError && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/30 text-xs text-rose-300 font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Benchmark error: {benchError}
            </div>
          )}

          {/* Data source + metadata */}
          {hasRealData && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/50 font-mono text-[11px]">
              <div className="flex items-center gap-3">
                <DataSourceBadge source={currentBench.source} />
                <span className="text-slate-400">
                  Scenario: <strong className="text-white">{currentMeta.scenario || selectedScenario}</strong>
                </span>
                <span className="text-slate-400">
                  Vehicles: <strong className="text-cyan-400">{currentMeta.actual_vehicles || '—'}</strong>
                </span>
                <span className="text-slate-400">
                  Steps: <strong className="text-cyan-400">{currentMeta.steps || 100}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                {currentMeta.timestamp && (
                  <span><Clock className="w-3 h-3 inline mr-1" />{new Date(currentMeta.timestamp * 1000).toLocaleTimeString()}</span>
                )}
                {currentMeta.model_checkpoint && (
                  <span>Model: <code className="text-cyan-400">{currentMeta.model_checkpoint}</code></span>
                )}
              </div>
            </div>
          )}

          {/* No data state */}
          {!hasRealData && !benchRunning && (
            <NoDataBanner message="No benchmark data yet for this scenario. Click 'Run 100-Step Benchmark' to measure real algorithm performance." />
          )}

          {/* Comparison table */}
          {hasRealData && (
            <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3 font-mono overflow-x-auto">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Performance Comparison — {methods.length} Algorithms
              </h3>
              <table className="w-full text-xs min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-[10px] uppercase tracking-wider">
                    <th className="px-3 py-2 text-left">Metric</th>
                    {methods.map(m => (
                      <th key={m} className={`px-3 py-2 text-center ${m === 'Proposed MAPPO' ? 'text-emerald-400 font-bold' : ''}`}>
                        {METHOD_LABELS[m] || m}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center text-cyan-400">Best</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Latency — lower is better */}
                  {(() => {
                    const vals = methods.map(m => currentBench.results[m]?.mean_latency_ms || Infinity);
                    const best = Math.min(...vals);
                    return (
                      <tr className="border-b border-slate-800/60">
                        <td className="px-3 py-2.5 text-slate-400 text-[11px]">Latency (ms) ↓</td>
                        {methods.map((m, i) => (
                          <MetricCell key={m} value={fmtMs(currentBench.results[m]?.mean_latency_ms)} highlight={vals[i] === best} />
                        ))}
                        <td className="px-3 py-2.5 text-center text-cyan-400 font-bold text-xs">{fmtMs(best === Infinity ? null : best)}</td>
                      </tr>
                    );
                  })()}
                  {/* PDR — higher is better */}
                  {(() => {
                    const vals = methods.map(m => currentBench.results[m]?.mean_pdr || 0);
                    const best = Math.max(...vals);
                    return (
                      <tr className="border-b border-slate-800/60">
                        <td className="px-3 py-2.5 text-slate-400 text-[11px]">PDR Reliability ↑</td>
                        {methods.map((m, i) => (
                          <MetricCell key={m} value={fmtPct(currentBench.results[m]?.mean_pdr)} highlight={vals[i] === best} />
                        ))}
                        <td className="px-3 py-2.5 text-center text-cyan-400 font-bold text-xs">{fmtPct(best)}</td>
                      </tr>
                    );
                  })()}
                  {/* Throughput — higher is better */}
                  {(() => {
                    const vals = methods.map(m => currentBench.results[m]?.mean_throughput_mbps || 0);
                    const best = Math.max(...vals);
                    return (
                      <tr className="border-b border-slate-800/60">
                        <td className="px-3 py-2.5 text-slate-400 text-[11px]">Throughput (Mbps) ↑</td>
                        {methods.map((m, i) => (
                          <MetricCell key={m} value={fmtMbps(currentBench.results[m]?.mean_throughput_mbps)} highlight={vals[i] === best} />
                        ))}
                        <td className="px-3 py-2.5 text-center text-cyan-400 font-bold text-xs">{fmtMbps(best)}</td>
                      </tr>
                    );
                  })()}
                  {/* SINR — higher is better */}
                  {(() => {
                    const vals = methods.map(m => currentBench.results[m]?.mean_sinr_db ?? -Infinity);
                    const best = Math.max(...vals);
                    return (
                      <tr className="border-b border-slate-800/60">
                        <td className="px-3 py-2.5 text-slate-400 text-[11px]">SINR (dB) ↑</td>
                        {methods.map((m, i) => (
                          <MetricCell key={m} value={fmtDb(currentBench.results[m]?.mean_sinr_db)} highlight={vals[i] === best} />
                        ))}
                        <td className="px-3 py-2.5 text-center text-cyan-400 font-bold text-xs">{fmtDb(best === -Infinity ? null : best)}</td>
                      </tr>
                    );
                  })()}
                  {/* Interference — lower is better */}
                  {(() => {
                    const vals = methods.map(m => currentBench.results[m]?.mean_interference ?? Infinity);
                    const best = Math.min(...vals);
                    return (
                      <tr className="border-b border-slate-800/60">
                        <td className="px-3 py-2.5 text-slate-400 text-[11px]">Interference ↓</td>
                        {methods.map((m, i) => (
                          <MetricCell key={m} value={fmtPct(currentBench.results[m]?.mean_interference)} highlight={vals[i] === best} />
                        ))}
                        <td className="px-3 py-2.5 text-center text-cyan-400 font-bold text-xs">{fmtPct(best === Infinity ? null : best)}</td>
                      </tr>
                    );
                  })()}
                  {/* Comm Overhead — lower is better */}
                  {(() => {
                    const vals = methods.map(m => currentBench.results[m]?.comm_overhead ?? Infinity);
                    const best = Math.min(...vals);
                    return (
                      <tr>
                        <td className="px-3 py-2.5 text-slate-400 text-[11px]">Comm Overhead ↓</td>
                        {methods.map((m, i) => (
                          <MetricCell key={m} value={fmtPct(currentBench.results[m]?.comm_overhead)} highlight={vals[i] === best} />
                        ))}
                        <td className="px-3 py-2.5 text-center text-cyan-400 font-bold text-xs">{fmtPct(best === Infinity ? null : best)}</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {/* Performance improvement banner */}
          {hasRealData && proposed && greedy && (
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 font-mono text-xs flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-white font-bold">MAPPO vs Greedy (Best Non-AI Baseline):</span>
              </div>
              <div className="flex flex-wrap gap-4 text-[11px]">
                {latImprovement !== null && (
                  <span>Latency: <strong className="text-emerald-400">−{latImprovement}%</strong></span>
                )}
                {pdrImprovement !== null && (
                  <span>PDR: <strong className="text-cyan-400">+{pdrImprovement}%</strong></span>
                )}
                {throughputImprovement !== null && (
                  <span>Throughput: <strong className="text-purple-400">+{throughputImprovement}%</strong></span>
                )}
                <span className="text-slate-500 text-[10px]">
                  Calculated from measured values ({currentBench.source})
                </span>
              </div>
            </div>
          )}

          {/* 3 Charts */}
          {hasRealData && chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Throughput */}
              <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Throughput (Mbps) ↑</h4>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" interval={0} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={ttStyle} />
                      <Bar dataKey="Throughput" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={`cell-tput-${i}`} fill={CHART_COLORS[entry._key] || '#10b981'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Latency */}
              <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Latency (ms) ↓</h4>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" interval={0} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={ttStyle} />
                      <Bar dataKey="Latency" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={`cell-lat-${i}`} fill={CHART_COLORS[entry._key] || '#f43f5e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* PDR */}
              <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PDR (%) ↑</h4>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" interval={0} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={ttStyle} />
                      <Bar dataKey="PDR" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={`cell-pdr-${i}`} fill={CHART_COLORS[entry._key] || '#06b6d4'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB ③ — RESEARCH RESULTS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'research' && (
        <div className="space-y-6">

          {/* Section 1 — Architecture Comparison */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Section 1 — Architecture Comparison
            </h3>

            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-950/10 text-[11px] text-amber-300 font-mono">
              ⚠ Centralized &amp; Local-Critic values are reference figures — not measured in this benchmark run.
              Only Proposed MAPPO uses values from the actual benchmark execution.
            </div>

            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-[10px] uppercase tracking-wider">
                    {['Architecture', 'Privacy / Data Exposure', 'Comm Overhead', 'PDR Reliability', 'Mean Latency', 'Single Point of Failure'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1 — Centralized */}
                  <tr className="border-b border-slate-800/60">
                    <td className="px-3 py-3">
                      <span className="text-rose-400 font-bold text-[11px]">Centralized Allocation</span>
                      <div className="text-[9px] text-slate-500 mt-0.5">Reference — not measured</div>
                    </td>
                    <td className="px-3 py-3 text-rose-400 text-[11px]">0% — Raw GPS + VIN exposed</td>
                    <td className="px-3 py-3 text-slate-300 text-[11px]">100% (high broadcast)</td>
                    <td className="px-3 py-3 text-slate-400 text-[11px] italic">Not measured</td>
                    <td className="px-3 py-3 text-slate-400 text-[11px] italic">Not measured</td>
                    <td className="px-3 py-3 text-rose-400 text-[11px]">Yes</td>
                  </tr>
                  {/* Row 2 — Local Critic */}
                  <tr className="border-b border-slate-800/60">
                    <td className="px-3 py-3">
                      <span className="text-amber-400 font-bold text-[11px]">Existing Local-Critic Baseline</span>
                      <div className="text-[9px] text-slate-500 mt-0.5">Reference — not measured</div>
                    </td>
                    <td className="px-3 py-3 text-amber-400 text-[11px]">Partial — coarse positions shared</td>
                    <td className="px-3 py-3 text-slate-300 text-[11px]">~16.7% (moderate beaconing)</td>
                    <td className="px-3 py-3 text-slate-400 text-[11px] italic">Not measured</td>
                    <td className="px-3 py-3 text-slate-400 text-[11px] italic">Not measured</td>
                    <td className="px-3 py-3 text-amber-400 text-[11px]">No</td>
                  </tr>
                  {/* Row 3 — Proposed */}
                  <tr className="bg-emerald-950/10">
                    <td className="px-3 py-3">
                      <span className="text-emerald-400 font-bold text-[11px]">Proposed MAPPO + Attention + Privacy</span>
                      {hasRealData
                        ? <div className="text-[9px] text-emerald-500 mt-0.5">● From real benchmark run ({currentBench?.source})</div>
                        : <div className="text-[9px] text-slate-500 mt-0.5">Run benchmark to see measured values</div>
                      }
                    </td>
                    <td className="px-3 py-3 text-emerald-400 text-[11px] font-bold">100% — Sensitive data kept local</td>
                    <td className="px-3 py-3 text-emerald-400 text-[11px] font-bold">
                      {hasRealData && proposed?.comm_overhead !== undefined
                        ? fmtPct(proposed.comm_overhead)
                        : <span className="text-slate-500 italic">Run benchmark</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-emerald-400 text-[11px] font-bold">
                      {hasRealData && proposed?.mean_pdr !== undefined
                        ? fmtPct(proposed.mean_pdr)
                        : <span className="text-slate-500 italic">Run benchmark</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-emerald-400 text-[11px] font-bold">
                      {hasRealData && proposed?.mean_latency_ms !== undefined
                        ? fmtMs(proposed.mean_latency_ms)
                        : <span className="text-slate-500 italic">Run benchmark</span>
                      }
                    </td>
                    <td className="px-3 py-3 text-emerald-400 text-[11px] font-bold">No</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2 — Traffic Density Scalability */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Section 2 — Traffic Density Scalability (Proposed MAPPO)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-[10px] uppercase tracking-wider">
                    {['Scenario', 'Vehicles', 'Latency (ms)', 'PDR', 'Throughput (Mbps)', 'Interference', 'Source'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SCENARIO_META.map(sc => {
                    const row = densityRows[sc.name];
                    const m   = row?.results?.['Proposed MAPPO'] || null;
                    const meta = row?.results?._meta || {};
                    return (
                      <tr key={sc.name} className={`border-b border-slate-800/60 ${sc.name === selectedScenario ? 'bg-cyan-950/10' : ''}`}>
                        <td className="px-3 py-2.5 text-white font-bold text-[11px]">{sc.label}</td>
                        <td className="px-3 py-2.5 text-slate-300 text-[11px]">
                          {meta.actual_vehicles || sc.num_vehicles || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-[11px]">
                          {m ? <span className="text-cyan-400">{fmtMs(m.mean_latency_ms)}</span> : <span className="text-slate-600 italic">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-[11px]">
                          {m ? <span className="text-emerald-400">{fmtPct(m.mean_pdr)}</span> : <span className="text-slate-600 italic">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-[11px]">
                          {m ? <span className="text-purple-400">{fmtMbps(m.mean_throughput_mbps)}</span> : <span className="text-slate-600 italic">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-[11px]">
                          {m ? <span className="text-orange-400">{fmtPct(m.mean_interference)}</span> : <span className="text-slate-600 italic">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-[10px]">
                          {row ? <DataSourceBadge source={row.source} /> : (
                            <span className="text-slate-600 italic text-[10px]">Not benchmarked</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {Object.keys(densityRows).length === 0 && (
              <NoDataBanner message="Run benchmarks for each scenario to populate the scalability table. Select a scenario and click 'Run 100-Step Benchmark' in the Benchmark Results tab." />
            )}

            {/* PDR vs Density chart — only if at least 2 scenarios have data */}
            {Object.keys(densityRows).length >= 2 && (() => {
              const densityChartData = SCENARIO_META
                .filter(sc => densityRows[sc.name]?.results?.['Proposed MAPPO'])
                .map(sc => ({
                  name: sc.label.replace(' Density', '').replace('Very High', 'V.High'),
                  PDR: Number(((densityRows[sc.name].results['Proposed MAPPO']?.mean_pdr || 0) * 100).toFixed(1)),
                  Latency: Number((densityRows[sc.name].results['Proposed MAPPO']?.mean_latency_ms || 0).toFixed(1)),
                }));
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      PDR vs Traffic Density (Proposed MAPPO)
                    </h4>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={densityChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 9 }} domain={[0, 100]} />
                          <Tooltip contentStyle={ttStyle} />
                          <Line type="monotone" dataKey="PDR" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Latency vs Traffic Density (Proposed MAPPO)
                    </h4>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={densityChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                          <Tooltip contentStyle={ttStyle} />
                          <Line type="monotone" dataKey="Latency" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4, fill: '#f43f5e' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default Results;
