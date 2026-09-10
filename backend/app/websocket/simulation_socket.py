"""
simulation_socket.py — WebSocket endpoint /ws/simulation
Streams live simulation snapshots to connected clients.
"""

import asyncio
import json
import logging
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..services.simulation_service import sim_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._locks: dict[WebSocket, asyncio.Lock] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self._locks[websocket] = asyncio.Lock()
        logger.info(f"[WS] Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        self._locks.pop(websocket, None)
        logger.info(f"[WS] Client disconnected. Total: {len(self.active_connections)}")

    async def send_message(self, websocket: WebSocket, message: dict):
        lock = self._locks.get(websocket)
        if not lock:
            return
        async with lock:
            try:
                await websocket.send_json(message)
            except Exception:
                self.disconnect(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            await self.send_message(connection, message)


manager = ConnectionManager()


@router.websocket("/ws/simulation")
async def websocket_simulation(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial snapshot immediately upon connect
        snapshot = sim_service.get_current_snapshot()
        await manager.send_message(websocket, {
            "type": "status",
            "status": sim_service.status,
            "data": snapshot,
            "timestamp": time.time(),
        })

        while True:
            # Listen for client command or keepalive
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=2.0)
                cmd = json.loads(data)
                action = cmd.get("action")
                if action == "start":
                    sim_service.start(
                        scenario=cmd.get("scenario", "low"),
                        num_vehicles=cmd.get("num_vehicles"),
                        duration_steps=cmd.get("duration_steps", 600),
                        speed_multiplier=cmd.get("speed_multiplier", 1.0),
                    )
                elif action == "stop":
                    sim_service.stop()
                elif action == "pause":
                    sim_service.pause()
                elif action == "resume":
                    sim_service.resume()
                elif action == "reset":
                    sim_service.reset()
                elif action == "speed":
                    sim_service.set_speed(cmd.get("speed", 1.0))

                # Immediately notify status change
                await manager.send_message(websocket, {
                    "type": "status",
                    "status": sim_service.status,
                    "data": sim_service.get_current_snapshot(),
                    "timestamp": time.time(),
                })
            except asyncio.TimeoutError:
                # Periodic keepalive — always send current status to client
                await manager.send_message(websocket, {
                    "type": "status",
                    "status": sim_service.status,
                    "data": sim_service.get_current_snapshot(),
                    "timestamp": time.time(),
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"[WS] Client socket closed: {e}")
        manager.disconnect(websocket)
