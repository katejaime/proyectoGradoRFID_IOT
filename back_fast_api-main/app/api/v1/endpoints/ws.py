from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.api.deps import get_user_from_token
from app.core.database import SessionLocal
from app.services.ws_manager import manager

router = APIRouter()


@router.websocket("/alertas")
async def websocket_alertas(websocket: WebSocket, token: str = Query(...)) -> None:
    
    with SessionLocal() as db:
        usuario = get_user_from_token(db, token)

    if usuario is None:
        await websocket.accept()
        await websocket.close(code=4401)
        return

    await manager.connect(usuario.id, websocket)
    try:
        while True:
            await websocket.receive_text()
            await websocket.send_json({"tipo": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(usuario.id, websocket)
