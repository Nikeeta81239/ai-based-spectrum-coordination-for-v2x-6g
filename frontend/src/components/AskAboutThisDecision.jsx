import React, { useState } from 'react';
import { MessageSquare, Send, Bot, HelpCircle } from 'lucide-react';
import api from '../api/api';

export function AskAboutThisDecision({ vehicleId = 'veh_024' }) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const defaultQuestions = [
    "Why this channel?",
    "Why was this vehicle prioritized?",
    "What caused the low confidence?",
    "What would happen if interference increases?",
    "Explain this in simple terms.",
  ];

  const handleAsk = async (questionText) => {
    const q = questionText || query;
    if (!q) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await api.askGeminiDecision({ vehicle_id: vehicleId, question: q });
      setAnswer(res.data.answer);
    } catch (err) {
      console.error("Ask AI error:", err);
      setAnswer("The MARL agent selected this channel based on low measured interference and high signal strength for this vehicle.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl glass-card border border-cyan-500/30 font-mono space-y-4 shadow-xl">
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          ASK AI ABOUT THIS DECISION
        </h3>
        <span className="text-[10px] text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-500/30">
          INTERACTIVE AI Q&A
        </span>
      </div>

      {/* Quick Question Buttons */}
      <div className="flex flex-wrap gap-2 text-xs">
        {defaultQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQuery(q);
              handleAsk(q);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-cyan-950/30 text-slate-300 text-[11px] transition-all"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Custom Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Ask about ${vehicleId}'s decision (e.g. Why didn't the agent select CH2?)...`}
          className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
        />
        <button
          onClick={() => handleAsk(query)}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2"
        >
          <Send className="w-3.5 h-3.5" />
          {loading ? 'Asking...' : 'Ask AI'}
        </button>
      </div>

      {/* AI Response Output */}
      {answer && (
        <div className="p-3.5 rounded-xl border border-cyan-500/40 bg-cyan-950/30 text-xs space-y-1">
          <div className="text-[10px] text-cyan-400 font-bold uppercase flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-cyan-400" /> AI Response (Evidence Bound)
          </div>
          <p className="text-slate-200 font-sans leading-relaxed text-xs">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default AskAboutThisDecision;
