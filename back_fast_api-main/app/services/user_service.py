from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.user import Usuario
from app.schemas.user import UserCreate, UserRead, UsersPage, UserUpdate


def create_user(db: Session, user: UserCreate) -> UserRead:
    """Crea un usuario y persiste únicamente el hash de la contraseña."""
    usuario = Usuario(
        nombre=user.nombre,
        correo=str(user.correo),
        password=get_password_hash(user.password),
        rol=user.rol,
    )
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Ya existe un usuario con este correo") from None
    db.refresh(usuario)
    return UserRead.model_validate(usuario)


def authenticate_user(db: Session, correo: str, password: str) -> Usuario | None:
    """Valida credenciales y devuelve el usuario activo, si existe."""
    usuario = db.scalar(select(Usuario).where(Usuario.correo == correo))
    if usuario is None or not usuario.estado or not verify_password(password, usuario.password):
        return None
    return usuario


def list_users(db: Session, skip: int, limit: int) -> UsersPage:
    """Obtiene usuarios paginados sin exponer hashes de contraseñas."""
    total = db.scalar(select(func.count()).select_from(Usuario)) or 0
    usuarios = db.scalars(select(Usuario).order_by(Usuario.id).offset(skip).limit(limit)).all()
    return UsersPage(
        total=total,
        skip=skip,
        limit=limit,
        items=[UserRead.model_validate(usuario) for usuario in usuarios],
    )


def get_user(db: Session, user_id: int) -> UserRead | None:
    usuario = db.get(Usuario, user_id)
    return UserRead.model_validate(usuario) if usuario else None


def update_user(db: Session, user_id: int, changes: UserUpdate) -> UserRead | None:
    usuario = db.get(Usuario, user_id)
    if usuario is None:
        return None
    updates = changes.model_dump(exclude_unset=True)
    password = updates.pop("password", None)
    if password:
        usuario.password = get_password_hash(password)
    for field, value in updates.items():
        setattr(usuario, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Ya existe un usuario con este correo") from None
    db.refresh(usuario)
    return UserRead.model_validate(usuario)


def delete_user(db: Session, user_id: int) -> bool:
    usuario = db.get(Usuario, user_id)
    if usuario is None:
        return False
    db.delete(usuario)
    db.commit()
    return True
