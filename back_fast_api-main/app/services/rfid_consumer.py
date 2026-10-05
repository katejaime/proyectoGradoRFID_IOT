
import asyncio
import json
import logging
from datetime import datetime

import aio_pika
from aio_pika.abc import AbstractIncomingMessage

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.keyringRfid import LlaveroRfid
from app.models.passenger import Pasajero
from app.models.rfidDetection import DeteccionRfid
from app.schemas.alert import AlertaCreate
from app.schemas.rfidDetection import DeteccionRfidCreate
from app.services.alert_service import create_alerta, resolver_asignacion_de_deteccion
from app.services.rfidDetection_service import create_deteccion
from app.services.ws_manager import manager

logger = logging.getLogger("rfid_consumer")

CONSUMER_QUEUE_NAME = "backend_alertas_rfid"

# Estado con el que se guarda una deteccion cuyo UID no corresponde a ningun llavero registrado.
ESTADO_NO_REGISTRADO = "no_registrado"


def _resolver_pasajero(db, uid_rfid: str) -> Pasajero | None:
    """Busca en la base real el pasajero dueno del llavero. Solo lectura."""
    llavero = db.get(LlaveroRfid, uid_rfid)
    if llavero is None:
        return None
    return db.get(Pasajero, llavero.id_pasajero)


def _guardar_deteccion(uid_rfid: str, id_lector: int) -> tuple[int, dict] | None:

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with SessionLocal() as db:
        pasajero = _resolver_pasajero(db, uid_rfid)
        try:
            datos = DeteccionRfidCreate(uidRfid=uid_rfid, idLector=id_lector)
            if pasajero is None:
                datos.estado = ESTADO_NO_REGISTRADO
            deteccion = create_deteccion(db, datos)
        except Exception as exc:
            print(f"[{timestamp}] No se pudo guardar deteccion uid={uid_rfid} lector={id_lector}: {exc}")
            return None

        if pasajero is None:
            print(
                f"\n[{timestamp}] UID NO REGISTRADO: {uid_rfid}\n"
                f"    El llavero no esta registrado en el sistema; no se genera alerta.\n"
                f"    Deteccion guardada (idDeteccion={deteccion.idDeteccion}, estado={ESTADO_NO_REGISTRADO})\n"
                f"    Lector: {id_lector}\n"
            )
            return None

        deteccion_orm = db.get(DeteccionRfid, deteccion.idDeteccion)
        asignacion = resolver_asignacion_de_deteccion(db, deteccion_orm) if deteccion_orm else None

        try:
            alerta = create_alerta(
                db,
                AlertaCreate(
                    idDeteccion=deteccion.idDeteccion,
                    idAsignacion=asignacion.idAsignacion if asignacion else None,
                ),
            )
        except Exception as exc:
            print(f"[{timestamp}] Deteccion guardada pero fallo la alerta (idDeteccion={deteccion.idDeteccion}): {exc}")
            return None

        print(
            f"\n[{timestamp}] ALERTA DE ACCESIBILIDAD (idAlerta={alerta.idAlerta})\n"
            f"    RFID: {uid_rfid}\n"
            f"    Persona: {pasajero.nombre}\n"
            f"    Discapacidad: {pasajero.tipo_discapacidad}\n"
            f"    Lector: {id_lector}\n"
        )

        if asignacion is None:
            return None
        return asignacion.idConductor, alerta.model_dump(mode="json")


async def _handle_message(message: AbstractIncomingMessage) -> None:
    async with message.process():
        try:
            payload = json.loads(message.body.decode())
            uid_rfid = str(payload["uidRfid"])
            id_lector = int(payload["idLector"])
        except (json.JSONDecodeError, UnicodeDecodeError, KeyError, TypeError, ValueError):
            print(f"Mensaje RFID no interpretable (se espera uidRfid + idLector): {message.body!r}")
            return

        resultado = await asyncio.to_thread(_guardar_deteccion, uid_rfid, id_lector)
        if resultado is not None:
            id_conductor, alerta = resultado
            await manager.send_to_conductor(id_conductor, {"tipo": "alerta_nueva", "alerta": alerta})


async def consume_rfid_detections(stop_event: asyncio.Event) -> None:
    """Escucha el exchange de RFID y reintenta la conexion si RabbitMQ no esta disponible."""
    while not stop_event.is_set():
        try:
            connection = await aio_pika.connect_robust(settings.rabbitmq_url)
            async with connection:
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=10)

                exchange = await channel.declare_exchange(
                    settings.rabbitmq_exchange, aio_pika.ExchangeType.TOPIC, durable=True
                )
                queue = await channel.declare_queue(CONSUMER_QUEUE_NAME, durable=True)
                await queue.bind(exchange, routing_key=settings.rabbitmq_routing_key)

                print(
                    f"[rfid_consumer] Conectado a RabbitMQ; escuchando "
                    f"exchange='{settings.rabbitmq_exchange}' routing_key='{settings.rabbitmq_routing_key}'"
                )
                await queue.consume(_handle_message)
                await stop_event.wait()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning("[rfid_consumer] conexion RabbitMQ perdida (%s); reintentando en 5s", exc)
            await asyncio.sleep(5)
