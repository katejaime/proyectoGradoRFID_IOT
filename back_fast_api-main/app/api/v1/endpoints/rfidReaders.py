from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.deps import CurrentAdmin, DatabaseSession
from app.schemas.rfidReader import LectorRfidCreate, LectorRfidRead, LectorRfidsPage, LectorRfidUpdate
from app.services.rfidReader_service import (
    create_lector,
    delete_lector,
    get_lector,
    list_lectores,
    update_lector,
)

router = APIRouter()


@router.post("/", response_model=LectorRfidRead, status_code=status.HTTP_201_CREATED)
def create_new_lector(
    lector: LectorRfidCreate, db: DatabaseSession, _: CurrentAdmin
) -> LectorRfidRead:
    """Crea un lector RFID; requiere un administrador autenticado."""
    return create_lector(db, lector)


@router.get("/", response_model=LectorRfidsPage)
def get_lectores(
    db: DatabaseSession,
    _: CurrentAdmin,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> LectorRfidsPage:
    """Lista lectores RFID paginados; requiere un administrador autenticado."""
    return list_lectores(db, skip, limit)


@router.get("/{lector_id}", response_model=LectorRfidRead)
def get_lector_by_id(
    lector_id: int, db: DatabaseSession, _: CurrentAdmin
) -> LectorRfidRead:
    lector = get_lector(db, lector_id)
    if lector is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lector no encontrado")
    return lector


@router.put("/{lector_id}", response_model=LectorRfidRead)
def update_lector_by_id(
    lector_id: int, changes: LectorRfidUpdate, db: DatabaseSession, _: CurrentAdmin
) -> LectorRfidRead:
    lector = update_lector(db, lector_id, changes)
    if lector is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lector no encontrado")
    return lector


@router.delete("/{lector_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lector_by_id(
    lector_id: int, db: DatabaseSession, _: CurrentAdmin
) -> Response:
    if not delete_lector(db, lector_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lector no encontrado")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
