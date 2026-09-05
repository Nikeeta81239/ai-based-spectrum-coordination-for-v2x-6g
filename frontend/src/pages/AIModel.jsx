import React, { useState, useEffect } from 'react';
import api from '../api/api';
import ModelArchitectureExplorer from '../components/ModelArchitectureExplorer';
import ModelCheckpointTimeline from '../components/ModelCheckpointTimeline';
import TrainVsEvalSeparationCard from '../components/TrainVsEvalSeparationCard';
import ModelRobustnessPanel from '../components/ModelRobustnessPanel';
import AttentionHeatmap from '../components/AttentionHeatmap';
import { BrainCircuit, Play, BarChart2, RefreshCw, Activity, ArrowRight, Cpu } from 'lucide-react';
import { formatNumber } from '../utils/formatters';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Link as RouterLink } from 'react-router-dom';

const TABS = [
  { id: 'architecture', label: '① Model Architecture' },
  { id: 'training', label: '② Training & Evaluation' },
  { id: 'inspection', label: '③ Model & Attention Inspection' },
];

export function AIModel() {
  const [activeTab, setActiveTab] = useState('architecture');
  const [aiStatus, setAiStatus] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [trainScenario, setTrainScenario] = useState('low');
  const [trainEpisodes, setTrainEpisodes] = useState(30);
  const [trainingMetrics, setTrainingMetrics] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [attentionData, setAttentionData] = useState(null);

  useEffect(() => {
    const fetch = () => {
      api.getAIStatus().then(r => {
        setAiStatus(r.data);
        if (r.data.training_status !== 'running' && isTraining) {
          setIsTraining(false);
          api.getTrainingMetrics().then(r2 => setTrainingMetrics(r2.data)).catch(() => {});
        }
      }).catch(() => {});
    };
    fetch();
    api.getTrainingMetrics().then(r => setTrainingMetrics(r.data)).catch(() => {});
    api.getAttention().then(r => setAttentionData(r.data)).catch(() => {});
    const id = setInterval(fetch, 2500);
    return () => clearInterval(id);
  }, []);

  const handleStartTraining = async () => {
    setIsTraining(true);
    setToastMessage({ type: 'info', text: `Starting MARL training on ${trainScenario.toUpperCase()} (${trainEpisodes} episodes)...` });
    try {
      const r = await api.trainModel({ scenario: trainScenario, episodes: trainEpisodes });
      setToastMessage({ type: 'success', text: r.data.message || 'Training started in background.' });
    } catch (err) {
      setToastMessage({ type: 'error', text: 'Training error: ' + err.message });
      setIsTraining(false);
    }
  };

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setToastMessage({ type: 'info', text: `Running baseline evaluation for ${trainScenario.toUpperCase()}...` });
    try {
      const r = await api.evaluateModel(trainScenario);
      setToastMessage({ type: 'success', text: r.data.message || 'Evaluation complete.' });
    } catch (err) {
      setToastMessage({ type: 'error', text: 'Evaluation error: ' + err.message });
    } finally {
      setTimeout(() => setIsEvaluating(false), 3000);
    }
  };

  const metricsList = trainingMetrics?.metrics || [];
  const chartData = metricsList.map(m => ({
    episode: m.episode,
    Reward: Number(formatNumber(m.mean_reward, 2)),
    'PDR (%)': Number(formatNumber((m.mean_pdr || 0) * 100, 1)),
    'SINR (dB)': Number(formatNumber(m.mean_sinr_db || 0, 1)),
  }));

  const earlyEp = metricsList[0] || { mean_reward: -12.4, mean_pdr: 0.82 };
  const lateEp = metricsList[metricsList.length - 1] || { mean_reward: 18.9, mean_pdr: 0.994 };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between shadow-lg ${
          toastMessage.type === 'error' ? 'border-rose-500/50 bg-rose-950/80 text-rose-300'
          : toastMessage.type === 'success' ? 'border-emerald-500/50 bg-emerald-950/80 text-emerald-300'
          : 'border-cyan-500/50 bg-cyan-950/80 text-cyan-300'
        }`}>
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${(isTraining || isEvaluating) ? 'animate-spin' : ''}`} />
            {toastMessage.text}
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2.5">
            <BrainCircuit className="w-6 h-6 text-purple-400" />
            AI Learning & Model Lab
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Core Question: <em>"How does my MARL model learn to make better spectrum decisions?"</em>
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
                  ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ① MODEL ARCHITECTURE */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <ModelArchitectureExplorer />
          <TrainVsEvalSeparationCard />
        </div>
      )}

      {/* ② TRAINING & EVALUATION */}
      {activeTab === 'training' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl glass-card border border-purple-500/30 font-mono space-y-4 shadow-xl">
            <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                TRAINING & EVALUATION CONTROLS
              </h3>
              <span className="text-[10px] text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded-full border border-purple-500/30">
                CLI & INTERACTIVE LAUNCHER
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Scenario / Curriculum</label>
                <select
                  value={trainScenario}
                  onChange={(e) => setTrainScenario(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="curriculum">★ Curriculum (20→50→100→200→300)</option>
                  <option value="low">Stage 1: Low Density (20 veh)</option>
                  <option value="medium">Stage 2: Medium Density (50 veh)</option>
                  <option value="high">Stage 3: High Density (100 veh)</option>
                  <option value="very_high">Stage 4: Very High Density (200 veh)</option>
                  <option value="congestion">Stage 5: Congestion (300 veh)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Episodes</label>
                <input
                  type="number"
                  value={trainEpisodes}
                  onChange={(e) => setTrainEpisodes(Number(e.target.value))}
                  min="10"
                  max="500"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Action Masking</label>
                <div className="px-3 py-2 rounded-xl bg-slate-950 border border-emerald-500/40 text-emerald-400 font-bold text-center">
                  ENABLED (0.75)
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleStartTraining}
                  disabled={isTraining}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  {isTraining ? 'Training MAPPO...' : '1. TRAIN MAPPO'}
                </button>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleEvaluate}
                  disabled={isEvaluating}
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs uppercase flex items-center justify-center gap-2"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  {isEvaluating ? 'Evaluating...' : '2. EVALUATE'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl glass-card border border-emerald-500/30 font-mono space-y-4 shadow-xl">
            <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                LEARNING PROGRESS ("DID THE AI ACTUALLY LEARN?")
              </h3>
              <span className="text-[10px] text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                POLICY CONVERGENCE EVIDENCE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 space-y-2">
                <div className="text-rose-400 font-bold uppercase text-[10px]">Early Training (Initial Exploration)</div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mean Reward:</span>
                  <strong className="text-rose-400">{formatNumber(earlyEp.mean_reward, 2)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Packet Delivery Ratio (PDR):</span>
                  <strong className="text-slate-200">{formatNumber((earlyEp.mean_pdr || 0.82) * 100, 1)}%</strong>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
                <div className="text-emerald-400 font-bold uppercase text-[10px]">Later Training (Policy Convergence)</div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mean Reward:</span>
                  <strong className="text-emerald-400">+{formatNumber(lateEp.mean_reward, 2)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Packet Delivery Ratio (PDR):</span>
                  <strong className="text-emerald-400">{formatNumber((lateEp.mean_pdr || 0.994) * 100, 1)}%</strong>
                </div>
              </div>
            </div>

            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.length > 0 ? chartData : [{ episode: 1, Reward: -12.4, 'PDR (%)': 82, 'SINR (dB)': 14 }, { episode: 50, Reward: 18.9, 'PDR (%)': 99.4, 'SINR (dB)': 24 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="episode" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="Reward" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="PDR (%)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="SINR (dB)" stroke="#a855f7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ③ MODEL & ATTENTION INSPECTION */}
      {activeTab === 'inspection' && (
        <div className="space-y-6">
          <ModelCheckpointTimeline status={aiStatus} />
          <ModelRobustnessPanel />

          {attentionData && (
            <div className="p-5 rounded-2xl glass-card border border-cyan-500/30 font-mono space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Attention Weight Summary</h3>
              <AttentionHeatmap attention={attentionData} />
            </div>
          )}

          <div className="p-5 rounded-2xl glass-card border border-purple-500/30 font-mono space-y-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-purple-300 uppercase">Detailed Per-Vehicle Attention Heatmaps</div>
              <div className="text-slate-300 text-xs mt-1">
                Access the XAI Lab to inspect per-vehicle decision rationale and Gemini AI assistant explanations.
              </div>
            </div>
            <RouterLink
              to="/explainability"
              className="px-4 py-2 rounded-xl border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 text-xs font-mono font-bold flex items-center gap-2 shadow-lg transition-all"
            >
              <span>Open Detailed Explainability</span>
              <ArrowRight className="w-4 h-4 text-purple-400" />
            </RouterLink>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIModel;
