import React, { useState, useEffect } from 'react';
import ExplainabilityPanel from '../components/ExplainabilityPanel';
import AttentionHeatmap from '../components/AttentionHeatmap';
import GeminiResearchAssistantCard from '../components/GeminiResearchAssistantCard';
import AskAboutThisDecision from '../components/AskAboutThisDecision';
import ExplanationEvidenceIndicator from '../components/ExplanationEvidenceIndicator';
import ExplanationHistoryLog from '../components/ExplanationHistoryLog';
import { BrainCircuit, Radio, Sparkles, Activity, ShieldCheck } from 'lucide-react';
import api from '../api/api';
import { formatPercent, formatNumber } from '../utils/formatters';

const TABS = [
  { id: 'decision', label: '① Vehicle Decision Analysis' },
  { id: 'attention', label: '② Attention & Feature Explanation' },
  { id: 'gemini', label: '③ Gemini AI Assistant' },
];

export function Explainability({ simulationState = {} }) {
  const liveVehicles = simulationState?.vehicles || [];

  const [activeTab, setActiveTab] = useState('decision');
  const [vehicleList, setVehicleList] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('veh_001');
  const [explanation, setExplanation] = useState(null);
  const [assistantData, setAssistantData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sync or fetch vehicle roster
  useEffect(() => {
    if (liveVehicles.length > 0) {
      setVehicleList(liveVehicles);
      if (!liveVehicles.some((v) => v.vehicle_id === selectedVehicleId)) {
        setSelectedVehicleId(liveVehicles[0].vehicle_id);
      }
    } else {
      // Fetch available vehicle cohort from backend
      api.getAllExplanations()
        .then((r) => {
          const list = r.data?.explanations || [];
          if (list.length > 0) {
            setVehicleList(list);
            if (!selectedVehicleId) {
              setSelectedVehicleId(list[0].vehicle_id);
            }
          }
        })
        .catch(() => {});
    }
  }, [liveVehicles]);

  // Fetch explanation when selected vehicle changes
  useEffect(() => {
    if (!selectedVehicleId) return;
    setLoading(true);
    Promise.all([
      api.getExplanation(selectedVehicleId).then((r) => setExplanation(r.data)).catch(() => {}),
      api.getGeminiAssistant({ vehicle_id: selectedVehicleId }).then((r) => setAssistantData(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [selectedVehicleId]);

  const currentLive = liveVehicles.find((v) => v.vehicle_id === selectedVehicleId);
  const isLive = liveVehicles.length > 0;

  // Active vehicle stats (prefer live TraCI, fallback to explanation data)
  const stats = {
    speed: currentLive?.speed_mps ?? explanation?.speed_mps ?? 12.5,
    sinr: currentLive?.sinr_db ?? explanation?.sinr_db ?? 22.4,
    pdr: currentLive?.pdr ?? explanation?.pdr ?? 0.988,
    channel: currentLive ? `CH${currentLive.selected_channel + 1}` : explanation?.channel_label || 'CH4',
    appType: currentLive?.app_type ?? explanation?.app_type ?? 'safety',
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2.5">
            <BrainCircuit className="w-6 h-6 text-purple-400" />
            Explainable AI (XAI) & Research Assistant Lab
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Attention stream inspection, Gemini evidence-bound explanations, and interactive decision Q&A
          </p>
        </div>

        {/* 3-Tab Segmented Control */}
        <div className="flex items-center rounded-xl bg-slate-900/90 border border-slate-800 p-1 font-mono text-xs gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Target Vehicle Agent Selector */}
      <div className="flex items-center justify-between gap-4 glass-card p-4 rounded-xl border border-slate-800 font-mono text-xs flex-wrap">
        <div className="flex items-center gap-3">
          <label className="text-slate-400 font-semibold uppercase">Target Vehicle Agent:</label>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-400 font-bold focus:outline-none"
          >
            {vehicleList.length > 0 ? (
              vehicleList.map((v) => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  {v.vehicle_id} — {v.channel_label || `CH${(v.selected_channel ?? 0) + 1}`} ({v.app_type || 'normal'})
                </option>
              ))
            ) : (
              <>
                <option value="veh_001">veh_001 — CH4 (safety)</option>
                <option value="veh_002">veh_002 — CH6 (normal)</option>
                <option value="veh_003">veh_003 — CH8 (safety)</option>
              </>
            )}
          </select>

          <span
            className={`text-[10px] px-2.5 py-0.5 rounded-full border ${
              isLive
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/60'
                : 'text-purple-300 border-purple-500/30 bg-purple-950/60'
            }`}
          >
            {isLive ? '● LIVE SUMO TRACI' : '● SCENARIO BASELINE AGENT'}
          </span>
        </div>

        {/* Live Vehicle Telemetry Chips */}
        <div className="flex items-center gap-4 text-[11px] text-slate-300">
          <span>
            Selected: <strong className="text-white">{stats.channel}</strong>
          </span>
          <span>
            Speed: <strong className="text-cyan-400">{formatNumber(stats.speed, 1)} m/s</strong>
          </span>
          <span>
            SINR: <strong className="text-emerald-400">{formatNumber(stats.sinr, 1)} dB</strong>
          </span>
          <span>
            PDR: <strong className="text-purple-400">{formatPercent(stats.pdr)}</strong>
          </span>
        </div>
      </div>

      {/* ① VEHICLE DECISION ANALYSIS */}
      {activeTab === 'decision' && (
        <div className="space-y-6">
          <ExplainabilityPanel explanation={explanation} />
        </div>
      )}

      {/* ② ATTENTION & FEATURE EXPLANATION */}
      {activeTab === 'attention' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
            <AttentionHeatmap
              attention={
                explanation?.attention_importance || {
                  Spatial: 0.35,
                  Temporal: 0.22,
                  Application: 0.28,
                  Frequency: 0.15,
                }
              }
            />

            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Feature Importance Rankings
              </h4>
              <div className="space-y-2.5 text-xs">
                {Object.entries(
                  explanation?.feature_importance || {
                    'Channel Interference': 0.32,
                    'Channel Availability': 0.28,
                    'Application Priority': 0.22,
                    'Vehicle Density': 0.12,
                    'Vehicle Speed': 0.06,
                  }
                ).map(([feature, val]) => (
                  <div key={feature} className="flex justify-between items-center">
                    <span className="text-slate-300">{feature}</span>
                    <span className="text-cyan-400 font-bold">{formatPercent(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ExplanationEvidenceIndicator
            evidenceStrength={assistantData?.evidence_checklist?.evidence_strength || 'HIGH'}
          />
        </div>
      )}

      {/* ③ GEMINI AI ASSISTANT */}
      {activeTab === 'gemini' && (
        <div className="space-y-6">
          <GeminiResearchAssistantCard
            vehicleId={selectedVehicleId || 'veh_001'}
            evidence={explanation}
            assistantData={assistantData}
          />
          <AskAboutThisDecision vehicleId={selectedVehicleId || 'veh_001'} />
          <ExplanationHistoryLog onSelectVehicle={setSelectedVehicleId} />
        </div>
      )}
    </div>
  );
}

export default Explainability;
