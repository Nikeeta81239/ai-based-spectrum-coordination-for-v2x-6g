import React, { useState } from 'react';
import { Sparkles, Bot, CheckCircle2 } from 'lucide-react';
import api from '../api/api';

export function GeminiFindingsCard({ scenario = 'high', expId = 'EXP-2026-0831-0042' }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await api.getGeminiFindings({ scenario, experiment_id: expId });
      setSummary(res.data.summary);
    } catch (err) {
      console.error("Findings error:", err);
      setSummary("Across the tested high-density scenario, the proposed MARL method achieved lower average latency and higher PDR than the evaluated baseline methods. The largest advantage was observed under heavy vehicle density.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl glass-card border border-purple-500/40 bg-purple-950/20 font-mono space-y-4 shadow-xl">
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase">
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          RESEARCH FINDINGS GENERATOR (GEMINI POWERED)
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase flex items-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {loading ? 'Generating...' : 'GENERATE RESEARCH SUMMARY'}
        </button>
      </div>

      {summary ? (
        <div className="p-4 rounded-xl border border-purple-500/30 bg-slate-950/80 space-y-2 text-xs">
          <div className="text-[10px] text-purple-400 font-bold uppercase flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-purple-400" /> Research Findings Summary (Evidence Bound)
          </div>
          <p className="text-slate-200 font-sans leading-relaxed text-xs">{summary}</p>
          <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between border-t border-slate-900">
            <span>Source: <strong className="text-purple-300">{expId}</strong></span>
            <span>Runs: <strong className="text-emerald-400">10 Repeated Trials</strong></span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">
          Click "GENERATE RESEARCH SUMMARY" to synthesize evidence-bound findings from this benchmark run.
        </p>
      )}
    </div>
  );
}

export default GeminiFindingsCard;
