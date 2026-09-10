import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/api';

export function useSimulation() {
  const [simulationState, setSimulationState] = useState({
    time_step: 0,
    num_vehicles: 0,
    vehicles: [],
    road_lanes: [],
    traffic_lights: [],
    channels: [],
    metrics: {},
  });
  const [status, setStatus] = useState('idle');
  const [speed, setSpeedState] = useState(1.0);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const syncStatus = useCallback(() => {
    api.getSimulationStatus()
      .then((res) => {
        if (res.data?.status) setStatus(res.data.status);
        if (res.data?.speed_multiplier) setSpeedState(res.data.speed_multiplier);
      })
      .catch(() => {});

    api.getCurrentSimulation()
      .then((res) => {
        if (res.data && res.data.vehicles && res.data.vehicles.length > 0) {
          setSimulationState(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const connectWebSocket = useCallback(() => {
    try {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close existing socket if in bad state
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          return; // Already active
        }
        try { wsRef.current.close(); } catch (_) {}
      }

      const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + '/ws/simulation';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        syncStatus();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'state' && msg.data) {
            setSimulationState(msg.data);
            setStatus('running');
          } else if (msg.type === 'status') {
            if (['running', 'paused', 'stopped', 'completed', 'idle', 'starting'].includes(msg.status)) {
              setStatus(msg.status);
            }
            if (msg.data && msg.data.vehicles && msg.data.vehicles.length > 0) {
              setSimulationState(msg.data);
            }
          }
        } catch (err) {
          console.error("WS message parse error:", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Automatic reconnection attempt after 1.5s
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 1500);
      };

      ws.onerror = () => {
        setIsConnected(false);
        try { ws.close(); } catch (_) {}
      };
    } catch (e) {
      console.warn("WebSocket init error:", e);
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 2000);
    }
  }, [syncStatus]);

  useEffect(() => {
    // Initial fetch of current status and snapshot
    syncStatus();
    connectWebSocket();

    // Re-check and reconnect when laptop wakes up from sleep or user switches tabs back
    const handleWakeOrFocus = () => {
      syncStatus();
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connectWebSocket();
      }
    };

    window.addEventListener('focus', handleWakeOrFocus);
    window.addEventListener('online', handleWakeOrFocus);
    document.addEventListener('visibilitychange', handleWakeOrFocus);

    // Watchdog interval: if socket got dropped during sleep, recover automatically
    const watchdogInterval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        connectWebSocket();
      }
    }, 4000);

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      clearInterval(watchdogInterval);
      window.removeEventListener('focus', handleWakeOrFocus);
      window.removeEventListener('online', handleWakeOrFocus);
      document.removeEventListener('visibilitychange', handleWakeOrFocus);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket, syncStatus]);

  const sendWsCommand = (cmd) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
    }
  };

  const startSimulation = async (
    scenario = 'low',
    numVehicles = 20,
    durationSteps = 600,
    speedMultiplier = 1.0,
    aiMode = 'marl',
    useSumo = true,
    gui = true
  ) => {
    // Optimistic update — button reacts instantly, SUMO loads in background
    setStatus('starting');
    try {
      const res = await api.startSimulation({
        scenario,
        num_vehicles: numVehicles,
        duration_steps: durationSteps,
        speed_multiplier: speedMultiplier,
        ai_mode: aiMode,
        use_sumo: useSumo,
        gui: gui,
      });

      // Safety timeout: if still 'starting' after 20s, sync status from backend so UI is never stuck
      setTimeout(() => {
        api.getSimulationStatus().then((s) => {
          if (s.data?.status && s.data.status !== 'starting') {
            setStatus(s.data.status);
          }
        }).catch(() => {});
      }, 20000);

      return res.data;
    } catch (err) {
      setStatus('idle'); // revert only on hard failure
      console.warn("Simulation start error:", err.message);
    }
  };

  const pauseSimulation = async () => {
    setStatus('paused'); // instant feedback
    try {
      await api.pauseSimulation();
    } catch (err) {
      setStatus('running'); // revert on failure
      console.error("Pause failed:", err);
    }
  };

  const resumeSimulation = async () => {
    setStatus('running'); // instant feedback
    try {
      await api.resumeSimulation();
    } catch (err) {
      setStatus('paused'); // revert on failure
      console.error("Resume failed:", err);
    }
  };

  const setSimulationSpeed = async (multiplier) => {
    setSpeedState(multiplier); // instant feedback
    try {
      await api.setSimulationSpeed(multiplier);
    } catch (err) {
      console.error("Speed change failed:", err);
    }
  };

  const stepSimulation = async () => {
    try {
      const res = await api.stepSimulation();
      if (res.data) setSimulationState(res.data);
    } catch (err) {
      console.error("Step failed:", err);
    }
  };

  const stopSimulation = async () => {
    setStatus('stopped'); // instant feedback
    try {
      await api.stopSimulation();
      syncStatus();
    } catch (err) {
      console.error("Stop simulation failed:", err);
    }
  };

  const resetSimulation = async () => {
    setStatus('idle'); // instant feedback
    setSimulationState({ time_step: 0, num_vehicles: 0, vehicles: [], channels: [], metrics: {} });
    try {
      await api.resetSimulation();
      syncStatus();
    } catch (err) {
      console.error("Reset simulation failed:", err);
    }
  };

  return {
    simulationState,
    status,
    speed,
    isConnected,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    setSimulationSpeed,
    stepSimulation,
    stopSimulation,
    resetSimulation,
  };
}
