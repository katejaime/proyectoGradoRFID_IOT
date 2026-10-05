from sqlalchemy import Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Bus(Base):
    """Bus registrado en el sistema de transporte."""

    __tablename__ = "bus"

    idBus: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    placa: Mapped[str] = mapped_column(String(10), nullable=False, unique=True)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="activo", server_default=text("'activo'")
    )
