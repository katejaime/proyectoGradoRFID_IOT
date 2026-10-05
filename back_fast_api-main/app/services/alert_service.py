from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.alert import Alerta
from app.models.bus import Bus
from app.models.busStation import Parada
from app.models.keyringRfid import LlaveroRfid
from app.models.passenger import Pasajero
from app.models.rfidDetection import DeteccionRfid
from app.models.rfidReader import LectorRfid
from app.models.route import RutaParada
from app.models.routeCheckin import CheckinRuta
from app.models.schedule import AsignacionDiaria
from app.models.user import Usuario
from app.schemas.alert import (
    AlertaCreate,
    AlertaRead,
    AlertasEstadisticas,
    AlertasPage,
    EstadisticaPorBus,
    EstadisticaPorDia,
    EstadisticaPorParada,
)


def _ultimo_checkin(db: Session, id_asignacion: int) -> CheckinRuta | None:
    return db.scalar(
        select(CheckinRuta)
        .where(CheckinRuta.idAsignacion == id_asignacion)
        .order_by(CheckinRuta.orden.desc())
        .limit(1)
    )


def resolver_asignacion_de_deteccion(db: Session, deteccion: DeteccionRfid) -> AsignacionDiaria | None:
   
    lector = db.get(LectorRfid, deteccion.idLector)
    if lector is None:
        return None

    filas = db.execute(
        select(RutaParada.idRuta, RutaParada.orden)
        .where(RutaParada.idParada == lector.idParada)
        .order_by(RutaParada.orden)
    ).all()
    if not filas:
        return None
    orden_por_ruta: dict[int, int] = {}
    for fila in filas:
        orden_por_ruta.setdefault(fila.idRuta, fila.orden)

    asignaciones = db.scalars(
        select(AsignacionDiaria).where(
            AsignacionDiaria.idRuta.in_(orden_por_ruta.keys()),
            AsignacionDiaria.fecha == date.today(),
        )
    ).all()
    if not asignaciones:
        return None
    if len(asignaciones) == 1:
        return asignaciones[0]

    candidatos: list[tuple[int, AsignacionDiaria]] = []
    for asignacion in asignaciones:
        orden_parada = orden_por_ruta.get(asignacion.idRuta)
        if orden_parada is None:
            continue
        ultimo = _ultimo_checkin(db, asignacion.idAsignacion)
        orden_actual = ultimo.orden if ultimo is not None else 0
        if orden_actual > orden_parada:
            continue  # ese bus ya pasó esta parada
        candidatos.append((orden_actual, asignacion))

    if not candidatos:
        return None
    candidatos.sort(key=lambda par: par[0], reverse=True)
    return candidatos[0][1]


def _build_alerta_read(db: Session, alerta: Alerta) -> AlertaRead:
    data = {
        "idAlerta": alerta.idAlerta,
        "fechaHora": alerta.fechaHora,
        "estado": alerta.estado,
        "idDeteccion": alerta.idDeteccion,
        "atendida": alerta.atendida,
        "fechaAtencion": alerta.fechaAtencion,
        "tiempoEsperaSegundos": (
            int((alerta.fechaAtencion - alerta.fechaHora).total_seconds())
            if alerta.atendida and alerta.fechaAtencion
            else None
        ),
    }

    deteccion = db.get(DeteccionRfid, alerta.idDeteccion)
    if deteccion is None:
        return AlertaRead(**data)
    data["uidRfid"] = deteccion.uidRfid

    lector = db.get(LectorRfid, deteccion.idLector)
    if lector is not None:
        parada = db.get(Parada, lector.idParada)
        data["paradaNombre"] = parada.nombre if parada else None

    llavero = db.get(LlaveroRfid, deteccion.uidRfid)
    if llavero is not None and llavero.id_pasajero is not None:
        pasajero = db.get(Pasajero, llavero.id_pasajero)
        if pasajero is not None:
            data["pasajeroNombre"] = pasajero.nombre
            data["pasajeroTipoDiscapacidad"] = pasajero.tipo_discapacidad

    if alerta.idAsignacion is not None:
        asignacion = db.get(AsignacionDiaria, alerta.idAsignacion)
        if asignacion is not None:
            bus = db.get(Bus, asignacion.idBus)
            data["busPlaca"] = bus.placa if bus else None
            conductor = db.get(Usuario, asignacion.idConductor)
            data["conductorNombre"] = conductor.nombre if conductor else None

    return AlertaRead(**data)


def create_alerta(db: Session, alerta: AlertaCreate) -> AlertaRead:
    data = alerta.model_dump()
    data["fechaHora"] = data["fechaHora"] or datetime.now()
    db_alerta = Alerta(**data)
    db.add(db_alerta)
    db.commit()
    db.refresh(db_alerta)
    return _build_alerta_read(db, db_alerta)


def get_alerta(db: Session, alerta_id: int) -> AlertaRead | None:
    alerta = db.get(Alerta, alerta_id)
    return _build_alerta_read(db, alerta) if alerta else None


