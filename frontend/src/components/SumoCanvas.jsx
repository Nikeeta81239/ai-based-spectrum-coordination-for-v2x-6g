import React, { useRef, useEffect, useState } from 'react';
import { getChannelColor } from '../utils/formatters';
import { ZoomIn, ZoomOut, RotateCcw, Compass } from 'lucide-react';

export function SumoCanvas({
  vehicles = [],
  roadLanes = [],
  trafficLights = [],
  selectedVehicleId = null,
  onSelectVehicle,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Viewport camera state (in SUMO meter coordinate units)
  const [camera, setCamera] = useState({
    x: 3500, // Center of corridor
    y: 10500,
    zoom: 0.18, // pixels per meter
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    camStart: { x: 3500, y: 10500 },
  });

  const [followSelected, setFollowSelected] = useState(true);

  // Auto-fit camera to vehicles if vehicles exist and follow mode is active
  useEffect(() => {
    if (!vehicles || vehicles.length === 0) return;

    if (followSelected && selectedVehicleId) {
      const sv = vehicles.find((v) => v.vehicle_id === selectedVehicleId);
      if (sv && typeof sv.x === 'number' && typeof sv.y === 'number') {
        setCamera((prev) => ({
          ...prev,
          x: sv.x,
          y: sv.y,
        }));
        return;
      }
    }

    // Otherwise center on average position of active vehicles
    const validVehs = vehicles.filter((v) => typeof v.x === 'number' && !isNaN(v.x));
    if (validVehs.length > 0) {
      const avgX = validVehs.reduce((acc, v) => acc + v.x, 0) / validVehs.length;
      const avgY = validVehs.reduce((acc, v) => acc + v.y, 0) / validVehs.length;
      setCamera((prev) => ({
        ...prev,
        x: avgX,
        y: avgY,
      }));
    }
  }, [vehicles, selectedVehicleId, followSelected]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Coordinate conversion: SUMO (x meters east, y meters north) -> Canvas pixels
    const toCanvasX = (sumoX) => width / 2 + (sumoX - camera.x) * camera.zoom;
    const toCanvasY = (sumoY) => height / 2 - (sumoY - camera.y) * camera.zoom; // Invert Y (SUMO Y is up)

    // 1. Classic SUMO White Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Subtle coordinate grid
    const gridSizeMeters = 500;
    const gridPixelSize = gridSizeMeters * camera.zoom;
    if (gridPixelSize > 15) {
      ctx.strokeStyle = '#f1f5f9'; // Very light gray grid
      ctx.lineWidth = 1;
      const startX = (toCanvasX(0) % gridPixelSize + gridPixelSize) % gridPixelSize;
      for (let gx = startX; gx < width; gx += gridPixelSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      const startY = (toCanvasY(0) % gridPixelSize + gridPixelSize) % gridPixelSize;
      for (let gy = startY; gy < height; gy += gridPixelSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }
    }

    // 2. Draw SUMO Road Network Lanes
    if (roadLanes && roadLanes.length > 0) {
      roadLanes.forEach((lane) => {
        if (!lane.shape || lane.shape.length < 2) return;
        const pts = lane.shape;

        // Road asphalt base
        ctx.beginPath();
        ctx.moveTo(toCanvasX(pts[0][0]), toCanvasY(pts[0][1]));
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(toCanvasX(pts[i][0]), toCanvasY(pts[i][1]));
        }
        ctx.strokeStyle = '#808080'; // Classic SUMO gray road
        ctx.lineWidth = Math.max(3, (lane.width || 3.2) * camera.zoom);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Road center dashed line
        ctx.beginPath();
        ctx.moveTo(toCanvasX(pts[0][0]), toCanvasY(pts[0][1]));
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(toCanvasX(pts[i][0]), toCanvasY(pts[i][1]));
        }
        ctx.strokeStyle = '#ffffff'; // White dashed line
        ctx.lineWidth = Math.max(1, 0.5 * camera.zoom);
        ctx.setLineDash([8, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // 3. Draw Traffic Lights
    if (trafficLights && trafficLights.length > 0) {
      trafficLights.forEach((tl) => {
        if (!tl.position || tl.position[0] === 0) return;
        const tx = toCanvasX(tl.position[0]);
        const ty = toCanvasY(tl.position[1]);
        if (tx < -20 || tx > width + 20 || ty < -20 || ty > height + 20) return;

        // Determine main state (Green / Red / Yellow)
        const isGreen = tl.state && (tl.state.includes('G') || tl.state.includes('g'));
        const isYellow = tl.state && (tl.state.includes('y') || tl.state.includes('Y'));
        const color = isGreen ? '#10b981' : isYellow ? '#f59e0b' : '#ef4444';

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(tx, ty, Math.max(4, 3 * camera.zoom), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // 4. Draw V2X Wireless Communication Rays between Communicating Neighbors
    const vehPosMap = {};
    vehicles.forEach((v) => {
      vehPosMap[v.vehicle_id] = {
        cx: toCanvasX(v.x),
        cy: toCanvasY(v.y),
        color: getChannelColor(v.selected_channel),
      };
    });

    vehicles.forEach((v) => {
      const p1 = vehPosMap[v.vehicle_id];
      if (!p1) return;
      const neighbors = v.neighboring_vehicles || [];
      neighbors.forEach((nid) => {
        const p2 = vehPosMap[nid];
        if (p2) {
          ctx.beginPath();
          ctx.moveTo(p1.cx, p1.cy);
          ctx.lineTo(p2.cx, p2.cy);
          ctx.strokeStyle = `${p1.color}33`; // 20% opacity beam
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    });

    // 5. Draw SUMO Vehicles (with heading rotation, length, width, and antenna pulse)
    vehicles.forEach((v) => {
      if (typeof v.x !== 'number' || typeof v.y !== 'number') return;
      const cx = toCanvasX(v.x);
      const cy = toCanvasY(v.y);

      // Cull offscreen vehicles
      if (cx < -50 || cx > width + 50 || cy < -50 || cy > height + 50) return;

      const isSelected = selectedVehicleId && selectedVehicleId === v.vehicle_id;
      const chColor = getChannelColor(v.selected_channel);

      const vLen = Math.max(8, (v.length || 4.5) * camera.zoom);
      const vWid = Math.max(4, (v.width || 1.8) * camera.zoom);

      ctx.save();
      ctx.translate(cx, cy);

      // In SUMO: heading is clockwise degrees from North (0 = North, 90 = East, 180 = South).
      // On canvas where Y is down, North is -Y, East is +X.
      // angle in radians = (heading - 90) * (PI / 180)
      const rad = ((v.heading || 0) - 90) * (Math.PI / 180);
      ctx.rotate(rad);

      // Selection Halo
      if (isSelected) {
        ctx.beginPath();
        ctx.ellipse(0, 0, vLen * 1.6, vWid * 2.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Vehicle Body (Rounded Rectangle)
      ctx.fillStyle = chColor;
      ctx.beginPath();
      const radius = 2;
      const halfL = vLen / 2;
      const halfW = vWid / 2;
      ctx.roundRect(-halfL, -halfW, vLen, vWid, radius);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Vehicle Windshield / Headlights indicator
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(halfL * 0.2, -halfW * 0.7, halfL * 0.4, halfW * 1.4);

      // Headlight beams
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(halfL - 1, -halfW * 0.8, 2, 2);
      ctx.fillRect(halfL - 1, halfW * 0.8 - 2, 2, 2);

      ctx.restore();

      // Vehicle Label (ID & Speed)
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = isSelected ? '#0369a1' : '#334155';
      ctx.fillText(`veh_${v.vehicle_id}`, cx + vWid + 4, cy - 4);

      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${v.speed_kmh || (v.speed_mps * 3.6).toFixed(0)} km/h`, cx + vWid + 4, cy + 8);
    });

    // 6. HUD / Scale Legend
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.roundRect(width - 170, height - 60, 155, 45, 8);
    ctx.fill();
    ctx.stroke();

    // 100-meter scale bar
    const barLen = 100 * camera.zoom;
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(width - 160, height - 30, Math.max(10, Math.min(130, barLen)), 3);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('100m SCALE', width - 160, height - 36);
    ctx.fillText(`SUMO Telemetry: ${vehicles.length} veh`, width - 160, height - 20);

  }, [vehicles, roadLanes, trafficLights, camera, selectedVehicleId]);

  // Handle Canvas Resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight || 420;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle Wheel manually to prevent passive listener error
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      setCamera((prev) => ({
        ...prev,
        zoom: Math.min(2.5, Math.max(0.04, prev.zoom * factor)),
      }));
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  // Mouse pan and zoom handlers
  const handleMouseDown = (e) => {
    setFollowSelected(false);
    setCamera((prev) => ({
      ...prev,
      isDragging: true,
      dragStart: { x: e.clientX, y: e.clientY },
      camStart: { x: prev.x, y: prev.y },
    }));
  };

  const handleMouseMove = (e) => {
    if (!camera.isDragging) return;
    const dx = (e.clientX - camera.dragStart.x) / camera.zoom;
    const dy = (e.clientY - camera.dragStart.y) / camera.zoom;
    setCamera((prev) => ({
      ...prev,
      x: prev.camStart.x - dx,
      y: prev.camStart.y + dy, // Invert Y
    }));
  };

  const handleMouseUp = () => {
    setCamera((prev) => ({ ...prev, isDragging: false }));
  };

  // Wheel event is now handled by useEffect below

  const zoomIn = () => setCamera((prev) => ({ ...prev, zoom: Math.min(2.5, prev.zoom * 1.25) }));
  const zoomOut = () => setCamera((prev) => ({ ...prev, zoom: Math.max(0.04, prev.zoom * 0.8) }));
  const resetView = () => {
    setFollowSelected(true);
    setCamera({
      x: 3500,
      y: 10500,
      zoom: 0.18,
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      camStart: { x: 3500, y: 10500 },
    });
  };

  // Canvas click to select vehicle
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickPxX = e.clientX - rect.left;
    const clickPxY = e.clientY - rect.top;

    // Find closest vehicle within 25px
    let closest = null;
    let minDist = 25;

    vehicles.forEach((v) => {
      const vx = canvas.width / 2 + (v.x - camera.x) * camera.zoom;
      const vy = canvas.height / 2 - (v.y - camera.y) * camera.zoom;
      const dist = Math.hypot(clickPxX - vx, clickPxY - vy);
      if (dist < minDist) {
        minDist = dist;
        closest = v;
      }
    });

    if (closest && onSelectVehicle) {
      onSelectVehicle(closest);
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full rounded-2xl overflow-hidden border border-slate-800 glass-card relative select-none bg-slate-950 font-mono shadow-2xl"
    >
      {/* Interactive Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      />

      {/* SUMO Simulation Top Overlay Bar */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-xl text-xs z-10">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-bold text-white tracking-wide">SUMO SIMULATION VIEWPORT</span>
        <span className="text-slate-500">|</span>
        <span className="text-cyan-400 font-bold">{vehicles.length} Micro-Vehicles</span>
        <span className="text-slate-500">|</span>
        <span className="text-purple-300">Silk Board Corridor</span>
      </div>

      {/* Camera Controls Floating Toolbox */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-700 px-2 py-1 rounded-xl text-xs z-10">
        <button
          onClick={zoomIn}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title="Reset Camera / Follow Vehicles"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setFollowSelected(!followSelected)}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
            followSelected
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Auto-follow selected vehicle"
        >
          <Compass className="w-3 h-3" />
          {followSelected ? 'FOLLOW ON' : 'FREE CAM'}
        </button>
      </div>

      {/* Real-time Subchannel Legend Footer */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-xl text-[11px] z-10">
        <span className="text-slate-400 font-bold uppercase text-[10px]">MAPPO Channels:</span>
        {[0, 1, 2, 3, 4, 5].map((ch) => (
          <div key={ch} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: getChannelColor(ch) }}
            />
            <span className="text-slate-300 text-[10px]">Ch{ch + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SumoCanvas;
