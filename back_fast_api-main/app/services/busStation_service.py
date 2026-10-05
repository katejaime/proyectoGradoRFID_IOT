from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.busStation import Parada
from app.schemas.busStation import ParadaCreate, ParadaRead, ParadasPage, ParadaUpdate


def create_parada(db: Session, parada: ParadaCreate) -> ParadaRead:
    db_parada = Parada(**parada.model_dump())
    db.add(db_parada)
    db.commit()
    db.refresh(db_parada)
    return ParadaRead.model_validate(db_parada)


def get_parada(db: Session, parada_id: int) -> ParadaRead | None:
    parada = db.get(Parada, parada_id)
    return ParadaRead.model_validate(parada) if parada else None


def list_paradas(db: Session, skip: int, limit: int) -> ParadasPage:
    total = db.scalar(select(func.count()).select_from(Parada)) or 0
    paradas = db.scalars(
        select(Parada).order_by(Parada.idParada).offset(skip).limit(limit)
    ).all()
    return ParadasPage(
        total=total,
        skip=skip,
        limit=limit,
        items=[ParadaRead.model_validate(parada) for parada in paradas],
    )


def update_parada(db: Session, parada_id: int, changes: ParadaUpdate) -> ParadaRead | None:
    parada = db.get(Parada, parada_id)
    if parada is None:
        return None
    for field, value in changes.model_dump(exclude_unset=True).items():
        setattr(parada, field, value)
    db.commit()
    db.refresh(parada)
    return ParadaRead.model_validate(parada)


def delete_parada(db: Session, parada_id: int) -> bool:
    parada = db.get(Parada, parada_id)
    if parada is None:
        return False
    db.delete(parada)
    db.commit()
    return True
