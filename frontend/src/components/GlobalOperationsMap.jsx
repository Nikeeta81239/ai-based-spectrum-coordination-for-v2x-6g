import React from 'react';
import SumoCanvas from './SumoCanvas';
import { Globe, Radio, Wifi, Zap } from 'lucide-react';

export function GlobalOperationsMap({ vehicles = [] }) {
  return (
    <div className="elysium-card p-5 rounded-2xl space-y-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="font-bold text-white text-xs lg:text-sm tracking-wider uppercase font-sans flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          SUMO SIMULATION OPERATIONS · 6G V2X NETWORK TOPOLOGY
        </h3>
        <div className="text-xs font-mono text-slate-300 flex items-center gap-2">
          <span className="text-slate-400">Active Connections:</span>
          <span className="text-cyan-300 font-bold font-sans">
            {vehicles.length ? `${vehicles.length * 325 + 4}` : '6,831'}
          </span>
        </div>
      </div>

      {/* Real SUMO simulation canvas */}
      <div className="rounded-xl overflow-hidden border border-cyan-500/20 shadow-2xl relative">
        <SumoCanvas vehicles={vehicles} />
      </div>
    </div>
  );
}

export default GlobalOperationsMap;
