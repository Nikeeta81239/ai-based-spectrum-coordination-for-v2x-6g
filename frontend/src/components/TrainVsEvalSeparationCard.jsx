import React from 'react';
import { ArrowRight, Play, CheckCircle, Cpu } from 'lucide-react';

export function TrainVsEvalSeparationCard() {
  return (
    <div className="p-5 rounded-2xl glass-card border border-cyan-500/30 font-mono space-y-4 shadow-xl">
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          TRAINING VS EVALUATION DISCIPLINE
        </h3>
        <span className="text-[10px] text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-500/30">
          RESEARCH METHODOLOGY
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* TRAIN SECTION */}
        <div className="p-4 rounded-xl border border-cyan-500/40 bg-cyan-950/20 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm uppercase">
            <Play className="w-4 h-4 text-cyan-400" /> 1. TRAIN MODEL (OFFLINE LEARNING)
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            SUMO mobility experience → Compute Multi-Objective Rewards → Update Actor/Critic PyTorch weights → Save best checkpoint.
          </p>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-cyan-300 font-bold">
            Goal: Model learns optimal spectrum allocation policies over episodes.
          </div>
        </div>

        {/* EVALUATE SECTION */}
        <div className="p-4 rounded-xl border border-purple-500/40 bg-purple-950/20 space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm uppercase">
            <CheckCircle className="w-4 h-4 text-purple-400" /> 2. EVALUATE MODEL (OFFLINE TESTING)
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Load saved checkpoint → Run test scenarios without gradient updates → Benchmark performance against Random, Greedy & Round-Robin.
          </p>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-purple-300 font-bold">
            Goal: Fair scientific comparison without modifying neural network weights.
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrainVsEvalSeparationCard;
