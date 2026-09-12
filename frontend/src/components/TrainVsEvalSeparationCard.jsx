import React from 'react';
import { Play, CheckCircle, Cpu } from 'lucide-react';

export function TrainVsEvalSeparationCard() {
  return (
    <div className="p-4 rounded-2xl glass-card border border-cyan-500/30 font-mono space-y-4 shadow-xl">
      {/* Title */}
      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
        <Cpu className="w-4 h-4 text-cyan-400" />
        Training vs Evaluation
      </h3>

      {/* Three Simple Educational Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* Episode */}
        <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 space-y-1.5">
          <div className="text-cyan-400 font-bold text-xs uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Episode
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
            One complete SUMO simulation run used for training.
          </p>
        </div>

        {/* Training */}
        <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-950/20 space-y-1.5">
          <div className="text-blue-400 font-bold text-xs uppercase flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 fill-blue-400 text-blue-400" /> Training
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
            The AI learns better channel allocation decisions from the rewards it receives.
          </p>
        </div>

        {/* Evaluation */}
        <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-1.5">
          <div className="text-purple-400 font-bold text-xs uppercase flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-purple-400" /> Evaluation
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
            The trained AI is tested without updating its weights and compared against Random, Greedy and Round-Robin.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TrainVsEvalSeparationCard;
