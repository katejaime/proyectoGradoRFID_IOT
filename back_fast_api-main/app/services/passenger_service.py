from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.keyringRfid import LlaveroRfid
from app.models.passenger import Pasajero
from app.schemas.passenger import PassengerCreate, PassengerRead, PassengersPage, PassengerUpdate


def create_passenger(db: Session, passenger: PassengerCreate) -> PassengerRead:
    db_passenger = Pasajero(**passenger.model_dump())
    db.add(db_passenger)
    db.commit()
    db.refresh(db_passenger)
    return PassengerRead.model_validate(db_passenger)


def get_passenger(db: Session, passenger_id: int) -> PassengerRead | None:
    passenger = db.get(Pasajero, passenger_id)
    return PassengerRead.model_validate(passenger) if passenger else None


def list_passengers(db: Session, skip: int, limit: int) -> PassengersPage:
    total = db.scalar(select(func.count()).select_from(Pasajero)) or 0
    passengers = db.scalars(
        select(Pasajero).order_by(Pasajero.id_pasajero).offset(skip).limit(limit)
    ).all()
    return PassengersPage(
        total=total,
        skip=skip,
        limit=limit,
        items=[PassengerRead.model_validate(passenger) for passenger in passengers],
    )


def update_passenger(
    db: Session, passenger_id: int, changes: PassengerUpdate
) -> PassengerRead | None:
    passenger = db.get(Pasajero, passenger_id)
    if passenger is None:
        return None
    for field, value in changes.model_dump(exclude_unset=True).items():
        setattr(passenger, field, value)
    db.commit()
    db.refresh(passenger)
    return PassengerRead.model_validate(passenger)


def delete_passenger(db: Session, passenger_id: int) -> bool:
    passenger = db.get(Pasajero, passenger_id)
    if passenger is None:
        return False
    llaveros = db.scalar(
        select(func.count()).select_from(LlaveroRfid).where(LlaveroRfid.id_pasajero == passenger_id)
    )
    if llaveros:
        raise ValueError(
            "El pasajero tiene llaveros asociados; reasígnalos a otro pasajero o elimínalos primero"
        )
    db.delete(passenger)
    db.commit()
    return True
