import enum

from sqlalchemy import Boolean, Enum, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserRole(str, enum.Enum):
    CONDUCTOR = "conductor"
    ADMINISTRADOR = "administrador"


class Usuario(Base):
    """Usuario del sistema: conductor o administrador."""

    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    correo: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    password: Mapped[str] = mapped_column(String(200), nullable=False)
    rol: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="usuario_rol", values_callable=lambda roles: [role.value for role in roles]),
        nullable=False,
    )
    estado: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