def _alertas_filtradas(
    db: Session,
    atendida: bool | None,
    id_bus: int | None,
    desde: date | None,
    hasta: date | None,
) -> list[Alerta]:
    query = select(Alerta)
    if atendida is not None:
        query = query.where(Alerta.atendida == atendida)
    if desde is not None:
        query = query.where(Alerta.fechaHora >= datetime.combine(desde, datetime.min.time()))
    if hasta is not None:
        query = query.where(Alerta.fechaHora < datetime.combine(hasta, datetime.min.time()) + timedelta(days=1))

    candidatas = db.scalars(query.order_by(Alerta.fechaHora.desc())).all()
    if id_bus is not None:
        candidatas = [a for a in candidatas if _bus_de_alerta(db, a) == id_bus]
    return candidatas


def list_alertas(
    db: Session,
    skip: int,
    limit: int,
    atendida: bool | None = None,
    id_bus: int | None = None,
    desde: date | None = None,
    hasta: date | None = None,
) -> AlertasPage:
    candidatas = _alertas_filtradas(db, atendida, id_bus, desde, hasta)
    total = len(candidatas)
    pagina = candidatas[skip : skip + limit]
    return AlertasPage(
        total=total,
        skip=skip,
        limit=limit,
        items=[_build_alerta_read(db, a) for a in pagina],
    )


def list_alertas_para_reporte(
    db: Session,
    atendida: bool | None = None,
    id_bus: int | None = None,
    desde: date | None = None,
    hasta: date | None = None,
    ids: list[int] | None = None,
) -> list[AlertaRead]:
    """Igual que list_alertas pero sin paginar — para generar reportes descargables.

    Si se pasa `ids`, el reporte se limita exactamente a esas alertas (selección manual
    del usuario) e ignora los demás filtros.
    """
    if ids is not None:
        candidatas = db.scalars(
            select(Alerta).where(Alerta.idAlerta.in_(ids)).order_by(Alerta.fechaHora.desc())
        ).all()
        return [_build_alerta_read(db, a) for a in candidatas]

    candidatas = _alertas_filtradas(db, atendida, id_bus, desde, hasta)
    return [_build_alerta_read(db, a) for a in candidatas]


def obtener_estadisticas(db: Session, desde: date | None, hasta: date | None) -> AlertasEstadisticas:
    """Agrega las alertas del rango de fechas para las gráficas del admin."""
    candidatas = _alertas_filtradas(db, atendida=None, id_bus=None, desde=desde, hasta=hasta)
    alertas = [_build_alerta_read(db, a) for a in candidatas]

    total = len(alertas)
    atendidas = sum(1 for a in alertas if a.atendida)

    por_dia: dict[str, int] = {}
    for alerta in alertas:
        clave = alerta.fechaHora.strftime("%Y-%m-%d")
        por_dia[clave] = por_dia.get(clave, 0) + 1

    espera_por_parada: dict[str, list[int]] = {}
    for alerta in alertas:
        if alerta.tiempoEsperaSegundos is None:
            continue
        clave = alerta.paradaNombre or "Desconocida"
        espera_por_parada.setdefault(clave, []).append(alerta.tiempoEsperaSegundos)

    por_bus: dict[str, int] = {}
    for alerta in alertas:
        clave = alerta.busPlaca or "Sin asignar"
        por_bus[clave] = por_bus.get(clave, 0) + 1

    return AlertasEstadisticas(
        totalAlertas=total,
        atendidas=atendidas,
        sinAtender=total - atendidas,
        porDia=[
            EstadisticaPorDia(fecha=fecha, cantidad=cantidad) for fecha, cantidad in sorted(por_dia.items())
        ],
        tiempoEsperaPromedioPorParada=[
            EstadisticaPorParada(
                parada=parada,
                promedioEsperaSegundos=sum(valores) / len(valores),
                cantidad=len(valores),
            )
            for parada, valores in sorted(
                espera_por_parada.items(), key=lambda item: -(sum(item[1]) / len(item[1]))
            )
        ],
        busesConMasAlertas=[
            EstadisticaPorBus(bus=bus, cantidad=cantidad)
            for bus, cantidad in sorted(por_bus.items(), key=lambda item: -item[1])[:10]
        ],
    )


def _bus_de_alerta(db: Session, alerta: Alerta) -> int | None:
    if alerta.idAsignacion is None:
        return None
    asignacion = db.get(AsignacionDiaria, alerta.idAsignacion)
    return asignacion.idBus if asignacion else None


def marcar_atendida(db: Session, alerta_id: int, id_asignacion: int) -> AlertaRead | None:
    alerta = db.get(Alerta, alerta_id)
    if alerta is None:
        return None
    if alerta.idAsignacion != id_asignacion:
        return None
    alerta.atendida = True
    alerta.fechaAtencion = datetime.now()
    db.commit()
    db.refresh(alerta)
    return _build_alerta_read(db, alerta)


def list_alertas_de_asignacion(
    db: Session, id_asignacion: int, skip: int, limit: int, atendida: bool | None
) -> AlertasPage:
    asignacion = db.get(AsignacionDiaria, id_asignacion)
    if asignacion is None:
        return AlertasPage(total=0, skip=skip, limit=limit, items=[])

    query = select(Alerta)
    if atendida is not None:
        query = query.where(Alerta.atendida == atendida)
    candidatas = db.scalars(query.order_by(Alerta.fechaHora.desc())).all()
    de_mi_turno = [a for a in candidatas if _bus_de_alerta(db, a) == asignacion.idBus]

    total = len(de_mi_turno)
    pagina = de_mi_turno[skip : skip + limit]
    return AlertasPage(
        total=total,
        skip=skip,
        limit=limit,
        items=[_build_alerta_read(db, a) for a in pagina],
    )
