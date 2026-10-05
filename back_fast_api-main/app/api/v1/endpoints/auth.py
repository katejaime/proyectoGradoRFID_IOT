from fastapi import APIRouter, HTTPException, status

from app.api.deps import DatabaseSession
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, Token
from app.services.user_service import authenticate_user

router = APIRouter()


@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: DatabaseSession) -> Token:
    """Autentica por correo y contraseña y devuelve un JWT Bearer."""
    usuario = authenticate_user(db, str(credentials.correo), credentials.password)
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=create_access_token(subject=str(usuario.id)))
