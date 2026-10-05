from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.deps import CurrentAdmin, CurrentUser, DatabaseSession
from app.schemas.schedule import (
    AsignacionCreate,
    AsignacionesPage,
    AsignacionRead,
    AsignacionUpdate,
    TurnoAdminRead,
    TurnoHoyRead,
)
from app.services.schedule_service import (
    construir_turno_hoy,
    create_asignacion,
    delete_asignacion,
    get_asignacion,
    get_asignacion_de_hoy_por_conductor,
    list_asignaciones,
    list_turnos_hoy_admin,
    registrar_checkin,
    update_asignacion,
)

router = APIRouter()


@router.get("/hoy", response_model=TurnoHoyRead)
def get_mi_turno_hoy(db: DatabaseSession, current_user: CurrentUser) -> TurnoHoyRead:
    """Devuelve el turno de hoy del conductor autenticado: bus, ruta y parada actual/próxima."""
    asignacion = get_asignacion_de_hoy_por_conductor(db, current_user.id)
    if asignacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No tienes una asignación para hoy"
        )
    return construir_turno_hoy(db, asignacion)


@router.get("/hoy/todas", response_model=list[TurnoAdminRead])
def get_turnos_hoy_admin(db: DatabaseSession, _: CurrentAdmin) -> list[TurnoAdminRead]:
    """Turno de hoy de todos los buses activos, para el monitoreo en vivo; requiere administrador."""
    return list_turnos_hoy_admin(db)


@router.post("/hoy/checkin", response_model=TurnoHoyRead)
def confirmar_checkin(db: DatabaseSession, current_user: CurrentUser) -> TurnoHoyRead:
    """El conductor confirma que llegó a la siguiente parada de su ruta de hoy."""
    asignacion = get_asignacion_de_hoy_por_conductor(db, current_user.id)
    if asignacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No tienes una asignación para hoy"
        )
    try:
        return registrar_checkin(db, asignacion)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.post("/", response_model=AsignacionRead, status_code=status.HTTP_201_CREATED)
def create_new_asignacion(
    asignacion: AsignacionCreate, db: DatabaseSession, _: CurrentAdmin
) -> AsignacionRead:
    """Crea la asignación de bus/ruta/conductor para un día; requiere un administrador autenticado."""
    try:
        return create_asignacion(db, asignacion)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.get("/", response_model=AsignacionesPage)
def get_asignaciones(
    db: DatabaseSession,
    _: CurrentAdmin,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> AsignacionesPage:
    """Lista asignaciones diarias paginadas; requiere un administrador autenticado."""
    return list_asignaciones(db, skip, limit)


@router.get("/{asignacion_id}", response_model=AsignacionRead)
def get_asignacion_by_id(
    asignacion_id: int, db: DatabaseSession, _: CurrentAdmin
) -> AsignacionRead:
    asignacion = get_asignacion(db, asignacion_id)
    if asignacion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación no encontrada")
    return asignacion


@router.put("/{asignacion_id}", response_model=AsignacionRead)
def update_asignacion_by_id(
    asignacion_id: int, changes: AsignacionUpdate, db: DatabaseSession, _: CurrentAdmin
) -> AsignacionRead:
    try:
        asignacion = update_asignacion(db, asignacion_id, changes)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    if asignacion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación no encontrada")
    return asignacion


@router.delete("/{asignacion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asignacion_by_id(
    asignacion_id: int, db: DatabaseSession, _: CurrentAdmin
) -> Response:
    if not delete_asignacion(db, asignacion_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asignación no encontrada")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
