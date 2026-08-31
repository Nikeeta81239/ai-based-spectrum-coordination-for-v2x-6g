import React from 'react';
import { Layers, ArrowDown, Cpu, Activity, CheckCircle, Zap } from 'lucide-react';

export function StepByStepInspector({ pipeline = null, currentStep = 0 }) {
  const data = pipeline || {
    step: currentStep || 245,
    environment: { num_vehicles: 21, active_channels: 6, scenario: 'low', ai_mode: 'MARL' },
    observations: { vehicle_id: 'V17', speed_mps: 14.2, sinr_db: 18.4, interference: 0.28, app_type: 'URLLC Safety' },
    attention: { spatial: 0.35, temporal: 0.25, application: 0.25, frequency: 0.15 },
    candidate_channels: [
      { channel: 'Ch 1', score: 0.75 },
      { channel: 'Ch 2', score: 0.25 },
      { channel: 'Ch 4', score: 0.92 },
      { channel: 'Ch 5', score: 0.88 },
    ],
    marl_action: { selected_channel: 'CH4', power_dbm: 23.0 },
    communication_result: { latency_ms: 14.2, pdr: 0.994, sinr_db: 22.1 },
  };

  const stepsList = [
    { num: 1, title: 'Environment State', detail: `Vehicles: ${data.environment.num_vehicles} | Channels: ${data.environment.active_channels} | Mode: ${data.environment.ai_mode}` },
    { num: 2, title: 'Vehicle Observations', detail: `Target: ${data.observations.vehicle_id} | App: ${data.observations.app_type} | SINR: ${data.observations.sinr_db} dB` },
    { num: 3, title: '4-Head Attention Weights', detail: `Spatial (${data.attention.spatial}) | Temporal (${data.attention.temporal}) | App (${data.attention.application}) | Freq (${data.attention.frequency})` },
    { num: 4, title: 'Candidate Channels', detail: data.candidate_channels.map((c) => `${c.channel}: ${c.score}`).join(' | ') },
    { num: 5, title: 'MARL Action Selected', detail: `Channel: ${data.marl_action.selected_channel} | Power: ${data.marl_action.power_dbm} dBm` },
    { num: 6, title: 'Communication Result', detail: `Latency: ${data.communication_result.latency_ms} ms | PDR: ${(data.communication_result.pdr * 100).toFixed(1)}% | SINR: ${data.communication_result.sinr_db} dB` },
  ];

  return (
    <div className="p-5 rounded-2xl glass-card border border-cyan-500/30 font-mono space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          STEP-BY-STEP AI FRAME-BY-FRAME PIPELINE
        </h3>
        <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-500/30">
          STEP {data.step}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-center text-xs">
        {stepsList.map((st, idx) => (
          <div key={st.num} className="flex flex-col items-center">
            <div className="w-full p-3 rounded-xl border border-slate-800 bg-slate-950/80 space-y-1 hover:border-cyan-500/40 transition-all min-h-[110px] flex flex-col justify-between">
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                Step {st.num}
              </div>
              <div className="font-bold text-white text-[11px] leading-tight">{st.title}</div>
              <div className="text-[10px] text-slate-400 leading-snug truncate" title={st.detail}>
                {st.detail}
              </div>
            </div>
            {idx < stepsList.length - 1 && (
              <div className="text-cyan-400 my-1 hidden md:block text-xs">→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default StepByStepInspector;
