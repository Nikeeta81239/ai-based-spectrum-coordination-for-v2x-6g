import React, { useState } from 'react';
import { Cpu, Layers, BrainCircuit, ArrowRight, ShieldCheck } from 'lucide-react';

export function ModelArchitectureExplorer() {
  const [selectedNode, setSelectedNode] = useState('attention');

  const nodes = [
    {
      id: 'sumo',
      label: 'SUMO Mobility',
      desc: 'Silk Board Bengaluru road network vehicle trajectories (speed, position, heading).',
    },
    {
      id: 'obs',
      label: 'Vehicle Observation',
      desc: 'Local observations: RSSI, channel noise floor, neighbor density, app type (URLLC vs eMBB).',
    },
    {
      id: 'attention',
      label: 'Multi-Head Attention',
      desc: '4 Heads: Spatial (neighbors), Temporal (velocity), Application (priority), Frequency (noise).',
    },
    {
      id: 'actor',
      label: 'Actor Network',
      desc: 'PyTorch Multi-Agent Actor mapping fused 64-dim embeddings to discrete subchannel & power actions.',
    },
    {
      id: 'action',
      label: 'Channel Selection',
      desc: 'Selected subchannel (Ch 1–6) and transmit power (dBm) per vehicle agent.',
    },
    {
      id: 'env',
      label: 'Environment',
      desc: '28 GHz mmWave wireless channel simulator updating SINR, PDR, and inter-vehicle interference.',
    },
    {
      id: 'reward',
      label: 'Reward Function',
      desc: 'Multi-objective reward: +SINR - Interference - Latency Penalties + Priority Boost.',
    },
    {
      id: 'critic',
      label: 'Local Critic',
      desc: 'CTDE Dual-Critic: Global Critic for offline joint state training, Local Critic for online local inference.',
    },
    {
      id: 'update',
      label: 'Model Update',
      desc: 'Adam optimizer gradient updates (Actor LR 1e-4, Critic LR 1e-3) saving checkpoints to /models/best/.',
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
