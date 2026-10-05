from sqlalchemy import ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LectorRfid(Base):
    """Lector RFID instalado en una parada."""

    __tablename__ = "lectorRfid"

    idLector: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="activo", server_default=text("'activo'")
    )
    idParada: Mapped[int] = mapped_column(
        Integer, ForeignKey("parada.idParada", ondelete="CASCADE"), nullable=False
    )
