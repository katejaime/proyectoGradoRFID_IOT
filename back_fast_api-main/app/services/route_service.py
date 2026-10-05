from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.busStation import Parada
from app.models.route import Ruta, RutaParada
from app.schemas.route import RutaCreate, RutaParadaRead, RutaRead, RutasPage, RutaUpdate


def _build_ruta_read(db: Session, ruta: Ruta) -> RutaRead:
    filas = db.execute(
        select(RutaParada, Parada.nombre)
        .join(Parada, Parada.idParada == RutaParada.idParada)
        .where(RutaParada.idRuta == ruta.idRuta)
        .order_by(RutaParada.orden)
    ).all()
    paradas = [
        RutaParadaRead(idParada=rp.idParada, nombre=nombre, orden=rp.orden) for rp, nombre in filas
    ]
    return RutaRead(idRuta=ruta.idRuta, nombre=ruta.nombre, estado=ruta.estado, paradas=paradas)


def _reemplazar_paradas(db: Session, id_ruta: int, parada_ids: list[int]) -> None:
    db.query(RutaParada).filter(RutaParada.idRuta == id_ruta).delete()
    for orden, id_parada in enumerate(parada_ids, start=1):
        db.add(RutaParada(idRuta=id_ruta, idParada=id_parada, orden=orden))


def create_ruta(db: Session, ruta: RutaCreate) -> RutaRead:
    db_ruta = Ruta(nombre=ruta.nombre, estado=ruta.estado)
    db.add(db_ruta)
    db.flush()
    _reemplazar_paradas(db, db_ruta.idRuta, ruta.paradaIds)
    db.commit()
    db.refresh(db_ruta)
    return _build_ruta_read(db, db_ruta)


def get_ruta(db: Session, ruta_id: int) -> RutaRead | None:
    ruta = db.get(Ruta, ruta_id)
    return _build_ruta_read(db, ruta) if ruta else None


def list_rutas(db: Session, skip: int, limit: int) -> RutasPage:
    total = db.scalar(select(func.count()).select_from(Ruta)) or 0
    rutas = db.scalars(select(Ruta).order_by(Ruta.idRuta).offset(skip).limit(limit)).all()
    return RutasPage(
        total=total,
        skip=skip,
        limit=limit,
        items=[_build_ruta_read(db, ruta) for ruta in rutas],
    )


def update_ruta(db: Session, ruta_id: int, changes: RutaUpdate) -> RutaRead | None:
    ruta = db.get(Ruta, ruta_id)
    if ruta is None:
        return None
    updates = changes.model_dump(exclude_unset=True)
    parada_ids = updates.pop("paradaIds", None)
    for field, value in updates.items():
        setattr(ruta, field, value)
    if parada_ids is not None:
        _reemplazar_paradas(db, ruta.idRuta, parada_ids)
    db.commit()
    db.refresh(ruta)
    return _build_ruta_read(db, ruta)


def delete_ruta(db: Session, ruta_id: int) -> bool:
    ruta = db.get(Ruta, ruta_id)
    if ruta is None:
        return False
    db.delete(ruta)
    db.commit()
    return True
