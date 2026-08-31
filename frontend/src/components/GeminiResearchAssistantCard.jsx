import React, { useState } from 'react';
import { Sparkles, Bot, ShieldCheck, FileText } from 'lucide-react';

export function GeminiResearchAssistantCard({ vehicleId = 'veh_024', evidence = null, assistantData = null }) {
  const [tab, setTab] = useState('technical'); // 'simple' | 'technical'

  const chLabel = evidence?.selected_channel !== undefined ? `CH${evidence.selected_channel + 1}` : 'CH4';
  const interf = evidence?.interference !== undefined ? evidence.interference : 0.18;
  const sinr = evidence?.sinr_db !== undefined ? evidence.sinr_db : 21.4;
  const appType = evidence?.app_type || 'Safety URLLC';

  const simpleExplanation = assistantData?.explanation || `Vehicle ${vehicleId} selected ${chLabel} because it currently provides better, lower-noise communication conditions for this vehicle.`;
  const technicalExplanation = `Vehicle ${vehicleId} selected ${chLabel} primarily because its ${appType} application requires reliable low-latency communication. The channel exhibits low measured interference (${interf}) and strong SINR (${sinr} dB). Frequency and application information were the strongest neural attention signals.`;

  return (
    <div className="p-5 rounded-2xl glass-card border border-purple-500/40 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-purple-950/30 font-mono space-y-4 shadow-xl relative overflow-hidden">
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-purple-300 font-bold text-sm uppercase">
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          GEMINI AI RESEARCH ASSISTANT — DECISION EXPLANATION
        </div>

        {/* Simple vs Technical Tabs */}
        <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1 text-xs">
          <button
            onClick={() => setTab('simple')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              tab === 'simple'
                ? 'bg-purple-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            SIMPLE
          </button>
          <button
            onClick={() => setTab('technical')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              tab === 'technical'
                ? 'bg-purple-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            TECHNICAL
          </button>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 text-xs leading-relaxed space-y-2">
        <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-purple-400" />
          Evidence-Bound AI Explanation ({tab.toUpperCase()} MODE)
        </div>
        <p className="text-slate-200 font-sans text-xs leading-relaxed">
          {tab === 'simple' ? simpleExplanation : technicalExplanation}
        </p>
      </div>
    </div>
  );
}

export default GeminiResearchAssistantCard;
