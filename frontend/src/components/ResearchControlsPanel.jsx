import React, { useState } from 'react';
import { FlaskConical, Play, Cpu, Sliders, Layers } from 'lucide-react';

export function ResearchControlsPanel({
  scenario = 'low',
  aiMode = 'marl',
  numVehicles = 21,
  onRunExperiment,
  status = 'idle',
}) {
  const [selectedScenario, setSelectedScenario] = useState(scenario);
  const [selectedAiMode, setSelectedAiMode] = useState(aiMode);
  const [vehicleCount, setVehicleCount] = useState(numVehicles);

  const handleRun = () => {
    if (onRunExperiment) {
      onRunExperiment({
        scenario: selectedScenario,
        aiMode: selectedAiMode,
        numVehicles: vehicleCount,
      });
    }
  };

  return (
    <div className="p-5 rounded-2xl glass-card border border-cyan-500/30 bg-slate-900/80 font-mono space-y-5 shadow-xl">
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-cyan-400" />
          SIMULATION RESEARCH LAB — EXPERIMENT CONTROLS
        </h3>
        <span className="text-[10px] text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-500/30">
          INTERACTIVE AI TESTBED
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        {/* Scenario Selection */}
        <div className="space-y-2">
          <label className="text-slate-400 font-bold uppercase tracking-wider text-[11px] block">
            TRAFFIC SCENARIO
          </label>
          <div className="space-y-1.5">
            {[
              { id: 'low', label: 'Low (21 veh)', count: 21 },
              { id: 'medium', label: 'Medium (50 veh)', count: 50 },
              { id: 'high', label: 'High (100 veh)', count: 100 },
              { id: 'congestion', label: 'Congestion (300 veh)', count: 300 },
            ].map((sc) => (
              <label
                key={sc.id}
                onClick={() => {
                  setSelectedScenario(sc.id);
                  setVehicleCount(sc.count);
                }}
                className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all ${
                  selectedScenario === sc.id
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 font-bold'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scenario_radio"
                    checked={selectedScenario === sc.id}
                    onChange={() => {}}
                    className="accent-cyan-400"
                  />
                  <span>{sc.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Research Parameters Readout */}
        <div className="space-y-2">
          <label className="text-slate-400 font-bold uppercase tracking-wider text-[11px] block">
            RESEARCH PARAMETERS
          </label>
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Vehicles:</span>
              <span className="font-bold text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                [{vehicleCount}]
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Channels:</span>
              <span className="font-bold text-purple-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                [6]
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Interference:</span>
              <span className="font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                [{selectedScenario === 'congestion' || selectedScenario === 'high' ? 'High' : 'Moderate'}]
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">Emergency Vehicles:</span>
              <span className="font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                [5 URLLC]
              </span>
            </div>
          </div>
        </div>

        {/* AI Mode Selector */}
        <div className="space-y-2 flex flex-col justify-between">
          <div>
            <label className="text-slate-400 font-bold uppercase tracking-wider text-[11px] block mb-2">
              AI MODE SELECTOR
            </label>
            <div className="space-y-1.5">
              {[
                { id: 'marl', label: 'MARL (Proposed Dual-Critic)' },
                { id: 'random', label: 'Random Allocation' },
                { id: 'fixed', label: 'Fixed / Round-Robin' },
                { id: 'greedy', label: 'Greedy (Max-SINR)' },
              ].map((m) => (
                <label
                  key={m.id}
                  onClick={() => setSelectedAiMode(m.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                    selectedAiMode === m.id
                      ? 'border-purple-500 bg-purple-950/40 text-purple-300 font-bold'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="ai_mode_radio"
                    checked={selectedAiMode === m.id}
                    onChange={() => {}}
                    className="accent-purple-400"
                  />
                  <span>{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleRun}
            className="w-full mt-3 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            RUN EXPERIMENT
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResearchControlsPanel;
