import asyncio

from fastapi import WebSocket


class ConnectionManager:
    """Mantiene las conexiones WebSocket activas, agrupadas por id de conductor."""

    def __init__(self) -> None:
        self._conexiones: dict[int, list[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, id_conductor: int, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._conexiones.setdefault(id_conductor, []).append(websocket)

    async def disconnect(self, id_conductor: int, websocket: WebSocket) -> None:
        async with self._lock:
            conexiones = self._conexiones.get(id_conductor, [])
            if websocket in conexiones:
                conexiones.remove(websocket)
            if not conexiones:
                self._conexiones.pop(id_conductor, None)

    async def send_to_conductor(self, id_conductor: int, mensaje: dict) -> None:
        async with self._lock:
            conexiones = list(self._conexiones.get(id_conductor, []))
        for websocket in conexiones:
            try:
                await websocket.send_json(mensaje)
            except Exception:
                pass


manager = ConnectionManager()
