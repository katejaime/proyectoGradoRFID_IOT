from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.deps import CurrentAdmin, DatabaseSession
from app.schemas.bus import BusCreate, BusesPage, BusRead, BusUpdate
from app.services.bus_service import (
    create_bus,
    delete_bus,
    get_bus,
    list_buses,
    update_bus,
)

router = APIRouter()


@router.post("/", response_model=BusRead, status_code=status.HTTP_201_CREATED)
def create_new_bus(bus: BusCreate, db: DatabaseSession, _: CurrentAdmin) -> BusRead:
    """Crea un bus; requiere un administrador autenticado."""
    try:
        return create_bus(db, bus)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.get("/", response_model=BusesPage)
def get_buses(
    db: DatabaseSession,
    _: CurrentAdmin,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> BusesPage:
    """Lista buses paginados; requiere un administrador autenticado."""
    return list_buses(db, skip, limit)


@router.get("/{bus_id}", response_model=BusRead)
def get_bus_by_id(bus_id: int, db: DatabaseSession, _: CurrentAdmin) -> BusRead:
    bus = get_bus(db, bus_id)
    if bus is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bus no encontrado")
    return bus


@router.put("/{bus_id}", response_model=BusRead)
def update_bus_by_id(
    bus_id: int, changes: BusUpdate, db: DatabaseSession, _: CurrentAdmin
) -> BusRead:
    try:
        bus = update_bus(db, bus_id, changes)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    if bus is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bus no encontrado")
    return bus


@router.delete("/{bus_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bus_by_id(bus_id: int, db: DatabaseSession, _: CurrentAdmin) -> Response:
    if not delete_bus(db, bus_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bus no encontrado")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
