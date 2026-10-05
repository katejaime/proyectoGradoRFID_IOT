from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.bus import Bus
from app.schemas.bus import BusCreate, BusesPage, BusRead, BusUpdate


def _bus_conflict_message(error: IntegrityError) -> str:
    constraint = getattr(getattr(error.orig, "diag", None), "constraint_name", None)
    if constraint == "bus_placa_key":
        return "Ya existe un bus con esta placa"
    return f"No se pudo guardar el bus: {error.orig}"


def create_bus(db: Session, bus: BusCreate) -> BusRead:
    db_bus = Bus(**bus.model_dump())
    db.add(db_bus)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ValueError(_bus_conflict_message(error)) from None
    db.refresh(db_bus)
    return BusRead.model_validate(db_bus)


def get_bus(db: Session, bus_id: int) -> BusRead | None:
    bus = db.get(Bus, bus_id)
    return BusRead.model_validate(bus) if bus else None


def list_buses(db: Session, skip: int, limit: int) -> BusesPage:
    total = db.scalar(select(func.count()).select_from(Bus)) or 0
    buses = db.scalars(
        select(Bus).order_by(Bus.idBus).offset(skip).limit(limit)
    ).all()
    return BusesPage(
        total=total,
        skip=skip,
        limit=limit,
        items=[BusRead.model_validate(bus) for bus in buses],
    )


def update_bus(db: Session, bus_id: int, changes: BusUpdate) -> BusRead | None:
    bus = db.get(Bus, bus_id)
    if bus is None:
        return None
    for field, value in changes.model_dump(exclude_unset=True).items():
        setattr(bus, field, value)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ValueError(_bus_conflict_message(error)) from None
    db.refresh(bus)
    return BusRead.model_validate(bus)


def delete_bus(db: Session, bus_id: int) -> bool:
    bus = db.get(Bus, bus_id)
    if bus is None:
        return False
    db.delete(bus)
    db.commit()
    return True
