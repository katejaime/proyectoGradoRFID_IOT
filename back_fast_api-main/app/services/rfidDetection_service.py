from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.rfidDetection import DeteccionRfid
from app.schemas.rfidDetection import DeteccionRfidCreate, DeteccionRfidRead, DeteccionRfidsPage


def create_deteccion(db: Session, deteccion: DeteccionRfidCreate) -> DeteccionRfidRead:
    data = deteccion.model_dump()
    data["fechaHora"] = data["fechaHora"] or datetime.now()
    db_deteccion = DeteccionRfid(**data)
    db.add(db_deteccion)
    db.commit()
    db.refresh(db_deteccion)
    return DeteccionRfidRead.model_validate(db_deteccion)


def get_deteccion(db: Session, deteccion_id: int) -> DeteccionRfidRead | None:
    deteccion = db.get(DeteccionRfid, deteccion_id)
    return DeteccionRfidRead.model_validate(deteccion) if deteccion else None


def list_detecciones(db: Session, skip: int, limit: int) -> DeteccionRfidsPage:
    total = db.scalar(select(func.count()).select_from(DeteccionRfid)) or 0
    detecciones = db.scalars(
        select(DeteccionRfid).order_by(DeteccionRfid.idDeteccion).offset(skip).limit(limit)
    ).all()
    return DeteccionRfidsPage(
        total=total,
        skip=skip,
        limit=limit,
        items=[DeteccionRfidRead.model_validate(deteccion) for deteccion in detecciones],
    )

