"""WebSocket room manager and broadcaster."""

import asyncio
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket


class ConnectionInfo:
    """Information about a WebSocket connection."""

    def __init__(
        self,
        websocket: WebSocket,
        session_code: str,
        participant_id: str,
    ) -> None:
        self.websocket = websocket
        self.session_code = session_code
        self.participant_id = participant_id


class RoomManager:
    """Manages WebSocket rooms (sessions) and broadcasting."""

    def __init__(self) -> None:
        # session_code -> set of ConnectionInfo
        self._rooms: Dict[str, Set[ConnectionInfo]] = defaultdict(set)
        # participant_id -> ConnectionInfo (for direct messaging)
        self._connections: Dict[str, ConnectionInfo] = {}
        self._lock = asyncio.Lock()

    async def connect(
        self,
        websocket: WebSocket,
        session_code: str,
        participant_id: str,
    ) -> ConnectionInfo:
        """Add a connection to a room."""
        await websocket.accept()
        
        conn = ConnectionInfo(websocket, session_code, participant_id)
        
        async with self._lock:
            self._rooms[session_code].add(conn)
            self._connections[participant_id] = conn
        
        return conn

    async def disconnect(self, participant_id: str) -> Optional[str]:
        """
        Remove a connection from its room.
        
        Returns the session code if found.
        """
        async with self._lock:
            conn = self._connections.pop(participant_id, None)
            if conn:
                self._rooms[conn.session_code].discard(conn)
                # Clean up empty rooms
                if not self._rooms[conn.session_code]:
                    del self._rooms[conn.session_code]
                return conn.session_code
        return None

    async def broadcast_to_room(
        self,
        session_code: str,
        message: Dict[str, Any],
        exclude_participant: Optional[str] = None,
    ) -> None:
        """Broadcast a message to all connections in a room."""
        async with self._lock:
            connections = list(self._rooms.get(session_code, set()))
        
        tasks = []
        for conn in connections:
            if exclude_participant and conn.participant_id == exclude_participant:
                continue
            tasks.append(self._send_safe(conn.websocket, message))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def send_to_participant(
        self,
        participant_id: str,
        message: Dict[str, Any],
    ) -> bool:
        """Send a message to a specific participant."""
        async with self._lock:
            conn = self._connections.get(participant_id)
        
        if conn:
            return await self._send_safe(conn.websocket, message)
        return False

    async def send_to_teacher(
        self,
        session_code: str,
        message: Dict[str, Any],
        teacher_id: str,
    ) -> bool:
        """Send a message to the teacher of a session."""
        return await self.send_to_participant(teacher_id, message)

    async def _send_safe(
        self, websocket: WebSocket, message: Dict[str, Any]
    ) -> bool:
        """Safely send a message, handling connection errors."""
        try:
            await websocket.send_json(message)
            return True
        except Exception:
            return False

    def get_room_participants(self, session_code: str) -> List[str]:
        """Get list of participant IDs in a room."""
        return [
            conn.participant_id
            for conn in self._rooms.get(session_code, set())
        ]

    def get_room_count(self, session_code: str) -> int:
        """Get number of connections in a room."""
        return len(self._rooms.get(session_code, set()))

    def is_connected(self, participant_id: str) -> bool:
        """Check if a participant is connected."""
        return participant_id in self._connections


# Global room manager instance
room_manager = RoomManager()
