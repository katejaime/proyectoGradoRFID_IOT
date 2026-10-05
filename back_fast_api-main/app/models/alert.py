from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Alerta(Base):
    """Alerta generada en el sistema de transporte"""

    __tablename__ = "alerta"

    idAlerta: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    fechaHora: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="activo", server_default=text("'activo'")
    )
    idDeteccion: Mapped[int] = mapped_column(
        Integer, ForeignKey("deteccionRfid.idDeteccion", ondelete="CASCADE"), nullable=False
    )
    atendida: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    fechaAtencion: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    idAsignacion: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("asignacionDiaria.idAsignacion", ondelete="SET NULL"), nullable=True
    )
