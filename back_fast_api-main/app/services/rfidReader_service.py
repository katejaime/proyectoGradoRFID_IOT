from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.rfidReader import LectorRfid
from app.schemas.rfidReader import LectorRfidCreate, LectorRfidRead, LectorRfidsPage, LectorRfidUpdate


def create_lector(db: Session, lector: LectorRfidCreate) -> LectorRfidRead:
    db_lector = LectorRfid(**lector.model_dump())
    db.add(db_lector)
    db.commit()
    db.refresh(db_lector)
    return LectorRfidRead.model_validate(db_lector)


def get_lector(db: Session, lector_id: int) -> LectorRfidRead | None:
    lector = db.get(LectorRfid, lector_id)
    return LectorRfidRead.model_validate(lector) if lector else None


def list_lectores(db: Session, skip: int, limit: int) -> LectorRfidsPage:
    total = db.scalar(select(func.count()).select_from(LectorRfid)) or 0
    lectores = db.scalars(
        select(LectorRfid).order_by(LectorRfid.idLector).offset(skip).limit(limit)
    ).all()
    return LectorRfidsPage(
        total=total,
        skip=skip,
        limit=limit,
        items=[LectorRfidRead.model_validate(lector) for lector in lectores],
    )


def update_lector(db: Session, lector_id: int, changes: LectorRfidUpdate) -> LectorRfidRead | None:
    lector = db.get(LectorRfid, lector_id)
    if lector is None:
        return None
    for field, value in changes.model_dump(exclude_unset=True).items():
        setattr(lector, field, value)
    db.commit()
    db.refresh(lector)
    return LectorRfidRead.model_validate(lector)


def delete_lector(db: Session, lector_id: int) -> bool:
    lector = db.get(LectorRfid, lector_id)
    if lector is None:
        return False
    db.delete(lector)
    db.commit()
    return True
