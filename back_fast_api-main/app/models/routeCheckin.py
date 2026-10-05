from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CheckinRuta(Base):
    """Confirmación manual del conductor de que su bus llegó a una parada de su ruta de hoy."""

    __tablename__ = "checkinRuta"

    idCheckin: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    idAsignacion: Mapped[int] = mapped_column(
        Integer, ForeignKey("asignacionDiaria.idAsignacion", ondelete="CASCADE"), nullable=False, index=True
    )
    idParada: Mapped[int] = mapped_column(
        Integer, ForeignKey("parada.idParada", ondelete="CASCADE"), nullable=False
    )
    orden: Mapped[int] = mapped_column(Integer, nullable=False)
    fechaHora: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
