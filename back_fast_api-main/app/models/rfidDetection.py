from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DeteccionRfid(Base):
    """Detección de un llavero RFID captada por un lector."""

    __tablename__ = "deteccionRfid"

    idDeteccion: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    fechaHora: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    uidRfid: Mapped[str] = mapped_column(String(50), nullable=False)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="activo", server_default=text("'activo'")
    )
    idLector: Mapped[int] = mapped_column(
        Integer, ForeignKey("lectorRfid.idLector", ondelete="CASCADE"), nullable=False
    )
