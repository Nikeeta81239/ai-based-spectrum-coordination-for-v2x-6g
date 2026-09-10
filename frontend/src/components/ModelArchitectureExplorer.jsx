import React, { useState } from 'react';
import { Layers, BrainCircuit, ShieldCheck, Cpu, Radio, Network, Binary, Zap } from 'lucide-react';

export function ModelArchitectureExplorer() {
  const [selectedNode, setSelectedNode] = useState('attention');

  const nodes = [
    {
      id: 'sumo',
      icon: Network,
      label: '1. SUMO Mobility',
      category: 'Environment',
      role: 'Microscopic Traffic Simulation',
      input: 'Bengaluru Silk Board Road Graph (XML)',
      output: 'Vehicle Coordinates (x, y), Velocity, Heading, Lane ID',
      math: 'x_{t+1} = x_t + v_t \\Delta t + \\frac{1}{2} a_t \\Delta t^2',
      desc: 'Microscopic Eclipse SUMO traffic engine executing realistic vehicle dynamics across the Silk Board junction. Telemetry streams via Python TraCI at 1 Hz resolution.',
    },
    {
      id: 'obs',
      icon: Cpu,
      label: '2. Local Observation',
      category: 'Perception',
      role: 'Decentralized Onboard State',
      input: 'TraCI Telemetry + Local Radio Sensors',
      output: 'o_i \\in \\mathbb{R}^{24} (Normalized Vector)',
      math: 'o_i = [v_i, \\rho_{local}, \\text{RSSI}_{ch}, \\text{QoS}_{app}, \\Delta v_{nb}]',
      desc: 'Constructs the 24-dimensional decentralized observation vector. Crucially, raw GPS coordinates and vehicle identifiers (VIN) are strictly contained inside the vehicle boundary.',
    },
    {
      id: 'privacy',
      icon: ShieldCheck,
      label: '3. Privacy Gateway',
      category: 'Privacy Boundary',
      role: 'Zero-Knowledge Feature Masking',
      input: 'Raw Coordinates (x, y) & VIN',
      output: 'Masked Density Estimate & Truncated Beacons',
      math: '\\mathcal{P}(o_i) = \\{o_i \\setminus (\\text{GPS}, \\text{VIN})\\} \\cup \\{k\\text{-anonymized cell}\\}',
      desc: 'Enforces the local privacy perimeter: masks exact trajectory coordinates and unique identities. Emits only low-frequency coarse spatial density beacons, keeping 98.4% of sensitive mobility telemetry local.',
    },
    {
      id: 'attention',
      icon: BrainCircuit,
      label: '4. 4-Head Attention',
      category: 'Deep Feature Fusion',
      role: 'PyTorch MultiStreamAttention',
      input: 'o_i \\in \\mathbb{R}^{24} projected to d=128',
      output: 'Context Embedding h_i \\in \\mathbb{R}^{128}',
      math: '\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V',
      desc: 'Decomposes vehicle state across 4 parallel attention heads: Spatial (neighbor density), Temporal (speed derivative), Application (URLLC safety vs best-effort), and Frequency (mmWave channel contention).',
    },
    {
      id: 'masking',
      icon: Zap,
      label: '5. Action Masking',
      category: 'Safety Guarantee',
      role: 'Deterministic Channel Filter',
      input: 'Action Logits \\in \\mathbb{R}^{10}, Channel Interferences \\in \\mathbb{R}^{10}',
      output: 'Masked Logits M_i \\in \\mathbb{R}^{10} (Masked Channels = -\\infty)',
      math: 'M_k = \\begin{cases} L_k & \\text{if } I_k \\le 0.75 \\text{ and channel available} \\\\ -\\infty & \\text{if } I_k > 0.75 \\text{ (Congested)} \\end{cases}',
      desc: 'Guarantees 0% collision with severely congested channels by dynamically masking any subchannel exceeding 0.75 interference before policy distribution sampling.',
    },
    {
      id: 'actor',
      icon: Layers,
      label: '6. MAPPO Actor',
      category: 'Policy Network',
      role: 'Decentralized Actor Execution',
      input: 'Fused Attention Embedding h_i \\in \\mathbb{R}^{128}',
      output: 'Channel Action Probability \\pi_{\\theta}(a_i | o_i)',
      math: 'L^{CLIP}(\\theta) = \\hat{\\mathbb{E}}_t \\left[ \\min(r_t(\\theta)\\hat{A}_t, \\text{clip}(r_t(\\theta), 1-\\epsilon, 1+\\epsilon)\\hat{A}_t) \\right]',
      desc: 'Decentralized PPO Actor sampling subchannel allocation over mmWave spectrum bands. Executes onboard in <2.5 ms per vehicle without requiring communication with a central orchestrator.',
    },
    {
      id: 'critic',
      icon: Binary,
      label: '7. Centralized Critic (CTDE)',
      category: 'Value Estimation',
      role: 'Centralized Training, Decentralized Execution',
      input: 'Joint State s = (o_1, o_2, \\dots, o_N) \\in \\mathbb{R}^{N \\times 24}',
      output: 'State-Value Baseline V_{\\phi}(s) \\in \\mathbb{R}^1',
      math: 'L(\\phi) = \\frac{1}{2} \\left( V_{\\phi}(s_t) - \\hat{R}_t \\right)^2',
      desc: 'Centralized Critic network used exclusively during offline training. Evaluates multi-agent joint states to compute Generalized Advantage Estimations (GAE), completely eliminated during online inference.',
    },
    {
      id: 'wireless',
      icon: Radio,
      label: '8. 6G mmWave PHY',
      category: 'Physical Layer',
      role: '3GPP 28 GHz mmWave Model',
      input: 'Allocated Channel Index & Vehicle Coordinates',
      output: 'SINR (dB), Throughput (Mbps), PDR (%), Latency (ms)',
      math: '\\text{SINR}_i = \\frac{P_i g_{ii}}{\\sigma^2 + \\sum_{j \\neq i, c_j = c_i} P_j g_{ji}}, \\quad C = B \\log_2(1 + \\text{SINR})',
      desc: 'Simulates high-fidelity 6G mmWave wireless propagation at 28 GHz: computes distance-dependent path loss, Rayleigh fast fading, co-channel interference, Shannon throughput, and sub-5ms URLLC latency.',
    },
  ];

  const activeNodeData = nodes.find((n) => n.id === selectedNode) || nodes[3];
  const IconComponent = activeNodeData.icon;

  return (
    <div className="p-5 rounded-2xl glass-card border border-purple-500/30 font-mono space-y-4 shadow-xl">
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-purple-400" />
          MODEL ARCHITECTURE EXPLORER (CLICK ANY PIPELINE STEP)
        </h3>
        <span className="text-[10px] text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded-full border border-purple-500/30">
          8-STAGE NEURAL PIPELINE
        </span>
      </div>

      {/* Interactive Pipeline Nodes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
        {nodes.map((node) => {
          const isSelected = node.id === selectedNode;
          const NodeIcon = node.icon;
          return (
            <button
              key={node.id}
              onClick={() => setSelectedNode(node.id)}
              className={`p-2.5 rounded-xl border font-bold transition-all min-h-[85px] flex flex-col justify-between items-center ${
                isSelected
                  ? 'border-purple-400 bg-purple-950/70 text-purple-200 ring-1 ring-purple-400/50 shadow-lg shadow-purple-500/20'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[9px] text-purple-400 uppercase font-bold">{node.category}</span>
                <NodeIcon className="w-3.5 h-3.5 text-purple-400/80" />
              </div>
              <div className="text-[11px] font-bold leading-tight my-1">{node.label}</div>
              <div className="text-[9px] text-slate-500 truncate w-full">
                {isSelected ? '● Active' : 'Inspect'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Node Details Box */}
      <div className="p-4 rounded-xl border border-purple-500/40 bg-purple-950/20 space-y-3 text-xs">
        <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800/80 pb-2.5">
          <span className="text-purple-300 font-bold uppercase tracking-wider text-xs flex items-center gap-2">
            <IconComponent className="w-4 h-4 text-purple-400" />
            Stage {activeNodeData.label} — {activeNodeData.role}
          </span>
          <span className="text-[10px] text-purple-400 bg-purple-950/70 px-2.5 py-0.5 rounded border border-purple-500/30">
            {activeNodeData.category}
          </span>
        </div>

        <p className="text-slate-200 leading-relaxed font-sans text-xs">
          {activeNodeData.desc}
        </p>

        {/* Technical specs grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px]">
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-500 block text-[10px] font-bold uppercase">Input Tensor / Data</span>
            <span className="text-cyan-300 font-mono text-[11px] font-semibold">{activeNodeData.input}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-500 block text-[10px] font-bold uppercase">Output Tensor / Features</span>
            <span className="text-purple-300 font-mono text-[11px] font-semibold">{activeNodeData.output}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-500 block text-[10px] font-bold uppercase">Mathematical Formulation</span>
            <span className="text-emerald-300 font-mono text-[11px] font-semibold truncate block">
              {activeNodeData.math}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelArchitectureExplorer;
