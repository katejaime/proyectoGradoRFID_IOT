from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.deps import CurrentAdmin, DatabaseSession
from app.schemas.passenger import PassengerCreate, PassengerRead, PassengersPage, PassengerUpdate
from app.services.passenger_service import (
    create_passenger,
    delete_passenger,
    get_passenger,
    list_passengers,
    update_passenger,
)

router = APIRouter()


@router.post("/", response_model=PassengerRead, status_code=status.HTTP_201_CREATED)
def create_new_passenger(
    passenger: PassengerCreate, db: DatabaseSession, _: CurrentAdmin
) -> PassengerRead:
    """Crea un pasajero; requiere un administrador autenticado."""
    return create_passenger(db, passenger)


@router.get("/", response_model=PassengersPage)
def get_passengers(
    db: DatabaseSession,
    _: CurrentAdmin,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> PassengersPage:
    """Lista pasajeros paginados; requiere un administrador autenticado."""
    return list_passengers(db, skip, limit)


@router.get("/{passenger_id}", response_model=PassengerRead)
def get_passenger_by_id(
    passenger_id: int, db: DatabaseSession, _: CurrentAdmin
) -> PassengerRead:
    passenger = get_passenger(db, passenger_id)
    if passenger is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pasajero no encontrado")
    return passenger


@router.put("/{passenger_id}", response_model=PassengerRead)
def update_passenger_by_id(
    passenger_id: int, changes: PassengerUpdate, db: DatabaseSession, _: CurrentAdmin
) -> PassengerRead:
    passenger = update_passenger(db, passenger_id, changes)
    if passenger is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pasajero no encontrado")
    return passenger


@router.delete("/{passenger_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_passenger_by_id(
    passenger_id: int, db: DatabaseSession, _: CurrentAdmin
) -> Response:
    try:
        eliminado = delete_passenger(db, passenger_id)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    if not eliminado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pasajero no encontrado")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
