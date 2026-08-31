import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlaySquare,
  Radio,
  BrainCircuit,
  HelpCircle,
  Layers,
  ShieldCheck,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/simulation', label: 'V2X Simulation', icon: PlaySquare },
  { path: '/spectrum', label: 'Spectrum & Privacy', icon: Radio },
  { path: '/ai-model', label: 'AI Model (MARL)', icon: BrainCircuit },
  { path: '/explainability', label: 'XAI Explainability', icon: HelpCircle },
  { path: '/results', label: 'Scenarios & Results', icon: Layers },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-cyan-500/10 bg-slate-950/80 backdrop-blur-xl flex flex-col justify-between py-6 px-4 shrink-0 font-mono">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          6G Core Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-xs transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`
              }
            >
              <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Project Status Info Card */}
      <div className="p-4 rounded-2xl glass-card border border-cyan-500/20 text-xs space-y-2 shadow-lg shadow-cyan-950/20">
        <div className="flex items-center gap-1.5 font-bold text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          6G V2X Telemetry Engine
        </div>
        <div className="text-slate-400 text-[11px] leading-relaxed">
          Silk Board Corridor SUMO simulation with CTDE Dual-Critic MARL.
        </div>
        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800 flex justify-between">
          <span>PyTorch DRL</span>
          <span className="text-cyan-400">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
