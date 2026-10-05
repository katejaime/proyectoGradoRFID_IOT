from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.deps import CurrentAdmin, DatabaseSession
from app.schemas.busStation import ParadaCreate, ParadaRead, ParadasPage, ParadaUpdate
from app.services.busStation_service import (
    create_parada,
    delete_parada,
    get_parada,
    list_paradas,
    update_parada,
)

router = APIRouter()


@router.post("/", response_model=ParadaRead, status_code=status.HTTP_201_CREATED)
def create_new_parada(
    parada: ParadaCreate, db: DatabaseSession, _: CurrentAdmin
) -> ParadaRead:
    """Crea una parada; requiere un administrador autenticado."""
    return create_parada(db, parada)


@router.get("/", response_model=ParadasPage)
def get_paradas(
    db: DatabaseSession,
    _: CurrentAdmin,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> ParadasPage:
    """Lista paradas paginadas; requiere un administrador autenticado."""
    return list_paradas(db, skip, limit)


@router.get("/{parada_id}", response_model=ParadaRead)
def get_parada_by_id(
    parada_id: int, db: DatabaseSession, _: CurrentAdmin
) -> ParadaRead:
    parada = get_parada(db, parada_id)
    if parada is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parada no encontrada")
    return parada


@router.put("/{parada_id}", response_model=ParadaRead)
def update_parada_by_id(
    parada_id: int, changes: ParadaUpdate, db: DatabaseSession, _: CurrentAdmin
) -> ParadaRead:
    parada = update_parada(db, parada_id, changes)
    if parada is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parada no encontrada")
    return parada


@router.delete("/{parada_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_parada_by_id(
    parada_id: int, db: DatabaseSession, _: CurrentAdmin
) -> Response:
    if not delete_parada(db, parada_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parada no encontrada")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
