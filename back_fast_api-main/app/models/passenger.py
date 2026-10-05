from sqlalchemy import Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Pasajero(Base):
    """Pasajero registrado en el sistema de transporte."""

    __tablename__ = "pasajero"

    id_pasajero: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo_discapacidad: Mapped[str] = mapped_column(String(50), nullable=False)
    telefono: Mapped[str] = mapped_column(String(15), nullable=False)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="activo", server_default=text("'activo'")
    )
