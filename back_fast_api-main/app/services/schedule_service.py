from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.alert import Alerta
from app.models.bus import Bus
from app.models.routeCheckin import CheckinRuta
from app.models.schedule import AsignacionDiaria
from app.models.user import Usuario, UserRole
from app.schemas.schedule import (
    AsignacionCreate,
    AsignacionesPage,
    AsignacionRead,
    AsignacionUpdate,
    TurnoAdminRead,
    TurnoHoyRead,
)
from app.services.route_service import get_ruta


def _conflict_message(error: IntegrityError) -> str:
    constraint = getattr(getattr(error.orig, "diag", None), "constraint_name", None)
    if constraint == "asignacionDiaria_fecha_idBus_key":
        return "Ese bus ya tiene una asignación ese día"
    if constraint == "asignacionDiaria_fecha_idConductor_key":
        return "Ese conductor ya tiene una asignación ese día"
    return f"No se pudo guardar la asignación: {error.orig}"


def _validar_conductor(db: Session, id_conductor: int) -> None:
    usuario = db.get(Usuario, id_conductor)
    if usuario is None or usuario.rol != UserRole.CONDUCTOR:
        raise ValueError("El usuario seleccionado no existe o no tiene rol de conductor")


def create_asignacion(db: Session, asignacion: AsignacionCreate) -> AsignacionRead:
    _validar_conductor(db, asignacion.idConductor)
    db_asignacion = AsignacionDiaria(**asignacion.model_dump())
    db.add(db_asignacion)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ValueError(_conflict_message(error)) from None
    db.refresh(db_asignacion)
    return AsignacionRead.model_validate(db_asignacion)


def get_asignacion(db: Session, asignacion_id: int) -> AsignacionRead | None:
    asignacion = db.get(AsignacionDiaria, asignacion_id)
    return AsignacionRead.model_validate(asignacion) if asignacion else None


def list_asignaciones(db: Session, skip: int, limit: int) -> AsignacionesPage:
    total = db.scalar(select(func.count()).select_from(AsignacionDiaria)) or 0
    asignaciones = db.scalars(
        select(AsignacionDiaria).order_by(AsignacionDiaria.fecha.desc(), AsignacionDiaria.idAsignacion)
        .offset(skip)
        .limit(limit)
    ).all()
    return AsignacionesPage(
        total=total,
        skip=skip,
        limit=limit,
        items=[AsignacionRead.model_validate(a) for a in asignaciones],
    )


def update_asignacion(
    db: Session, asignacion_id: int, changes: AsignacionUpdate
) -> AsignacionRead | None:
    asignacion = db.get(AsignacionDiaria, asignacion_id)
    if asignacion is None:
        return None
    updates = changes.model_dump(exclude_unset=True)
    if "idConductor" in updates:
        _validar_conductor(db, updates["idConductor"])
    for field, value in updates.items():
        setattr(asignacion, field, value)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ValueError(_conflict_message(error)) from None
    db.refresh(asignacion)
    return AsignacionRead.model_validate(asignacion)


def delete_asignacion(db: Session, asignacion_id: int) -> bool:
    asignacion = db.get(AsignacionDiaria, asignacion_id)
    if asignacion is None:
        return False
    db.delete(asignacion)
    db.commit()
    return True


def get_asignacion_de_hoy_por_conductor(db: Session, id_conductor: int) -> AsignacionDiaria | None:
    return db.scalar(
        select(AsignacionDiaria).where(
            AsignacionDiaria.idConductor == id_conductor,
            AsignacionDiaria.fecha == date.today(),
        )
    )


def ultimo_checkin(db: Session, id_asignacion: int) -> CheckinRuta | None:
    return db.scalar(
        select(CheckinRuta)
        .where(CheckinRuta.idAsignacion == id_asignacion)
        .order_by(CheckinRuta.orden.desc())
        .limit(1)
    )


def registrar_checkin(db: Session, asignacion: AsignacionDiaria) -> TurnoHoyRead:
    """El conductor confirma que llegó a la siguiente parada de su ruta de hoy."""
    ruta = get_ruta(db, asignacion.idRuta)
    if ruta is None or not ruta.paradas:
        raise ValueError("La ruta asignada no tiene paradas configuradas")

    ultimo = ultimo_checkin(db, asignacion.idAsignacion)
    if ultimo is None:
        siguiente = ruta.paradas[0]
    else:
        siguiente = next((p for p in ruta.paradas if p.orden == ultimo.orden + 1), None)
        if siguiente is None:
            raise ValueError("Ya confirmaste la llegada a la última parada de la ruta")

    db.add(
        CheckinRuta(
            idAsignacion=asignacion.idAsignacion,
            idParada=siguiente.idParada,
            orden=siguiente.orden,
            fechaHora=datetime.now(),
        )
    )
    db.commit()

    return construir_turno_hoy(db, asignacion)


def construir_turno_hoy(db: Session, asignacion: AsignacionDiaria) -> TurnoHoyRead:
    bus = db.get(Bus, asignacion.idBus)
    ruta = get_ruta(db, asignacion.idRuta)

    parada_actual: str | None = None
    parada_actual_orden: int | None = None
    proxima_parada: str | None = None
    proxima_parada_orden: int | None = None

    if ruta is not None and ruta.paradas:
        ultimo = ultimo_checkin(db, asignacion.idAsignacion)
        if ultimo is not None:
            actual = next((p for p in ruta.paradas if p.orden == ultimo.orden), None)
            if actual is not None:
                parada_actual = actual.nombre
                parada_actual_orden = actual.orden
                siguiente = next((p for p in ruta.paradas if p.orden == actual.orden + 1), None)
                if siguiente is not None:
                    proxima_parada = siguiente.nombre
                    proxima_parada_orden = siguiente.orden
                else:
                    proxima_parada = "Fin del recorrido"

        if parada_actual is None:
            proxima_parada = ruta.paradas[0].nombre
            proxima_parada_orden = ruta.paradas[0].orden

    return TurnoHoyRead(
        idAsignacion=asignacion.idAsignacion,
        fecha=asignacion.fecha,
        busPlaca=bus.placa if bus else "",
        busEstado=bus.estado if bus else "",
        ruta=ruta,
        paradaActual=parada_actual,
        paradaActualOrden=parada_actual_orden,
        proximaParada=proxima_parada,
        proximaParadaOrden=proxima_parada_orden,
    )


def list_turnos_hoy_admin(db: Session) -> list[TurnoAdminRead]:
    """Turno de hoy de TODOS los buses activos, para el monitoreo en vivo del admin."""
    asignaciones = db.scalars(
        select(AsignacionDiaria).where(AsignacionDiaria.fecha == date.today())
    ).all()

    resultado: list[TurnoAdminRead] = []
    for asignacion in asignaciones:
        turno = construir_turno_hoy(db, asignacion)
        conductor = db.get(Usuario, asignacion.idConductor)
        pendientes = db.scalar(
            select(func.count())
            .select_from(Alerta)
            .where(Alerta.idAsignacion == asignacion.idAsignacion, Alerta.atendida.is_(False))
        ) or 0
        ultimo = ultimo_checkin(db, asignacion.idAsignacion)
        minutos_en_tramo = (
            max(0, int((datetime.now() - ultimo.fechaHora).total_seconds() // 60))
            if ultimo is not None
            else None
        )
        resultado.append(
            TurnoAdminRead(
                **turno.model_dump(),
                conductorNombre=conductor.nombre if conductor else "",
                alertasPendientes=pendientes,
                minutosEnTramoActual=minutos_en_tramo,
            )
        )
    return resultado
