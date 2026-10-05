from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AsignacionDiaria(Base):
    """Asignación de un bus, una ruta y un conductor para un día específico."""

    __tablename__ = "asignacionDiaria"
    __table_args__ = (
        UniqueConstraint("fecha", "idBus", name="asignacionDiaria_fecha_idBus_key"),
        UniqueConstraint("fecha", "idConductor", name="asignacionDiaria_fecha_idConductor_key"),
    )

    idAsignacion: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    idBus: Mapped[int] = mapped_column(
        Integer, ForeignKey("bus.idBus", ondelete="CASCADE"), nullable=False
    )
    idRuta: Mapped[int] = mapped_column(
        Integer, ForeignKey("ruta.idRuta", ondelete="CASCADE"), nullable=False
    )
    idConductor: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False
    )
