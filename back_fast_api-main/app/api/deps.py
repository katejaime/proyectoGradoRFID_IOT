from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import Usuario, UserRole

DatabaseSession = Annotated[Session, Depends(get_db)]


def _usuario_desde_token(db: Session, token: str) -> Usuario | None:
    try:
        user_id = int(decode_access_token(token).get("sub"))
    except (jwt.InvalidTokenError, TypeError, ValueError):
        return None
    usuario = db.get(Usuario, user_id)
    if usuario is None or not usuario.estado:
        return None
    return usuario


async def get_current_user(
    db: DatabaseSession,
    authorization: Annotated[str | None, Header()] = None,
) -> Usuario:
    """Obtiene el usuario activo asociado al JWT enviado como Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    usuario = _usuario_desde_token(db, authorization.removeprefix("Bearer "))
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido, expirado o usuario no autorizado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return usuario


def get_user_from_token(db: Session, token: str) -> Usuario | None:
    """Igual que get_current_user, pero para el WebSocket (token viene por query, no por header)."""
    return _usuario_desde_token(db, token)


async def get_current_admin(current_user: Annotated[Usuario, Depends(get_current_user)]) -> Usuario:
    """Restringe el acceso a usuarios con el rol administrador."""
    if current_user.rol != UserRole.ADMINISTRADOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere el rol de administrador",
        )
    return current_user


CurrentUser = Annotated[Usuario, Depends(get_current_user)]
CurrentAdmin = Annotated[Usuario, Depends(get_current_admin)]
