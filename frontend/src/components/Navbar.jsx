import React from 'react';
import { Radio } from 'lucide-react';

export function Navbar({ isConnected, status }) {
  return (
    <header className="h-16 border-b border-slate-800 glass-panel px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Radio className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white tracking-wide flex items-center gap-2">
            6G V2X Spectrum Coordinator
            <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              MARL + Attention
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">Privacy-Aware Dynamic Spectrum Coordination</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Status:</span>
          <span className={`px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold border ${
            status === 'running'
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
              : status === 'completed'
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {status}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-red-500'}`} />
          <span className="text-slate-300">{isConnected ? 'WS Connected' : 'WS Disconnected'}</span>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
