import React, { useState } from 'react';
import { Play, Pause, Square, RotateCcw, FastForward, SkipForward, Activity, Gauge } from 'lucide-react';

export function SimulationControls({
  status,
  speed = 1.0,
  onStart,
  onPause,
  onResume,
  onStep,
  onSpeedChange,
  onStop,
  onReset,
  scenarios = ['low', 'medium', 'high', 'very_high', 'congestion'],
}) {
  const [selectedScenario, setSelectedScenario] = useState('low');
  const [numVehicles, setNumVehicles] = useState(21);
  const [duration, setDuration] = useState(600);
  const [currentSpeed, setCurrentSpeed] = useState(speed);

  const handleStart = () => {
    onStart(selectedScenario, numVehicles, duration, currentSpeed);
  };

  const handleSpeed = (newSpeed) => {
    setCurrentSpeed(newSpeed);
    if (onSpeedChange) onSpeedChange(newSpeed);
  };

  return (
    <div className="p-5 rounded-2xl border border-cyan-500/20 glass-card flex flex-wrap items-center justify-between gap-4 font-mono shadow-lg shadow-cyan-950/40">
      {/* Parameters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-cyan-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3" /> Scenario
          </label>
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            disabled={status === 'running' || status === 'paused'}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {scenarios.map((sc) => (
              <option key={sc} value={sc}>
                {sc.toUpperCase()} DENSITY
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Vehicles</label>
          <input
            type="number"
            min={5}
            max={300}
            value={numVehicles}
            onChange={(e) => setNumVehicles(Number(e.target.value))}
            disabled={status === 'running' || status === 'paused'}
            className="w-20 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 text-center"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Duration (steps)</label>
          <input
            type="number"
            min={50}
            max={5000}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={status === 'running' || status === 'paused'}
            className="w-24 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400 text-center"
          />
        </div>

        {/* Speed Multiplier selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Gauge className="w-3 h-3 text-purple-400" /> Speed
          </label>
          <div className="flex items-center rounded-xl bg-slate-900/90 border border-slate-700 p-0.5">
            {[0.5, 1.0, 2.0, 4.0].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeed(s)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  currentSpeed === s
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {status === 'idle' || status === 'stopped' || status === 'completed' ? (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Simulation
          </button>
        ) : status === 'running' ? (
          <>
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/30 transition-all"
            >
              <Pause className="w-4 h-4 fill-current" />
              Pause
            </button>
            <button
              onClick={onStop}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop
            </button>
          </>
        ) : (
          /* status === 'paused' */
          <>
            <button
              onClick={onResume}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/30 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              Resume
            </button>
            <button
              onClick={onStep}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-cyan-500/30 transition-all"
              title="Advance 1 step"
            >
              <SkipForward className="w-4 h-4" />
              Step
            </button>
            <button
              onClick={onStop}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop
            </button>
          </>
        )}

        <button
          onClick={onReset}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all"
          title="Reset environment"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
}

export default SimulationControls;
