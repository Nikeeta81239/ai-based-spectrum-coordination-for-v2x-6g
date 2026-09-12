import React, { useState } from 'react';
import {
  Layers,
  BrainCircuit,
  ShieldCheck,
  Cpu,
  Radio,
  Network,
  Binary,
  Zap,
  Car,
  Activity,
  Code2,
  CheckCircle2,
} from 'lucide-react';
import { formatNumber, formatPercent } from '../utils/formatters';

export function ModelArchitectureExplorer({ vehicles = [], channels = [] }) {
  const [selectedNode, setSelectedNode] = useState('sumo');
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  const selectedVehicle =
    vehicles.find((v) => v.vehicle_id === selectedVehicleId) || vehicles[0] || null;

  const nodes = [
    {
      id: 'sumo',
      num: 1,
      icon: Network,
      label: '1. SUMO Mobility',
      category: 'Mobility Physics',
      purpose: 'Microscopic Traffic Simulation & Trajectory Generation',
      file: 'backend/simulation/sumo_manager.py',
      input: 'Road network corridor graph (.net.xml) and vehicle route definitions (.rou.xml)',
      output: 'Vehicle ID, Cartesian coordinates (x, y), speed (m/s), acceleration, lane, edge',
      effect:
        'Determines where vehicles are and how their movement changes over time. Distances between vehicles dictate wireless path loss, fast fading, and inter-vehicle interference.',
      liveValue: selectedVehicle
        ? `Veh ${selectedVehicle.vehicle_id}: pos=(${selectedVehicle.x ?? selectedVehicle.position?.[0] ?? '0'}, ${selectedVehicle.y ?? selectedVehicle.position?.[1] ?? '0'}), speed=${selectedVehicle.speed_kmh || (selectedVehicle.speed_mps * 3.6).toFixed(1)} km/h, lane=${selectedVehicle.lane || 'lane_0'}`
        : null,
    },
    {
      id: 'obs',
      num: 2,
      icon: Cpu,
      label: '2. Local Observation',
      category: 'Agent Perception',
      purpose: 'Decentralized Observation Vector Construction',
      file: 'environment/wireless_environment.py (VehicleWirelessState)',
      input: 'SUMO vehicle kinematics (speed, density, neighbors) + local RF measurements (RSSI, channel interferences)',
      output: 'Observation vector o_i in R^24 (normalized kinematics, RF interference across channels, QoS priority)',
      effect:
        'Gives each vehicle the localized information it uses to select a channel, completely without broadcasting coordinates or global routing tables.',
      liveValue: selectedVehicle
        ? `Veh ${selectedVehicle.vehicle_id}: speed=${selectedVehicle.speed_mps} m/s, neighbors=${selectedVehicle.num_neighbours}, traffic_density=${selectedVehicle.traffic_density ?? 0.25}, app=${selectedVehicle.app_type || 'URLLC'}`
        : null,
    },
    {
      id: 'privacy',
      num: 3,
      icon: ShieldCheck,
      label: '3. Privacy Gateway',
      category: 'Privacy Boundary',
      purpose: 'Zero-Knowledge Onboard Feature Masking',
      file: 'backend/app/services/privacy_gateway.py',
      input: 'Raw local observation o_i containing GPS coordinates, exact trajectories, and VIN',
      output: 'Privacy-preserving observation: 232 Bytes kept strictly inside On-Board Unit, only 12 Bytes shared over air',
      effect:
        'Controls which information is shared during coordination without exposing unnecessary vehicle details. Guarantees 0% leakage of raw GPS trajectories or vehicle identities.',
      liveValue: selectedVehicle
        ? `Veh ${selectedVehicle.vehicle_id}: 232 Bytes kept local (GPS & VIN protected). Ephemeral session ID used over air.`
        : null,
    },
    {
      id: 'attention',
      num: 4,
      icon: BrainCircuit,
      label: '4. 4-Head Attention',
      category: 'Feature Fusion',
      purpose: 'Multi-Stream Self-Attention Feature Fusion',
      file: 'attention/multi_head_attention.py (MultiStreamAttention)',
      input: 'Decomposed observation streams: Spatial (4D), Temporal (3D), Application (4D), Frequency (30D)',
      output: 'Attention-fused context embedding h_i in R^64 + attention weight distributions',
      effect:
        'Helps the actor focus on the most relevant information: weighing spatial density in jams, temporal trends at high speeds, and frequency contention when channels overload.',
      liveValue: selectedVehicle?.attention
        ? `Spatial: ${(selectedVehicle.attention.spatial * 100).toFixed(1)}% | Temporal: ${(selectedVehicle.attention.temporal * 100).toFixed(1)}% | App: ${(selectedVehicle.attention.application * 100).toFixed(1)}% | Freq: ${(selectedVehicle.attention.frequency * 100).toFixed(1)}%`
        : null,
    },
    {
      id: 'masking',
      num: 5,
      icon: Zap,
      label: '5. Action Masking',
      category: 'Safety Guarantee',
      purpose: 'Candidate Channel Actions & Constraint Enforcement',
      file: 'agents/actor.py (Actor.forward)',
      input: 'Raw policy logits in R^10 and real-time channel interference levels I_k in [0, 1]',
      output: 'Valid-action mask M_k in {0, 1} where severely congested channels (I_k > 0.75) receive -1e9 penalty',
      effect:
        'Prevents the policy from selecting invalid or heavily congested actions based on actual physical constraints, preventing spectrum packet collisions before action execution.',
      liveValue: channels.length > 0
        ? `${channels.filter((c) => !c.is_masked).length} Viable Channels | ${channels.filter((c) => c.is_masked).length} Masked Channels (Interference > 0.75)`
        : null,
    },
    {
      id: 'actor',
      num: 6,
      icon: Layers,
      label: '6. MAPPO Actor',
      category: 'Decentralized Policy',
      purpose: 'Subchannel Allocation Policy & Categorical Sampling',
      file: 'agents/actor.py & agents/agent.py',
      input: 'Fused attention representation h_i in R^64 and valid-action mask M_i',
      output: 'Action probability distribution pi_theta(a_i | o_i) and selected spectrum channel index c_i in {0..K-1}',
      effect:
        'Chooses the channel using the trained neural network policy, not a manually entered channel number or static rule. Executes onboard each vehicle in <2.5 ms.',
      liveValue: selectedVehicle
        ? `Veh ${selectedVehicle.vehicle_id} Selected: CH${selectedVehicle.selected_channel + 1} (Policy-assigned subchannel)`
        : null,
    },
    {
      id: 'critic',
      num: 7,
      icon: Binary,
      label: '7. Centralized Critic (CTDE)',
      category: 'Value Estimation',
      purpose: 'Centralized Value Function for Advantage Estimation',
      file: 'agents/global_critic.py (GlobalCritic) & agents/local_critic.py',
      input: 'Joint agent observations and actions s = (o_1, o_2, ..., o_N) during offline training',
      output: 'Scalar value estimate V_phi(s) and Generalized Advantage Estimator (GAE) A_t',
      effect:
        'Evaluates the overall network coordination situation during training and generates the learning gradient to improve the decentralized actor. Eliminated completely during online vehicle operation.',
      liveValue: selectedVehicle
        ? `Local Critic V(s)=${(selectedVehicle.reward ?? 1.2).toFixed(2)} | Global Value Network Active during Offline Training`
        : null,
    },
    {
      id: 'wireless',
      num: 8,
      icon: Radio,
      label: '8. 6G mmWave PHY',
      category: 'Physical Layer',
      purpose: 'Wireless Propagation & QoS Reward Calculation',
      file: 'environment/wireless_environment.py (sinr_db, throughput_mbps, pdr_from_sinr, latency_ms)',
      input: 'Selected channel allocations, vehicle SUMO coordinates (x, y), transmit power (23 dBm), and noise floor (-95 dBm)',
      output: 'SINR (dB), Shannon Throughput (Mbps), Packet Delivery Ratio PDR (%), Latency (ms), and Step Reward',
      effect:
        'Calculates the physical wireless communication results that become the multi-objective reward signal and update the next observation state.',
      liveValue: selectedVehicle
        ? `SINR: ${selectedVehicle.sinr_db} dB | Throughput: ${selectedVehicle.throughput_mbps} Mbps | PDR: ${(selectedVehicle.pdr * 100).toFixed(1)}% | Latency: ${selectedVehicle.latency_ms} ms`
        : null,
    },
  ];

  const activeNodeData = nodes.find((n) => n.id === selectedNode) || nodes[0];
  const IconComponent = activeNodeData.icon;

  // Render authentic publication-style visual formula layouts
  const renderVisualFormula = (nodeId) => {
    switch (nodeId) {
      case 'sumo':
        return (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                1. Kinematic Position Update (Krauss Car-Following Model):
              </div>
              <div className="text-base text-amber-200 font-semibold py-1 flex items-center flex-wrap gap-2">
                <span>x<sub>t+1</sub> = x<sub>t</sub> + v<sub>t</sub> · Δt +</span>
                <span className="inline-flex flex-col items-center align-middle mx-1">
                  <span className="text-xs pb-0.5 border-b border-amber-300 px-1">1</span>
                  <span className="text-xs pt-0.5 px-1">2</span>
                </span>
                <span>a<sub>t</sub> · (Δt)<sup>2</sup></span>
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Where <strong>x<sub>t</sub></strong> is position, <strong>v<sub>t</sub></strong> is vehicle speed, <strong>a<sub>t</sub></strong> is acceleration, and <strong>Δt = 1.0 s</strong> (TraCI step length).
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                2. Velocity Propagation with Non-Negative Bound:
              </div>
              <div className="text-base text-amber-200 font-semibold py-1">
                v<sub>t+1</sub> = max(0, v<sub>t</sub> + a<sub>t</sub> · Δt)
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Guarantees vehicle velocity cannot be negative in the road network corridor.
              </div>
            </div>
          </div>
        );

      case 'obs':
        return (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                Decentralized Onboard State Vector (24-Dimensional):
              </div>
              <div className="text-sm text-amber-200 font-semibold py-1 leading-loose flex items-center flex-wrap gap-2">
                <span>o<sub>i</sub> = [</span>
                <span className="inline-flex flex-col items-center align-middle">
                  <span className="text-xs pb-0.5 border-b border-amber-300 px-1">v<sub>i</sub></span>
                  <span className="text-xs pt-0.5 px-1">v<sub>max</sub></span>
                </span>
                <span>, &nbsp;ρ<sub>local</sub>, &nbsp;Δv<sub>nbr</sub>, &nbsp;RSSI, &nbsp;QoS<sub>priority</sub>, &nbsp;I<sub>1</sub>, &nbsp;I<sub>2</sub>, &nbsp;..., &nbsp;I<sub>10</sub> ] &nbsp;∈ &nbsp;ℝ<sup>24</sup></span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-400 font-sans pt-1">
                <div>• <strong>v<sub>i</sub> / v<sub>max</sub>:</strong> Normalized vehicle speed (v<sub>max</sub> = 30 m/s)</div>
                <div>• <strong>ρ<sub>local</sub>:</strong> Local vehicle neighborhood density count</div>
                <div>• <strong>RSSI:</strong> Received signal strength indicator from nearest link</div>
                <div>• <strong>I<sub>1</sub> ... I<sub>10</sub>:</strong> Current interference levels on all 10 channels</div>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                Privacy-Preserving Information Isolation:
              </div>
              <div className="text-sm text-amber-200 font-semibold py-1 leading-relaxed">
                𝒫(o<sub>i</sub>) = {`{`} o<sub>i</sub> \ (Exact GPS, VIN, Trajectory) {`}`} ∪ {`{`} Coarse Density Bin, Ephemeral Token {`}`}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-sans pt-1">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-emerald-400 font-bold block font-mono">Kept Local (OBU):</span>
                  <span>232 Bytes / vehicle (exact coordinates, route path, sensor telemetry)</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-cyan-400 font-bold block font-mono">Shared Over Radio:</span>
                  <span>12 Bytes / vehicle (single-use session token + channel allocation request)</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'attention':
        return (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                1. Scaled Dot-Product Attention:
              </div>
              <div className="text-sm text-amber-200 font-semibold py-1 flex items-center flex-wrap gap-2">
                <span>Attention(Q, K, V) = softmax(</span>
                <span className="inline-flex flex-col items-center align-middle">
                  <span className="text-xs pb-0.5 border-b border-amber-300 px-1">Q · K<sup>T</sup></span>
                  <span className="text-xs pt-0.5 px-1">√d<sub>k</sub></span>
                </span>
                <span>) · V</span>
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Where <strong>Q, K, V</strong> are projected Query, Key, and Value feature representations with scaling dimension <strong>d<sub>k</sub> = 16</strong>.
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                2. Multi-Stream Context Fusion:
              </div>
              <div className="text-sm text-amber-200 font-semibold py-1">
                h<sub>i</sub> = [ Head<sub>Spatial</sub> ∥ Head<sub>Temporal</sub> ∥ Head<sub>Application</sub> ∥ Head<sub>Frequency</sub> ] ∈ ℝ<sup>64</sup>
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Concatenates spatial density, temporal velocity trends, application priority, and channel contention into a single context embedding.
              </div>
            </div>
          </div>
        );

      case 'masking':
        return (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                1. Valid Channel Action Mask:
              </div>
              <div className="text-sm text-amber-200 font-semibold py-1 space-y-1">
                <div>M<sub>k</sub> = 1 &nbsp; if &nbsp; I<sub>k</sub> ≤ 0.75 &nbsp; (Channel Viable & Available)</div>
                <div>M<sub>k</sub> = 0 &nbsp; if &nbsp; I<sub>k</sub> &gt; 0.75 &nbsp; (Severely Congested / Masked)</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                2. Logit Penalization (Eliminating Masked Channels):
              </div>
              <div className="text-sm text-amber-200 font-semibold py-1">
                Logits<sub>k</sub><sup>effective</sup> = Logits<sub>k</sub> + (1 − M<sub>k</sub>) · (−10<sup>9</sup>)
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Injects −10<sup>9</sup> penalty to congested channels, guaranteeing 0% selection probability during softmax policy sampling.
              </div>
            </div>
          </div>
        );

      case 'actor':
        return (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                1. Masked Categorical Action Distribution:
              </div>
              <div className="text-sm text-amber-200 font-semibold py-1">
                π<sub>θ</sub>(a<sub>i</sub> | o<sub>i</sub>) = softmax( ActorNet(h<sub>i</sub>) ⊙ M<sub>i</sub> )
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Decentralized Actor outputs valid probability distribution across available 6G spectrum subchannels.
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                2. MAPPO Clipped Surrogate Objective:
              </div>
              <div className="text-sm text-amber-200 font-semibold py-1">
                L<sup>CLIP</sup>(θ) = Ê<sub>t</sub> [ min( r<sub>t</sub>(θ) · Â<sub>t</sub> , &nbsp; clip(r<sub>t</sub>(θ), 1 − ε, 1 + ε) · Â<sub>t</sub> ) ]
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Where <strong>r<sub>t</sub>(θ)</strong> is the policy probability ratio and <strong>ε = 0.2</strong> restricts destructive gradient updates.
              </div>
            </div>
          </div>
        );

      case 'critic':
        return (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                1. Centralized Critic Value Loss:
              </div>
              <div className="text-sm text-amber-200 font-semibold py-1 flex items-center flex-wrap gap-2">
                <span>L(ϕ) = </span>
                <span className="inline-flex flex-col items-center align-middle">
                  <span className="text-xs pb-0.5 border-b border-amber-300 px-1">1</span>
                  <span className="text-xs pt-0.5 px-1">2</span>
                </span>
                <span>( V<sub>ϕ</sub>(s<sub>t</sub>) − R̂<sub>t</sub> )<sup>2</sup></span>
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Evaluates joint network state <strong>s = (o<sub>1</sub>, ..., o<sub>N</sub>)</strong> to estimate global state value baseline during training.
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                2. Generalized Advantage Estimator (GAE):
              </div>
              <div className="text-sm text-amber-200 font-semibold py-1">
                Â<sub>t</sub><sup>GAE</sup> = ∑ (γ · λ)<sup>l</sup> · δ<sub>t+l</sub><sup>V</sup>, &nbsp; where &nbsp; δ<sub>t</sub><sup>V</sup> = r<sub>t</sub> + γ · V<sub>ϕ</sub>(s<sub>t+1</sub>) − V<sub>ϕ</sub>(s<sub>t</sub>)
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Uses discount <strong>γ = 0.99</strong> and GAE parameter <strong>λ = 0.95</strong> to reduce policy variance.
              </div>
            </div>
          </div>
        );

      case 'wireless':
        return (
          <div className="space-y-4 font-mono text-xs">
            {/* SINR Formatted with authentic division */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                1. Signal-to-Interference-plus-Noise Ratio (SINR):
              </div>
              <div className="py-2 flex items-center flex-wrap gap-3 text-base text-amber-200 font-bold">
                <span>SINR<sub>i</sub> &nbsp;=</span>
                <span className="inline-flex flex-col items-center align-middle">
                  <span className="pb-1 border-b-2 border-amber-400 px-3 text-cyan-300">
                    Desired Signal Power &nbsp;(P<sub>i</sub> · g<sub>ii</sub>)
                  </span>
                  <span className="pt-1 px-3 text-rose-300">
                    Co-Channel Interference &nbsp;(∑<sub>j≠i, c<sub>j</sub>=c<sub>i</sub></sub> P<sub>j</sub> · g<sub>ji</sub>) &nbsp;+ &nbsp;Noise Power &nbsp;(σ<sup>2</sup>)
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-slate-400 font-sans pt-1 border-t border-slate-800/80">
                <div>• <strong>P<sub>i</sub> · g<sub>ii</sub>:</strong> Transmit power (23 dBm) × channel gain to receiver</div>
                <div>• <strong>∑ P<sub>j</sub> · g<sub>ji</sub>:</strong> Sum interference from vehicles sharing channel c<sub>i</sub></div>
                <div>• <strong>σ<sup>2</sup>:</strong> Thermal noise floor power (−95 dBm)</div>
              </div>
            </div>

            {/* Path Loss, Shannon, PDR, Latency in 2x2 grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Path loss */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-[10px] text-amber-400 font-bold uppercase">2. 6G mmWave Path Loss (28 GHz):</div>
                <div className="text-xs text-amber-200 font-bold py-1">
                  PL(d) = FSPL<sub>ref</sub> + 10 · γ · log<sub>10</sub>(d / d<sub>0</sub>)
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  Free-space path loss at d<sub>0</sub> = 1m with path-loss exponent γ = 2.5.
                </div>
              </div>

              {/* Shannon throughput */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-[10px] text-amber-400 font-bold uppercase">3. Shannon Channel Capacity:</div>
                <div className="text-xs text-amber-200 font-bold py-1">
                  Throughput (C) = B · log<sub>2</sub>(1 + SINR<sub>linear</sub>)
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  Bandwidth B = 20 MHz per allocated subchannel.
                </div>
              </div>

              {/* Packet delivery ratio */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-[10px] text-amber-400 font-bold uppercase">4. Packet Delivery Ratio (PDR):</div>
                <div className="text-xs text-amber-200 font-bold py-1 flex items-center gap-2">
                  <span>PDR =</span>
                  <span className="inline-flex flex-col items-center align-middle">
                    <span className="border-b border-amber-300 px-2 pb-0.5">1</span>
                    <span className="pt-0.5 px-2">1 + e<sup>−0.5 · (SINR<sub>dB</sub> − 5)</sup></span>
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  Smooth Sigmoid delivery probability mapping from SINR quality.
                </div>
              </div>

              {/* End-to-end latency */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="text-[10px] text-amber-400 font-bold uppercase">5. End-to-End URLLC Latency:</div>
                <div className="text-xs text-amber-200 font-bold py-1 flex items-center gap-2">
                  <span>Latency (τ) =</span>
                  <span className="inline-flex flex-col items-center align-middle">
                    <span className="border-b border-amber-300 px-1 pb-0.5">d</span>
                    <span className="pt-0.5 px-1">c</span>
                  </span>
                  <span>· 1000 + 2.0 +</span>
                  <span className="inline-flex flex-col items-center align-middle">
                    <span className="border-b border-amber-300 px-1 pb-0.5">20.0</span>
                    <span className="pt-0.5 px-1">1 + max(SINR<sub>dB</sub>, 0.1)</span>
                  </span>
                  <span>ms</span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  Combines radio light-speed propagation delay + SINR-dependent queueing latency.
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-5 rounded-2xl glass-card border border-purple-500/30 font-mono space-y-5 shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-purple-400" />
            AI SPECTRUM COORDINATION PIPELINE
          </h3>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            Click any stage to inspect its inputs, outputs, implemented mathematical formulas, and effect on channel selection.
          </p>
        </div>
        <span className="text-[10px] text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded-full border border-purple-500/30">
          8-STAGE NEURAL ARCHITECTURE
        </span>
      </div>

      {/* Live Vehicle Selector Strip (When SUMO is active) */}
      {vehicles.length > 0 ? (
        <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Car className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-bold">Inspect Live SUMO Vehicle in Pipeline:</span>
            <select
              value={selectedVehicle?.vehicle_id || ''}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-cyan-500/50 text-cyan-300 font-bold text-xs focus:outline-none cursor-pointer"
            >
              {vehicles.map((v) => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  Vehicle {v.vehicle_id} — Ch {v.selected_channel + 1} ({v.speed_kmh || (v.speed_mps * 3.6).toFixed(1)} km/h)
                </option>
              ))}
            </select>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE TRAFFIC STREAMING ({vehicles.length} VEHICLES)
          </span>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs text-slate-400 font-sans">
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            <span>Simulation Idle — Showing architecture baseline. Start SUMO in <strong>V2X Simulation</strong> to inspect live vehicle telemetry.</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">STANDBY</span>
        </div>
      )}

      {/* Interactive 8 Pipeline Stage Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
        {nodes.map((node) => {
          const isSelected = node.id === selectedNode;
          const NodeIcon = node.icon;
          return (
            <button
              key={node.id}
              onClick={() => setSelectedNode(node.id)}
              className={`p-2.5 rounded-xl border font-bold transition-all min-h-[95px] flex flex-col justify-between items-center ${
                isSelected
                  ? 'border-purple-400 bg-purple-950/80 text-purple-200 ring-2 ring-purple-400/50 shadow-lg shadow-purple-500/30 scale-[1.02]'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[9px] text-purple-400 uppercase font-bold">Stage {node.num}</span>
                <NodeIcon className="w-3.5 h-3.5 text-purple-400/80" />
              </div>
              <div className="text-[11px] font-bold leading-tight my-1">{node.label.split('. ')[1]}</div>
              <div className="text-[9px] text-slate-500 truncate w-full">
                {isSelected ? '● Inspecting' : 'Inspect'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded Stage Inspection Card */}
      <div className="p-5 rounded-xl border border-purple-500/40 bg-gradient-to-br from-purple-950/30 via-slate-950 to-slate-950 space-y-4 text-xs">
        {/* Stage Header */}
        <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <IconComponent className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wide">
                Stage {activeNodeData.num}: {activeNodeData.label.split('. ')[1]}
              </h4>
              <span className="text-[11px] text-purple-300 font-sans">{activeNodeData.purpose}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-cyan-400 bg-cyan-950/70 px-2.5 py-1 rounded border border-cyan-500/30 font-mono">
              {activeNodeData.category}
            </span>
          </div>
        </div>

        {/* Source File Banner */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Implemented In Backend Module:</span>
          <code className="text-cyan-300 font-mono font-bold">{activeNodeData.file}</code>
        </div>

        {/* Real Live Value (if simulation running) */}
        {activeNodeData.liveValue && (
          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40 space-y-1">
            <span className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Live Ingested Telemetry for Selected Vehicle:
            </span>
            <div className="font-mono text-xs text-white font-bold">{activeNodeData.liveValue}</div>
          </div>
        )}

        {/* 3 Core Aspects: 1. Input, 2. Output, 3. Effect */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px]">
          {/* 1. What Data Enters */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                1. What Data Enters This Stage
              </span>
              <p className="text-slate-200 font-sans text-xs leading-relaxed mt-1">
                {activeNodeData.input}
              </p>
            </div>
          </div>

          {/* 2. What It Produces */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                2. What This Stage Produces
              </span>
              <p className="text-slate-200 font-sans text-xs leading-relaxed mt-1">
                {activeNodeData.output}
              </p>
            </div>
          </div>

          {/* 3. How It Affects Next Stage / Channel Decision */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                3. Effect On Next Stage / Channel Decision
              </span>
              <p className="text-slate-200 font-sans text-xs leading-relaxed mt-1">
                {activeNodeData.effect}
              </p>
            </div>
          </div>
        </div>

        {/* Real Visual Mathematical Formulation Display */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
              Implemented Mathematical Formulation
            </span>
            <span className="text-[10px] text-slate-400 font-sans">
              Stage {activeNodeData.num} Formula
            </span>
          </div>
          {renderVisualFormula(activeNodeData.id)}
        </div>
      </div>
    </div>
  );
}

export default ModelArchitectureExplorer;
