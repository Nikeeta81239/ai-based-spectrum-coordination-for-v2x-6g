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

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"[WS] Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"[WS] Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        for dead in dead_connections:
            self.disconnect(dead)


manager = ConnectionManager()


@router.websocket("/ws/simulation")
async def websocket_simulation(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial snapshot immediately upon connect
        snapshot = sim_service.get_current_snapshot()
        await websocket.send_json({
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
                await websocket.send_json({
                    "type": "status",
                    "status": sim_service.status,
                    "data": sim_service.get_current_snapshot(),
                    "timestamp": time.time(),
                })
            except asyncio.TimeoutError:
                # Periodic keepalive status ping
                if sim_service.status != "running":
                    await websocket.send_json({
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
