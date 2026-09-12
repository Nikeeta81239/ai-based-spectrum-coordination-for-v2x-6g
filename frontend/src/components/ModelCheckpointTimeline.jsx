import React, { useState, useEffect } from 'react';
import { History, CheckCircle2, RefreshCw, FolderDown, Save } from 'lucide-react';
import api from '../api/api';

export function ModelCheckpointTimeline({ status = null }) {
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('best');
  const [loadMessage, setLoadMessage] = useState(null);

  const modelLoaded = status?.model_loaded ?? true;

  const fetchCheckpoints = async () => {
    try {
      const res = await api.getCheckpoints();
      if (res.data?.checkpoints && res.data.checkpoints.length > 0) {
        setCheckpoints(res.data.checkpoints);
      }
    } catch (err) {
      console.warn('Could not fetch checkpoints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckpoints();
  }, []);

  const handleLoadCheckpoint = async (id) => {
    setLoadMessage({ type: 'info', text: `Loading weights from models/${id}...` });
    try {
      const res = await api.loadCheckpoint(id);
      setLoadMessage({ type: 'success', text: res.data?.message || `Loaded checkpoint ${id} successfully.` });
      setSelectedId(id);
      fetchCheckpoints();
    } catch (err) {
      setLoadMessage({ type: 'error', text: `Failed to load checkpoint: ${err.response?.data?.detail || err.message}` });
    }
    setTimeout(() => setLoadMessage(null), 4000);
  };

  const currentCp = checkpoints.find((c) => c.id === selectedId) || checkpoints[0] || {
    id: 'best',
    name: 'Checkpoint BEST',
    episode: 50,
  };

  return (
    <div className="p-4 rounded-xl glass-card border border-cyan-500/30 font-mono space-y-3 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Current Checkpoint Info */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
            <Save className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Current Checkpoint:</span>
              <span className="text-cyan-400 font-mono">models/{currentCp.id}/</span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full border ${
                  modelLoaded
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/60'
                    : 'text-amber-400 border-amber-500/30 bg-amber-950/60'
                }`}
              >
                {modelLoaded ? '● Loaded' : '○ Not Loaded'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Trained Episode: <span className="text-slate-200 font-bold">{currentCp.episode}</span> | Purpose: Stores trained actor-critic weights for evaluation & inference
            </div>
          </div>
        </div>

        {/* Right: Select & Load Dropdown Control */}
        <div className="flex items-center gap-2">
          {checkpoints.length > 0 && (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono"
            >
              {checkpoints.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.id.toUpperCase()} (Ep {cp.episode}) {cp.is_best ? '★ Best' : ''}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => handleLoadCheckpoint(selectedId)}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer"
          >
            <FolderDown className="w-3.5 h-3.5" />
            <span>Load Checkpoint</span>
          </button>
        </div>
      </div>

      {/* Load Toast */}
      {loadMessage && (
        <div
          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between font-mono ${
            loadMessage.type === 'error'
              ? 'border-rose-500/50 bg-rose-950/60 text-rose-300'
              : loadMessage.type === 'success'
              ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300'
              : 'border-cyan-500/50 bg-cyan-950/60 text-cyan-300'
          }`}
        >
          <span>{loadMessage.text}</span>
          <button onClick={() => setLoadMessage(null)} className="px-1 text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default ModelCheckpointTimeline;
