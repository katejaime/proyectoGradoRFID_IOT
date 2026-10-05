from datetime import date

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.deps import CurrentAdmin, CurrentUser, DatabaseSession
from app.schemas.alert import AlertaRead, AlertasEstadisticas, AlertasPage
from app.services.alert_service import (
    get_alerta,
    list_alertas,
    list_alertas_de_asignacion,
    list_alertas_para_reporte,
    marcar_atendida,
    obtener_estadisticas,
)
from app.services.report_service import generar_excel_alertas, generar_pdf_alertas
from app.services.schedule_service import get_asignacion_de_hoy_por_conductor

router = APIRouter()


def _titulo_reporte(desde: date | None, hasta: date | None) -> str:
    if desde and hasta:
        return f"Reporte de alertas {desde} a {hasta}"
    if desde:
        return f"Reporte de alertas desde {desde}"
    if hasta:
        return f"Reporte de alertas hasta {hasta}"
    return "Reporte de alertas"


@router.get("/mias", response_model=AlertasPage)
def get_mis_alertas(
    db: DatabaseSession,
    current_user: CurrentUser,
    atendida: bool | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> AlertasPage:
    """Alertas del turno de hoy del conductor autenticado (sin `atendida` trae el historial)."""
    asignacion = get_asignacion_de_hoy_por_conductor(db, current_user.id)
    if asignacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No tienes una asignación para hoy"
        )
    return list_alertas_de_asignacion(db, asignacion.idAsignacion, skip, limit, atendida)


@router.put("/{alerta_id}/atender", response_model=AlertaRead)
def atender_alerta(alerta_id: int, db: DatabaseSession, current_user: CurrentUser) -> AlertaRead:
    """Marca una alerta como atendida; solo si pertenece al turno de hoy del conductor autenticado."""
    asignacion = get_asignacion_de_hoy_por_conductor(db, current_user.id)
    if asignacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No tienes una asignación para hoy"
        )
    alerta = marcar_atendida(db, alerta_id, asignacion.idAsignacion)
    if alerta is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alerta no encontrada en tu turno de hoy"
        )
    return alerta


@router.get("/reporte/excel")
def descargar_reporte_excel(
    db: DatabaseSession,
    _: CurrentAdmin,
    atendida: bool | None = Query(default=None),
    id_bus: int | None = Query(default=None),
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    ids: list[int] | None = Query(default=None),
) -> Response:
    """Descarga en Excel las alertas seleccionadas (o filtradas); requiere un administrador autenticado."""
    alertas = list_alertas_para_reporte(
        db, atendida=atendida, id_bus=id_bus, desde=desde, hasta=hasta, ids=ids
    )
    contenido = generar_excel_alertas(alertas)
    return Response(
        content=contenido,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="reporte_alertas.xlsx"'},
    )


@router.get("/reporte/pdf")
def descargar_reporte_pdf(
    db: DatabaseSession,
    _: CurrentAdmin,
    atendida: bool | None = Query(default=None),
    id_bus: int | None = Query(default=None),
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    ids: list[int] | None = Query(default=None),
) -> Response:
    """Descarga en PDF las alertas seleccionadas (o filtradas); requiere un administrador autenticado."""
    alertas = list_alertas_para_reporte(
        db, atendida=atendida, id_bus=id_bus, desde=desde, hasta=hasta, ids=ids
    )
    contenido = generar_pdf_alertas(alertas, _titulo_reporte(desde, hasta))
    return Response(
        content=contenido,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="reporte_alertas.pdf"'},
    )


@router.get("/", response_model=AlertasPage)
def get_alertas(
    db: DatabaseSession,
    _: CurrentAdmin,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    atendida: bool | None = Query(default=None),
    id_bus: int | None = Query(default=None),
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
) -> AlertasPage:
    """Lista alertas paginadas, con filtros opcionales; requiere un administrador autenticado."""
    return list_alertas(db, skip, limit, atendida=atendida, id_bus=id_bus, desde=desde, hasta=hasta)


@router.get("/estadisticas", response_model=AlertasEstadisticas)
def get_estadisticas(
    db: DatabaseSession,
    _: CurrentAdmin,
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
) -> AlertasEstadisticas:
    """Estadísticas agregadas de alertas para las gráficas del admin; requiere administrador."""
    return obtener_estadisticas(db, desde, hasta)


@router.get("/{alerta_id}", response_model=AlertaRead)
def get_alerta_by_id(
    alerta_id: int, db: DatabaseSession, _: CurrentAdmin
) -> AlertaRead:
    alerta = get_alerta(db, alerta_id)
    if alerta is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta no encontrada")
    return alerta
