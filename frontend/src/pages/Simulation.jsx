import React, { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  SkipForward,
  Activity,
  Gauge,
  Cpu,
  Radio,
  Clock,
  ShieldCheck,
  Layers,
  ChevronLeft,
  ChevronRight,
  Car,
} from 'lucide-react';
import { formatNumber, formatPercent, getChannelColor } from '../utils/formatters';
import { SumoCanvas } from '../components/SumoCanvas';

const TABS = [
  { id: 'live', label: '① Live Simulation' },
  { id: 'decisions', label: '② Vehicle Decisions' },
];

export function Simulation({
  simulationState,
  status,
  speed = 1.0,
  startSimulation,
  pauseSimulation,
  resumeSimulation,
  setSimulationSpeed,
  stepSimulation,
  stopSimulation,
  resetSimulation,
}) {
  const {
    vehicles = [],
    road_lanes = [],
    traffic_lights = [],
    time_step = 0,
    simulation_time = 0.0,
    sumo_step = 0,
    sumo_status = 'DISCONNECTED',
    channels = [],
  } = simulationState;

  const [activeTab, setActiveTab] = useState('live');
  const [selectedScenario, setSelectedScenario] = useState('low');
  const [selectedDuration, setSelectedDuration] = useState(600);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [guiEnabled, setGuiEnabled] = useState(false);

  const selectedVehicle = vehicles.find((v) => v.vehicle_id === selectedVehicleId) || vehicles[0] || null;

  const handleStart = () => {
    startSimulation(selectedScenario, null, selectedDuration, speed, 'marl', true, guiEnabled);
  };

  const getStatusBadge = () => {
    switch (sumo_status) {
      case 'CONNECTED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            SUMO CONNECTED
          </span>
        );
      case 'STARTING':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            STARTING SUMO...
          </span>
        );
      case 'STOPPED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            SUMO STOPPED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            SUMO NOT CONNECTED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans">

      {/* ── PAGE HEADER ──────────────────────────────────────────── */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <Radio className="w-6 h-6 text-cyan-400" />
            V2X Simulation Center
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Eclipse SUMO + TraCI · MAPPO Decentralized Agents · 6G Spectrum Coordination
          </p>
        </div>

        {/* 2-Tab Segmented Control */}
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

      {/* ══════════════════════════════════════════════════════════════
          TAB ① — LIVE SIMULATION
          (Control Panel + Canvas + Vehicles Table)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'live' && (
        <div className="space-y-6">

          {/* Status bar */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-6 text-xs font-mono bg-slate-900/50 px-5 py-3 rounded-t-xl border border-slate-800 border-b-0 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-400">Time:</span>
                <strong className="text-white">{(simulation_time || time_step).toFixed(1)}s</strong>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span className="text-slate-400">Step:</span>
                <strong className="text-white">
                  {sumo_step || time_step}
                  {status === 'running' || status === 'paused'
                    ? <span className="text-slate-500"> / {selectedDuration}</span>
                    : null}
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400">Live Vehicles:</span>
                <strong className="text-emerald-400">{vehicles.length}</strong>
              </div>
              {(status === 'running' || status === 'paused') && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Remaining:</span>
                  <strong className="text-amber-400">
                    {Math.max(0, selectedDuration - (sumo_step || time_step))} steps
                  </strong>
                </div>
              )}
              <div className="ml-auto">{getStatusBadge()}</div>
            </div>
            {/* Thin progress bar */}
            {(status === 'running' || status === 'paused') && selectedDuration > 0 && (
              <div className="w-full h-1.5 bg-slate-800 rounded-b-xl overflow-hidden border border-slate-800 border-t-0">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, ((sumo_step || time_step) / selectedDuration) * 100)}%` }}
                />
              </div>
            )}
          </div>


          {/* Simulation Control */}
          <div className="p-5 rounded-2xl glass-card border border-cyan-500/30 font-mono space-y-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Play className="w-4 h-4 text-cyan-400" />
              Simulation Control
            </h3>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold uppercase">Scenario:</span>
                  <select
                    value={selectedScenario}
                    onChange={(e) => setSelectedScenario(e.target.value)}
                    disabled={status === 'running' || status === 'paused' || status === 'starting'}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="low">LOW (20 veh)</option>
                    <option value="medium">MEDIUM (50 veh)</option>
                    <option value="high">HIGH (100 veh)</option>
                    <option value="very_high">VERY HIGH (200 veh)</option>
                    <option value="congestion">CONGESTION (300 veh)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold uppercase">Duration:</span>
                  <input
                    type="number"
                    min={10}
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(Math.max(10, Number(e.target.value) || 10))}
                    disabled={status === 'running' || status === 'paused' || status === 'starting'}
                    className="w-24 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs text-slate-500">steps</span>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700">
                  <input
                    type="checkbox"
                    checked={guiEnabled}
                    onChange={(e) => setGuiEnabled(e.target.checked)}
                    disabled={status === 'running' || status === 'paused' || status === 'starting'}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span>Open SUMO-GUI Window</span>
                </label>

                <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-700">
                  <Gauge className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] text-slate-400">Speed:</span>
                  {[0.5, 1.0, 2.0, 4.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSimulationSpeed && setSimulationSpeed(s)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        speed === s ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {status === 'starting' ? (
                  // Pulsing loading state while SUMO + PyTorch initialise
                  <button disabled className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs cursor-not-allowed animate-pulse">
                    <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping inline-block" />
                    STARTING...
                  </button>
                ) : status !== 'running' && status !== 'paused' ? (
                  <button onClick={handleStart} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95">
                    <Play className="w-4 h-4 fill-current" /> START
                  </button>
                ) : status === 'running' ? (
                  <>
                    <button onClick={pauseSimulation} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-all">
                      <Pause className="w-4 h-4 fill-current" /> PAUSE
                    </button>
                    <button onClick={stopSimulation} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition-all">
                      <Square className="w-4 h-4 fill-current" /> STOP
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={resumeSimulation} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow transition-all">
                      <Play className="w-4 h-4 fill-current" /> RESUME
                    </button>
                    <button onClick={stepSimulation} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-cyan-500/40 transition-all">
                      <SkipForward className="w-4 h-4" /> STEP
                    </button>
                    <button onClick={stopSimulation} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition-all">
                      <Square className="w-4 h-4 fill-current" /> STOP
                    </button>
                  </>
                )}
                <button onClick={resetSimulation} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all">
                  <RotateCcw className="w-3.5 h-3.5" /> RESET
                </button>
              </div>
            </div>
          </div>

          {/* SUMO Canvas */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Live SUMO Simulation — Bengaluru Road Network
              </span>
              <span className="text-xs text-cyan-400 font-normal">{vehicles.length} Active Vehicles</span>
            </h3>
            <SumoCanvas
              vehicles={vehicles}
              roadLanes={road_lanes}
              trafficLights={traffic_lights}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={(v) => setSelectedVehicleId(v?.vehicle_id)}
            />
          </div>

          {/* Vehicles Table */}
          <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3 font-mono">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Live SUMO Vehicles (TraCI Source of Truth)
              </h3>
              <span className="text-xs text-slate-400">{vehicles.length} vehicles active</span>
            </div>

            {vehicles.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-xl">
                <Radio className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-bold text-slate-400">SUMO is not running or no vehicles on network.</div>
                <div className="text-xs text-slate-500">
                  Click <strong className="text-cyan-400">START</strong> above to launch SUMO and begin TraCI streaming.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5">Vehicle ID</th>
                      <th className="p-2.5">Speed</th>
                      <th className="p-2.5">Lane</th>
                      <th className="p-2.5">Edge</th>
                      <th className="p-2.5">Neighbors</th>
                      <th className="p-2.5">Channel</th>
                      <th className="p-2.5">SINR</th>
                      <th className="p-2.5">Latency</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {vehicles.map((v) => {
                      const isSelected = selectedVehicle && selectedVehicle.vehicle_id === v.vehicle_id;
                      return (
                        <tr
                          key={v.vehicle_id}
                          onClick={() => {
                            setSelectedVehicleId(v.vehicle_id);
                            setActiveTab('decisions');
                          }}
                          className={`transition-colors cursor-pointer hover:bg-slate-800/60 ${
                            isSelected ? 'bg-cyan-500/10 font-bold border-l-2 border-cyan-400' : ''
                          }`}
                        >
                          <td className="p-2.5 text-cyan-400">{v.vehicle_id}</td>
                          <td className="p-2.5 text-slate-200">{v.speed_kmh ? `${v.speed_kmh} km/h` : `${v.speed_mps} m/s`}</td>
                          <td className="p-2.5 text-slate-400 truncate max-w-[100px]" title={v.lane}>{v.lane || 'lane_0'}</td>
                          <td className="p-2.5 text-slate-400 truncate max-w-[100px]" title={v.edge}>{v.edge || 'silk_board'}</td>
                          <td className="p-2.5 text-purple-300 font-semibold text-center">{v.num_neighbours}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-white text-[11px] font-bold" style={{ backgroundColor: getChannelColor(v.selected_channel) }}>
                              Ch {v.selected_channel + 1}
                            </span>
                          </td>
                          <td className="p-2.5 text-emerald-400 font-semibold">{v.sinr_db} dB</td>
                          <td className="p-2.5 text-slate-300">{v.latency_ms} ms</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              v.pdr >= 0.85 ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                            }`}>
                              {v.status || (v.pdr >= 0.85 ? 'Active' : 'Degraded')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {vehicles.length > 0 && (
              <p className="text-[11px] text-slate-500 text-center font-mono">
                Click any row to open its AI Decision details in the <span className="text-cyan-400 font-bold">② Vehicle Decisions</span> tab
              </p>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB ② — VEHICLE DECISIONS
          (Inspector + AI Pipeline)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'decisions' && (
        <div className="space-y-6">

          {/* Vehicle Selection Toolbar */}
          <div className="p-4 rounded-2xl glass-card border border-cyan-500/30 bg-slate-900/70 font-mono space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-cyan-400" />
                <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                  Inspect Vehicle AI Decision:
                </span>
              </div>

              {/* Dropdown & Prev/Next buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const currentIndex = vehicles.findIndex((v) => v.vehicle_id === selectedVehicle?.vehicle_id);
                    if (currentIndex > 0) {
                      setSelectedVehicleId(vehicles[currentIndex - 1].vehicle_id);
                    } else if (vehicles.length > 0) {
                      setSelectedVehicleId(vehicles[vehicles.length - 1].vehicle_id);
                    }
                  }}
                  disabled={vehicles.length <= 1}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-xs flex items-center gap-1 transition-all"
                  title="Previous vehicle"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>

                <select
                  value={selectedVehicle?.vehicle_id || ''}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/50 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer shadow-sm shadow-cyan-500/10"
                >
                  {vehicles.length === 0 ? (
                    <option value="">No vehicles active</option>
                  ) : (
                    vehicles.map((v) => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>
                        Vehicle {v.vehicle_id} — Ch {v.selected_channel + 1} ({v.speed_kmh || (v.speed_mps * 3.6).toFixed(1)} km/h, {v.num_neighbours} nbrs)
                      </option>
                    ))
                  )}
                </select>

                <button
                  onClick={() => {
                    const currentIndex = vehicles.findIndex((v) => v.vehicle_id === selectedVehicle?.vehicle_id);
                    if (currentIndex >= 0 && currentIndex < vehicles.length - 1) {
                      setSelectedVehicleId(vehicles[currentIndex + 1].vehicle_id);
                    } else if (vehicles.length > 0) {
                      setSelectedVehicleId(vehicles[0].vehicle_id);
                    }
                  }}
                  disabled={vehicles.length <= 1}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-xs flex items-center gap-1 transition-all"
                  title="Next vehicle"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <span className="text-[11px] text-slate-400">
                {vehicles.length > 0
                  ? `Viewing Vehicle ${selectedVehicle?.vehicle_id ?? 'none'} (${vehicles.findIndex((v) => v.vehicle_id === selectedVehicle?.vehicle_id) + 1} of ${vehicles.length} active)`
                  : '0 vehicles active'}
              </span>
            </div>

            {/* Quick Vehicle Pills for fast switching */}
            {vehicles.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase tracking-wide mr-1">Quick Select:</span>
                {vehicles.slice(0, 16).map((v) => {
                  const isSelected = selectedVehicle && selectedVehicle.vehicle_id === v.vehicle_id;
                  return (
                    <button
                      key={v.vehicle_id}
                      onClick={() => setSelectedVehicleId(v.vehicle_id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 scale-105'
                          : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                      }`}
                    >
                      Veh {v.vehicle_id}
                    </button>
                  );
                })}
                {vehicles.length > 16 && (
                  <span className="text-[10px] text-slate-400">+{vehicles.length - 16} more in dropdown</span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-mono">

            {/* Vehicle Inspector (4 cols) */}
            <div className="lg:col-span-4 p-5 rounded-2xl glass-card border border-cyan-500/30 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Vehicle Inspector
                </h3>
                {vehicles.length > 0 ? (
                  <select
                    value={selectedVehicle?.vehicle_id || ''}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="text-[11px] bg-cyan-950 text-cyan-300 px-2.5 py-0.5 rounded border border-cyan-500/40 font-bold focus:outline-none cursor-pointer"
                  >
                    {vehicles.map((v) => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>
                        Veh {v.vehicle_id}
                      </option>
                    ))}
                  </select>
                ) : selectedVehicle ? (
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
                    {selectedVehicle.vehicle_id}
                  </span>
                ) : null}
              </div>

              {selectedVehicle ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Speed</div>
                      <div className="font-bold text-white text-sm mt-0.5">
                        {selectedVehicle.speed_kmh ? `${selectedVehicle.speed_kmh} km/h` : `${selectedVehicle.speed_mps} m/s`}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Neighbors</div>
                      <div className="font-bold text-purple-400 text-sm mt-0.5">{selectedVehicle.num_neighbours} vehicles</div>
                      {selectedVehicle.neighboring_vehicles && selectedVehicle.neighboring_vehicles.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {selectedVehicle.neighboring_vehicles.map((nid) => (
                            <span key={nid} className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                              {nid}
                            </span>
                          ))}  
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Subchannel:</span>
                      <span className="px-2 py-0.5 rounded text-white text-[11px] font-bold" style={{ backgroundColor: getChannelColor(selectedVehicle.selected_channel) }}>
                        CH{selectedVehicle.selected_channel + 1}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">SINR:</span>
                      <strong className="text-emerald-400">{selectedVehicle.sinr_db} dB</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Interference:</span>
                      <strong className="text-rose-400">{formatNumber(selectedVehicle.interference, 3)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">PDR:</span>
                      <strong className="text-cyan-400">{formatPercent(selectedVehicle.pdr)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Latency:</span>
                      <strong className="text-purple-300">{selectedVehicle.latency_ms} ms</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Throughput:</span>
                      <strong className="text-amber-300">{selectedVehicle.throughput_mbps} Mbps</strong>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>GPS location stays on this vehicle. Only a temporary ID is shared over the air - your real identity is never broadcast.</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                  <p>No vehicle selected.</p>
                  <button
                    onClick={() => setActiveTab('live')}
                    className="text-cyan-400 underline text-xs hover:text-cyan-300"
                  >
                    Go to Live Simulation tab and click a vehicle row.
                  </button>
                </div>
              )}
            </div>

            {/* AI Decision Pipeline (8 cols) */}
            <div className="lg:col-span-8 p-6 rounded-2xl glass-card border border-purple-500/30 space-y-5 bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/20">
              <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  AI Spectrum Decision Pipeline
                </h3>
                {vehicles.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Agent:</span>
                    <select
                      value={selectedVehicle?.vehicle_id || ''}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      className="text-xs font-bold text-cyan-300 bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-500/40 focus:outline-none cursor-pointer"
                    >
                      {vehicles.map((v) => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>
                          Vehicle {v.vehicle_id} — Decision Execution
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                    System Pipeline Overview
                  </span>
                )}
              </div>

              {/* 7-Step Pipeline */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
                {[
                  { step: '1. SUMO Obs', label: 'Local Speed & Neighbors', color: 'border-slate-700 bg-slate-900' },
                  { step: '2. Privacy Gateway', label: 'Local Boundary Filter', color: 'border-emerald-500/40 bg-emerald-950/30' },
                  { step: '3. 4-Head Attention', label: 'Spatial/Temp/Freq/App', color: 'border-purple-500/40 bg-purple-950/30' },
                  { step: '4. Action Masking', label: 'Filter Severe Channels', color: 'border-amber-500/40 bg-amber-950/30' },
                  { step: '5. MAPPO Policy', label: 'Clipped PPO Distribution', color: 'border-cyan-500/40 bg-cyan-950/30' },
                  { step: '6. Local Critic', label: 'Onboard V(s,a) Estimate', color: 'border-blue-500/40 bg-blue-950/30' },
                  {
                    step: '7. Subchannel',
                    label: selectedVehicle ? `CH${selectedVehicle.selected_channel + 1} Assigned` : 'CH Selected',
                    color: 'border-emerald-500/40 bg-emerald-950/40',
                  },
                ].map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border ${item.color} flex flex-col justify-between min-h-[90px]`}>
                    <div className="text-[10px] text-cyan-400 font-bold uppercase">{item.step}</div>
                    <div className="font-bold text-white text-[11px] mt-1 leading-tight">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Attention + Masking detail */}
              {selectedVehicle && selectedVehicle.attention && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-slate-300 uppercase flex items-center justify-between">
                      <span>4-Head Attention Weights</span>
                      <span className="text-[10px] text-purple-400">Sum = 100%</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      {[
                        { name: 'Spatial (Neighbors & Density)', val: selectedVehicle.attention.spatial || 0.32, color: 'bg-cyan-500' },
                        { name: 'Temporal (Speed & Accel History)', val: selectedVehicle.attention.temporal || 0.24, color: 'bg-blue-500' },
                        { name: 'Frequency (Interference & Masking)', val: selectedVehicle.attention.frequency || 0.28, color: 'bg-purple-500' },
                        { name: 'Application (URLLC / Safety Priority)', val: selectedVehicle.attention.application || 0.16, color: 'bg-emerald-500' },
                      ].map((att) => (
                        <div key={att.name} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">{att.name}</span>
                            <strong className="text-white">{(att.val * 100).toFixed(1)}%</strong>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div className={`h-full ${att.color}`} style={{ width: `${att.val * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-slate-300 uppercase flex items-center justify-between">
                      <span>Action Masking & Subchannel Availability</span>
                      <span className="text-[10px] text-emerald-400">Pre-Decision Mask</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {channels.map((ch) => {
                        const isAssigned = selectedVehicle.selected_channel === ch.channel_id;
                        const isMasked = ch.is_masked;
                        return (
                          <div
                            key={ch.channel_id}
                            className={`p-2.5 rounded-xl border text-center ${
                              isAssigned
                                ? 'border-cyan-400 bg-cyan-950/60 shadow-md shadow-cyan-500/20'
                                : isMasked
                                ? 'border-rose-900/60 bg-rose-950/20 opacity-50'
                                : 'border-slate-800 bg-slate-950'
                            }`}
                          >
                            <div className="font-bold text-white text-[11px]">Ch {ch.channel_id + 1}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Interf: {formatNumber(ch.interference, 2)}</div>
                            <div className="mt-1">
                              {isAssigned ? (
                                <span className="px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950 font-bold text-[9px] uppercase">Selected</span>
                              ) : isMasked ? (
                                <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 font-bold text-[9px] uppercase">Masked</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold text-[9px] uppercase">Viable</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Simulation;
