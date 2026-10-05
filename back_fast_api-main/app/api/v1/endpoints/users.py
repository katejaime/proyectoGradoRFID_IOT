from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.deps import CurrentAdmin, CurrentUser, DatabaseSession
from app.schemas.user import UserCreate, UserRead, UsersPage, UserUpdate
from app.services.user_service import create_user, delete_user, get_user, list_users, update_user


router = APIRouter()


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_new_user(user: UserCreate, db: DatabaseSession, _: CurrentAdmin) -> UserRead:
    """Crea un usuario en PostgreSQL; requiere un administrador autenticado."""
    try:
        return create_user(db, user)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.get("/me", response_model=UserRead)
def get_my_profile(current_user: CurrentUser) -> UserRead:
    """Devuelve el perfil del usuario autenticado."""
    return UserRead.model_validate(current_user)


@router.get("/", response_model=UsersPage)
def get_users(
    db: DatabaseSession,
    _: CurrentAdmin,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> UsersPage:
    """Lista usuarios de forma paginada; requiere el rol administrador."""
    return list_users(db, skip=skip, limit=limit)


@router.get("/{user_id}", response_model=UserRead)
def get_user_by_id(user_id: int, db: DatabaseSession, _: CurrentAdmin) -> UserRead:
    usuario = get_user(db, user_id)
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return usuario


@router.put("/{user_id}", response_model=UserRead)
def update_user_by_id(
    user_id: int, changes: UserUpdate, db: DatabaseSession, _: CurrentAdmin
) -> UserRead:
    try:
        usuario = update_user(db, user_id, changes)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return usuario


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_by_id(
    user_id: int, db: DatabaseSession, current_admin: CurrentAdmin
) -> Response:
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes eliminar tu propio usuario"
        )
    if not delete_user(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
