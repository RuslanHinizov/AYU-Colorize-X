"""
WebSocket Router for Real-time Job Status Updates
Polling yerine WebSocket ile anlık bildirim sağlar.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Dict, Set
import asyncio
import json
import logging
from jose import JWTError, jwt
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


class ConnectionManager:
    """WebSocket connection manager for real-time updates"""
    
    def __init__(self):
        # user_id -> set of WebSocket connections
        self._connections: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        
        async with self._lock:
            if user_id not in self._connections:
                self._connections[user_id] = set()
            self._connections[user_id].add(websocket)
        
        logger.info(f"WebSocket connected for user: {user_id}")
    
    async def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection"""
        async with self._lock:
            if user_id in self._connections:
                self._connections[user_id].discard(websocket)
                if not self._connections[user_id]:
                    del self._connections[user_id]
        
        logger.info(f"WebSocket disconnected for user: {user_id}")
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send message to all connections of a specific user"""
        async with self._lock:
            connections = self._connections.get(user_id, set()).copy()
        
        disconnected = []
        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to websocket: {e}")
                disconnected.append(websocket)
        
        # Clean up disconnected sockets
        if disconnected:
            async with self._lock:
                for ws in disconnected:
                    if user_id in self._connections:
                        self._connections[user_id].discard(ws)
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected users"""
        async with self._lock:
            all_connections = [
                ws for connections in self._connections.values() 
                for ws in connections
            ]
        
        for websocket in all_connections:
            try:
                await websocket.send_json(message)
            except Exception:
                pass
    
    def get_connection_count(self) -> int:
        """Get total number of active connections"""
        return sum(len(conns) for conns in self._connections.values())


# Global connection manager
manager = ConnectionManager()


def verify_ws_token(token: str) -> str:
    """Verify JWT token and return user_id"""
    from services.auth_service import _token_blacklist
    if token in _token_blacklist:
        raise ValueError("Token has been revoked")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise ValueError("Invalid token")
        return user_id
    except JWTError:
        raise ValueError("Invalid token")


async def verify_user_exists(user_id: str) -> bool:
    """Check if user exists and is active in the database"""
    from database import SessionLocal
    from models.user import User
    from sqlalchemy import select
    async with SessionLocal() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        return user is not None and user.is_active


@router.websocket("/ws/jobs")
async def websocket_jobs(
    websocket: WebSocket,
    token: str = Query(default=None)
):
    """
    WebSocket endpoint for real-time job status updates.

    Authentication: Send token as first message {"type": "auth", "token": "<jwt>"}
    (query param ?token= also supported for backwards compatibility but discouraged)

    Messages received:
    - {"type": "job_progress", "job_id": "...", "progress": 50}
    - {"type": "job_completed", "job_id": "...", "output_path": "..."}
    - {"type": "job_failed", "job_id": "...", "error": "..."}
    - {"type": "ping"} -> responds with {"type": "pong"}
    """
    user_id = None

    # Method 1: Token from query parameter (backwards compat, discouraged)
    if token:
        try:
            user_id = verify_ws_token(token)
            if not await verify_user_exists(user_id):
                await websocket.close(code=4001, reason="User not found or inactive")
                return
        except ValueError:
            await websocket.close(code=4001, reason="Invalid token")
            return
        await manager.connect(websocket, user_id)
    else:
        # Method 2: Accept connection, then authenticate via first message
        await websocket.accept()
        try:
            # Wait up to 10 seconds for auth message
            raw = await asyncio.wait_for(websocket.receive_text(), timeout=10.0)
            msg = json.loads(raw)
            if msg.get("type") != "auth" or not msg.get("token"):
                await websocket.close(code=4001, reason="First message must be auth")
                return
            user_id = verify_ws_token(msg["token"])
            if not await verify_user_exists(user_id):
                await websocket.close(code=4001, reason="User not found or inactive")
                return
            # Register connection after successful auth
            async with manager._lock:
                if user_id not in manager._connections:
                    manager._connections[user_id] = set()
                manager._connections[user_id].add(websocket)
            await websocket.send_json({"type": "auth_ok"})
        except (asyncio.TimeoutError, ValueError, json.JSONDecodeError):
            await websocket.close(code=4001, reason="Authentication failed")
            return

    try:
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0
                )
                message = json.loads(data)

                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})

            except asyncio.TimeoutError:
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await manager.disconnect(websocket, user_id)


async def notify_job_progress(user_id: str, job_id: str, progress: int):
    """Notify user about job progress"""
    await manager.send_to_user(user_id, {
        "type": "job_progress",
        "job_id": job_id,
        "progress": progress
    })


async def notify_job_completed(user_id: str, job_id: str, output_path: str, processing_time: float):
    """Notify user that job is completed"""
    await manager.send_to_user(user_id, {
        "type": "job_completed",
        "job_id": job_id,
        "output_path": output_path,
        "processing_time": processing_time
    })


async def notify_job_failed(user_id: str, job_id: str, error: str):
    """Notify user that job failed"""
    await manager.send_to_user(user_id, {
        "type": "job_failed",
        "job_id": job_id,
        "error": error
    })
