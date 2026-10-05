from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.deps import CurrentAdmin, DatabaseSession
from app.schemas.route import RutaCreate, RutaRead, RutasPage, RutaUpdate
from app.services.route_service import (
    create_ruta,
    delete_ruta,
    get_ruta,
    list_rutas,
    update_ruta,
)

router = APIRouter()


@router.post("/", response_model=RutaRead, status_code=status.HTTP_201_CREATED)
def create_new_ruta(ruta: RutaCreate, db: DatabaseSession, _: CurrentAdmin) -> RutaRead:
    """Crea una ruta con su secuencia ordenada de paradas; requiere un administrador autenticado."""
    return create_ruta(db, ruta)


@router.get("/", response_model=RutasPage)
def get_rutas(
    db: DatabaseSession,
    _: CurrentAdmin,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> RutasPage:
    """Lista rutas paginadas; requiere un administrador autenticado."""
    return list_rutas(db, skip, limit)


@router.get("/{ruta_id}", response_model=RutaRead)
def get_ruta_by_id(ruta_id: int, db: DatabaseSession, _: CurrentAdmin) -> RutaRead:
    ruta = get_ruta(db, ruta_id)
    if ruta is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ruta no encontrada")
    return ruta


@router.put("/{ruta_id}", response_model=RutaRead)
def update_ruta_by_id(
    ruta_id: int, changes: RutaUpdate, db: DatabaseSession, _: CurrentAdmin
) -> RutaRead:
    ruta = update_ruta(db, ruta_id, changes)
    if ruta is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ruta no encontrada")
    return ruta


@router.delete("/{ruta_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ruta_by_id(ruta_id: int, db: DatabaseSession, _: CurrentAdmin) -> Response:
    if not delete_ruta(db, ruta_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ruta no encontrada")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
