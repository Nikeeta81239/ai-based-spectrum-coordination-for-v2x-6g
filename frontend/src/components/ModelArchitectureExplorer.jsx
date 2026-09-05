import React, { useState } from 'react';
import { Cpu, Layers, BrainCircuit, ArrowRight, ShieldCheck } from 'lucide-react';

export function ModelArchitectureExplorer() {
  const [selectedNode, setSelectedNode] = useState('attention');

  const nodes = [
    {
      id: 'sumo',
      label: '1. SUMO Mobility',
      desc: 'Real microscopic Eclipse SUMO Silk Board road network vehicle trajectories extracted via Python TraCI.',
    },
    {
      id: 'obs',
      label: '2. Local Observation',
      desc: 'Local vehicle state: velocity, neighbor density, RSSI, and app priority. Exact GPS & VIN kept strictly on-device.',
    },
    {
      id: 'privacy',
      label: '3. Privacy Gateway',
      desc: 'Enforces local boundary: masks sensitive identity/coordinates, shares only coarse regional density and compact beacon.',
    },
    {
      id: 'attention',
      label: '4. 4-Head Attention',
      desc: 'Spatial (neighbors), Temporal (acceleration history), Frequency (spectrum noise), and Application (safety/URLLC).',
    },
    {
      id: 'masking',
      label: '5. Action Masking',
      desc: 'Pre-decision filter: eliminates channels with severe co-channel interference (>0.75) or unavailable resource blocks.',
    },
    {
      id: 'actor',
      label: '6. MAPPO Policy',
      desc: 'Decentralized PPO actor sampling viable subchannels with clipped surrogate objective: min(r_t*A, clip(r_t, 1±eps)*A).',
    },
    {
      id: 'critic',
      label: '7. Local Critic',
      desc: 'Onboard Local Critic estimating V(s, a) with PPO value clipping, guaranteeing decentralized execution without central dependency.',
    },
    {
      id: 'wireless',
      label: '8. 6G Wireless QoS',
      desc: '28 GHz mmWave wireless channel model computing dynamic SINR, Shannon throughput, PDR, and packet latency.',
    },
  ];

  const activeNodeData = nodes.find((n) => n.id === selectedNode) || nodes[2];

  return (
    <div className="p-5 rounded-2xl glass-card border border-purple-500/30 font-mono space-y-4 shadow-xl">
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-purple-400" />
          MODEL ARCHITECTURE EXPLORER (CLICK ANY COMPONENT)
        </h3>
        <span className="text-[10px] text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded-full border border-purple-500/30">
          NEURAL NETWORK PIPELINE
        </span>
      </div>

      {/* Interactive Pipeline Nodes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2 text-center text-xs">
        {nodes.map((node) => {
          const isSelected = node.id === selectedNode;
          return (
            <button
              key={node.id}
              onClick={() => setSelectedNode(node.id)}
              className={`p-2.5 rounded-xl border font-bold transition-all min-h-[75px] flex flex-col justify-between items-center ${
                isSelected
                  ? 'border-purple-400 bg-purple-950/60 text-purple-200 shadow-md shadow-purple-500/20'
                  : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] text-purple-400 uppercase font-bold">Node</div>
              <div className="text-[11px] font-bold leading-tight">{node.label}</div>
            </button>
          );
        })}
      </div>

      {/* Selected Node Details Box */}
      <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-purple-300 font-bold uppercase tracking-wider text-xs flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            Component Inspection: {activeNodeData.label}
          </span>
          <span className="text-[10px] text-slate-400">Click node above to inspect pipeline step</span>
        </div>
        <p className="text-slate-200 leading-relaxed font-sans text-xs">{activeNodeData.desc}</p>
      </div>
    </div>
  );
}

export default ModelArchitectureExplorer;
