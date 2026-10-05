from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentAdmin, DatabaseSession
from app.schemas.rfidDetection import DeteccionRfidRead, DeteccionRfidsPage
from app.services.rfidDetection_service import get_deteccion, list_detecciones

router = APIRouter()


@router.get("/", response_model=DeteccionRfidsPage)
def get_detecciones(
    db: DatabaseSession,
    _: CurrentAdmin,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> DeteccionRfidsPage:
    """Lista detecciones RFID paginadas; requiere un administrador autenticado."""
    return list_detecciones(db, skip, limit)


@router.get("/{deteccion_id}", response_model=DeteccionRfidRead)
def get_deteccion_by_id(
    deteccion_id: int, db: DatabaseSession, _: CurrentAdmin
) -> DeteccionRfidRead:
    deteccion = get_deteccion(db, deteccion_id)
    if deteccion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Detección no encontrada")
    return deteccion


