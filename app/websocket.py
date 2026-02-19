# ============================================================
# websocket.py — WebSocket Connection Manager
# ============================================================
from fastapi import WebSocket
from typing import Dict, List
import json
import asyncio


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {
            "customer": [],
            "admin": [],
        }

    async def connect(self, websocket: WebSocket, channel: str):
        """Accept and register a WebSocket connection."""
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        """Remove a WebSocket connection."""
        if channel in self.active_connections:
            if websocket in self.active_connections[channel]:
                self.active_connections[channel].remove(websocket)

    async def broadcast(self, channel: str, message: dict):
        """Broadcast a message to all connections in a channel."""
        if channel not in self.active_connections:
            return
        disconnected = []
        for connection in self.active_connections[channel]:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn, channel)

    async def broadcast_all(self, message: dict):
        """Broadcast to all channels."""
        for channel in self.active_connections:
            await self.broadcast(channel, message)


# Singleton instance
manager = ConnectionManager()
