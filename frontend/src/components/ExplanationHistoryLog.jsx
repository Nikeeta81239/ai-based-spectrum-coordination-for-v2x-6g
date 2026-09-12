import React, { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import api from '../api/api';
import { formatPercent } from '../utils/formatters';

export function ExplanationHistoryLog({ onSelectVehicle }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAllExplanations()
      .then((r) => {
        const items = r.data?.explanations || [];
        setHistoryItems(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-5 rounded-2xl glass-card border border-purple-500/30 font-mono space-y-4 shadow-xl">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" />
          EXPLANATION HISTORY LOG
        </h3>
        <span className="text-[10px] text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
          {historyItems.length} XAI RECORDS
        </span>
      </div>

      {loading && (
        <p className="text-xs text-slate-500 text-center py-2">Loading XAI records…</p>
      )}

      {!loading && historyItems.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-2">
          No explanation records yet. Run a simulation to generate XAI logs.
        </p>
      )}

      <div className="space-y-2">
        {historyItems.map((item, idx) => {
          const chLabel = item.channel_label || (item.selected_channel !== undefined ? `CH${item.selected_channel + 1}` : '—');
          const confidence = item.confidence !== undefined ? formatPercent(item.confidence) : '—';
          const appType = item.app_type || 'normal';

          return (
            <div
              key={idx}
              onClick={() => onSelectVehicle && onSelectVehicle(item.vehicle_id)}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-purple-500/40 cursor-pointer flex items-center justify-between text-xs transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 uppercase">{appType}</span>
                <strong className="text-white font-bold">
                  {item.vehicle_id} → {chLabel}
                </strong>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-400">
                  Confidence: <strong className="text-emerald-400">{confidence}</strong>
                </span>
                <span className="text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                  XAI
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ExplanationHistoryLog;
