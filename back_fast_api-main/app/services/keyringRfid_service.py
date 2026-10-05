from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.keyringRfid import LlaveroRfid
from app.models.passenger import Pasajero
from app.schemas.keyringRfid import KeyringRfidCreate, KeyringRfidRead, KeyringRfidsPage, KeyringRfidUpdate


def _validar_pasajero(db: Session, id_pasajero: int) -> None:
    if db.get(Pasajero, id_pasajero) is None:
        raise ValueError("El pasajero seleccionado no existe")


def create_keyringrfid(db: Session, keyringrfid: KeyringRfidCreate) -> KeyringRfidRead:
    _validar_pasajero(db, keyringrfid.id_pasajero)
    db_keyringrfid=LlaveroRfid(**keyringrfid.model_dump())
    db.add(db_keyringrfid)
    db.commit()
    db.refresh(db_keyringrfid)
    return KeyringRfidRead.model_validate(db_keyringrfid)


def get_keyringrfid(db: Session, uidRfid: str) -> KeyringRfidRead | None:
    keyringrfid=db.get(LlaveroRfid, uidRfid)
    return KeyringRfidRead.model_validate(keyringrfid) if keyringrfid else None

def list_keyringrfids(db: Session, skip:int, limit:int)->KeyringRfidsPage:
    total=db.scalar(select(func.count()).select_from(LlaveroRfid)) or 0
    keyringsrfids=db.scalars(
        select(LlaveroRfid).order_by(LlaveroRfid.uidRfid).offset(skip).limit(limit)
    ).all()
    return KeyringRfidsPage(
        total=total,
        skip=skip,limit=limit,
        items=[KeyringRfidRead.model_validate(keyringrfid) for keyringrfid in keyringsrfids],
    )

def update_keyringrfid(
       db: Session,uidRfid:str,changes: KeyringRfidUpdate 
) -> KeyringRfidRead | None:
    keyringrfid= db.get(LlaveroRfid,uidRfid)
    if keyringrfid is None:
        return None
    updates = changes.model_dump(exclude_unset=True)
    if "id_pasajero" in updates:
        _validar_pasajero(db, updates["id_pasajero"])
    for field, value in updates.items():
        setattr(keyringrfid,field,value)
    db.commit()
    db.refresh(keyringrfid)
    return KeyringRfidRead.model_validate(keyringrfid)

def delete_keyringrfid(db: Session, uidRfid:str) -> bool:
    keyringrfid=db.get(LlaveroRfid,uidRfid)
    if keyringrfid is None:
        return False
    db.delete(keyringrfid)
    db.commit()
    return True
