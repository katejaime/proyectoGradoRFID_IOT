from sqlalchemy import ForeignKey, Integer, String, text, Date
from datetime import date
from sqlalchemy.orm import Mapped, mapped_column


from app.core.database import Base

class LlaveroRfid(Base):
    """LLavero Rfid asociado a un pasajero registrado en el sistema"""

    __tablename__ = "llaveroRfid"
    uidRfid: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    estado: Mapped[str] = mapped_column(String(20), nullable= False, default="activo", server_default = text("'activo'"))
    fechaAsignacion: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Todo llavero pertenece a un pasajero; no se puede borrar un pasajero con llaveros.
    id_pasajero: Mapped[int] = mapped_column(
        Integer, ForeignKey("pasajero.id_pasajero", ondelete="RESTRICT"), nullable=False
    )
