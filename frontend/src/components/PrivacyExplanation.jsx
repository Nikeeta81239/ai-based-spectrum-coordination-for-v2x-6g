import React from 'react';
import { Shield, EyeOff, UserX, Lock } from 'lucide-react';

export function PrivacyExplanation() {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl glass-card border border-emerald-500/20 bg-emerald-950/20 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-emerald-400" />
          <h3 className="text-xl font-bold text-white tracking-wide">
            How Does the AI Protect Your Privacy?
          </h3>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
          The 6G V2X AI coordinates traffic and network signals <strong>without</strong> tracking exactly who you are or where you go. Here is how decisions are made privately:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl glass-card border border-slate-800 bg-slate-900/50 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 border border-blue-500/40">
            <EyeOff className="w-6 h-6 text-blue-400" />
          </div>
          <h4 className="text-md font-bold text-white mb-2">No Exact GPS Tracking</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Instead of sharing exact GPS coordinates, vehicles only tell the AI if the area is "crowded" or "empty". The AI manages spectrum perfectly using just the crowd density.
          </p>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-800 bg-slate-900/50 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 border border-purple-500/40">
            <UserX className="w-6 h-6 text-purple-400" />
          </div>
          <h4 className="text-md font-bold text-white mb-2">Anonymous Identities</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cars do not share their VIN or real license plate numbers. They use temporary, scrambled IDs that change frequently to prevent long-term tracking.
          </p>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-800 bg-slate-900/50 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/40">
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>
          <h4 className="text-md font-bold text-white mb-2">Local Smart Decisions</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Most of the "thinking" happens directly inside the car itself (Local-Critic). Only tiny, safe summaries are sent to the central tower, keeping raw data locked in your vehicle.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PrivacyExplanation;
