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

  const connectWebSocket = useCallback(() => {
    try {
      const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + '/ws/simulation';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'state' && msg.data) {
            setSimulationState(msg.data);
            setStatus('running');
          } else if (msg.type === 'status') {
            setStatus(msg.status);
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
        // Automatic reconnection attempt after 2s
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 2000);
      };

      ws.onerror = () => {
        // Silent error to prevent UI noise during reconnects
      };
    } catch (e) {
      console.warn("WebSocket init error:", e);
    }
  }, []);

  useEffect(() => {
    // Initial fetch of current status and snapshot
    api.getSimulationStatus()
      .then((res) => {
        setStatus(res.data.status || 'idle');
        if (res.data.speed_multiplier) setSpeedState(res.data.speed_multiplier);
      })
      .catch((err) => console.error("Error fetching simulation status:", err));

    api.getCurrentSimulation()
      .then((res) => {
        if (res.data && res.data.vehicles) {
          setSimulationState(res.data);
        }
      })
      .catch(() => {});

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket]);

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
      setStatus('running');
      return res.data;
    } catch (err) {
      console.warn("Simulation start notice:", err.message);
    }
  };

  const pauseSimulation = async () => {
    try {
      await api.pauseSimulation();
      setStatus('paused');
    } catch (err) {
      console.error("Pause failed:", err);
    }
  };

  const resumeSimulation = async () => {
    try {
      await api.resumeSimulation();
      setStatus('running');
    } catch (err) {
      console.error("Resume failed:", err);
    }
  };

  const setSimulationSpeed = async (multiplier) => {
    try {
      setSpeedState(multiplier);
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
    try {
      await api.stopSimulation();
      setStatus('stopped');
    } catch (err) {
      console.error("Stop simulation failed:", err);
    }
  };

  const resetSimulation = async () => {
    try {
      await api.resetSimulation();
      setStatus('idle');
      setSimulationState({ time_step: 0, num_vehicles: 0, vehicles: [], channels: [], metrics: {} });
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
