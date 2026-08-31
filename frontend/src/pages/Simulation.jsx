import React, { useState } from 'react';
import SimulationControls from '../components/SimulationControls';
import VehicleMap from '../components/VehicleMap';
import VehicleTable from '../components/VehicleTable';
import ResearchControlsPanel from '../components/ResearchControlsPanel';
import LiveWhatChangedAlert from '../components/LiveWhatChangedAlert';
import VehicleDecisionReplay from '../components/VehicleDecisionReplay';
import StepByStepInspector from '../components/StepByStepInspector';
import { Activity, Wifi, PlaySquare } from 'lucide-react';
import { formatNumber, formatPercent } from '../utils/formatters';

const TABS = [
  { id: 'simulation', label: '① SUMO Simulation' },
  { id: 'decisions', label: '② Step-by-Step Decisions' },
  { id: 'state', label: '③ Vehicle & Comms State' },
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
    time_step = 0,
    metrics = {},
    live_alert = null,
    vehicle_decision_histories = {},
    latest_step_pipeline = null,
    ai_mode = 'marl',
  } = simulationState;

  const [activeTab, setActiveTab] = useState('simulation');
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const handleRunExperiment = ({ scenario, aiMode, numVehicles }) => {
    startSimulation(scenario, numVehicles, 600, speed, aiMode);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <PlaySquare className="w-6 h-6 text-cyan-400" />
            SUMO 6G V2X Simulation Center
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Microscopic mobility simulation, TraCI channel coordination, MARL research environment & interactive step execution
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

      {/* ① SUMO SIMULATION */}
      {activeTab === 'simulation' && (
        <div className="space-y-6">
          <ResearchControlsPanel
            scenario={simulationState.scenario || 'low'}
            aiMode={ai_mode}
            numVehicles={vehicles.length || 21}
            onRunExperiment={handleRunExperiment}
            status={status}
          />
          <SimulationControls
            status={status}
            speed={speed}
            onStart={startSimulation}
            onPause={pauseSimulation}
            onResume={resumeSimulation}
            onStep={stepSimulation}
            onSpeedChange={setSimulationSpeed}
            onStop={stopSimulation}
            onReset={resetSimulation}
          />
          <div className="space-y-3">
            <div className="flex justify-between items-center font-mono text-xs">
              <span className="text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-cyan-400" /> Bengaluru Silk Board Corridor (Live Mobility)
              </span>
              <span className="text-slate-400">Click marker to inspect vehicle agent</span>
            </div>
            <VehicleMap vehicles={vehicles} onSelectVehicle={setSelectedVehicle} />

            {selectedVehicle && (
              <div className="p-4 rounded-2xl border border-cyan-500/40 bg-cyan-950/20 font-mono text-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                  <div>
                    <div className="font-bold text-white text-sm">Target Agent: {selectedVehicle.vehicle_id}</div>
                    <div className="text-slate-400 text-[11px]">App: {selectedVehicle.app_type} | Speed: {selectedVehicle.speed_mps} m/s</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <div>Channel: <strong className="text-cyan-400">Ch {selectedVehicle.selected_channel + 1}</strong></div>
                  <div>SINR: <strong className="text-emerald-400">{selectedVehicle.sinr_db} dB</strong></div>
                  <div>PDR: <strong className="text-purple-400">{formatPercent(selectedVehicle.pdr)}</strong></div>
                  <div>Throughput: <strong className="text-amber-400">{selectedVehicle.throughput_mbps} Mbps</strong></div>
                </div>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ② STEP-BY-STEP DECISIONS */}
      {activeTab === 'decisions' && (
        <div className="space-y-6">
          <LiveWhatChangedAlert alert={live_alert} />
          <StepByStepInspector pipeline={latest_step_pipeline} currentStep={time_step} />
          <VehicleDecisionReplay vehicles={vehicles} histories={vehicle_decision_histories} />
        </div>
      )}

      {/* ③ VEHICLE & COMMS STATE */}
      {activeTab === 'state' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
            {[
              { label: 'Throughput', val: `${formatNumber(metrics.mean_throughput_mbps ?? 0, 1)} Mbps`, color: 'text-emerald-400' },
              { label: 'PDR Reliability', val: formatPercent(metrics.mean_pdr ?? 0), color: 'text-cyan-400' },
              { label: 'Mean Latency', val: `${formatNumber(metrics.mean_latency_ms ?? 0, 1)} ms`, color: 'text-purple-400' },
              { label: 'SINR Quality', val: `${formatNumber(metrics.mean_sinr_db ?? 0, 1)} dB`, color: 'text-blue-400' },
              { label: 'Interference', val: formatNumber(metrics.mean_interference ?? 0, 3), color: 'text-rose-400' },
              { label: 'Active Agents', val: `${vehicles.length} vehicles`, color: 'text-amber-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="p-3 rounded-xl glass-card border border-cyan-500/20">
                <div className="text-[10px] text-slate-400 uppercase">{label}</div>
                <div className={`text-sm font-bold mt-1 ${color}`}>{val}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Live Vehicle Telemetry & Attention Weights
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Showing {vehicles.length} active autonomous agents
              </span>
            </div>
            <VehicleTable
              vehicles={vehicles}
              onSelectVehicle={setSelectedVehicle}
              selectedVehicleId={selectedVehicle?.vehicle_id}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Simulation;
