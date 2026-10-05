from sqlalchemy import Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Parada(Base):
    """Parada de bus registrada en el sistema de transporte."""

    __tablename__ = "parada"

    idParada: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="activo", server_default=text("'activo'")
    )
