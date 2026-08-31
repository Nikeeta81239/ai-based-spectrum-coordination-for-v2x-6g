import React, { useEffect, useState } from 'react';
import PrivacyCard from '../components/PrivacyCard';
import { ShieldCheck, Lock, Database } from 'lucide-react';
import api from '../api/api';
import Spectrum from './Spectrum';

export function Privacy() {
  const [privacyMetrics, setPrivacyMetrics] = useState(null);

  useEffect(() => {
    api.getPrivacyMetrics()
      .then((response) => setPrivacyMetrics(response.data))
      .catch((error) => console.error('Unable to load privacy metrics:', error));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">Privacy-Aware Spectrum Coordination</h2>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Evaluating communication overhead reduction through local information reliance
        </p>
      </div>

      <PrivacyCard privacyMetrics={privacyMetrics} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
        <div className="p-5 rounded-2xl border border-slate-800 glass-card space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <Database className="w-4 h-4" />
            Baseline Spectrum Management
          </div>
          <p className="text-slate-400 leading-relaxed">
            The baseline message count is a simulation model: each vehicle shares a channel-state reading for every available channel at each recorded step. It illustrates signalling cost, not a formal privacy guarantee.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 glass-card space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            Proposed Privacy-Aware MARL
          </div>
          <p className="text-slate-400 leading-relaxed">
            During deployment, vehicles execute the trained <strong>Local Critic</strong> using local sensor inputs and channel-availability beacons. The dashboard reports the reduction calculated from the current simulation history.
          </p>
        </div>
      </div>
    </div>
  );
}

export { Spectrum as Privacy };
export default Spectrum;
