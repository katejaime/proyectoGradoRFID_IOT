from sqlalchemy import ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Ruta(Base):
    """Ruta de bus: secuencia ordenada de paradas."""

    __tablename__ = "ruta"

    idRuta: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="activo", server_default=text("'activo'")
    )


class RutaParada(Base):
    """Posición de una parada dentro de una ruta (una parada puede repetirse en distintas posiciones)."""

    __tablename__ = "rutaParada"

    idRutaParada: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    idRuta: Mapped[int] = mapped_column(
        Integer, ForeignKey("ruta.idRuta", ondelete="CASCADE"), nullable=False
    )
    idParada: Mapped[int] = mapped_column(
        Integer, ForeignKey("parada.idParada", ondelete="CASCADE"), nullable=False
    )
    orden: Mapped[int] = mapped_column(Integer, nullable=False)
