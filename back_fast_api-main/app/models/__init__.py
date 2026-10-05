"""Modelos de persistencia."""

from app.models.alert import Alerta
from app.models.bus import Bus
from app.models.busStation import Parada
from app.models.keyringRfid import LlaveroRfid
from app.models.passenger import Pasajero
from app.models.rfidDetection import DeteccionRfid
from app.models.rfidReader import LectorRfid
from app.models.route import Ruta, RutaParada
from app.models.routeCheckin import CheckinRuta
from app.models.schedule import AsignacionDiaria
from app.models.user import Usuario, UserRole


__all__ = [
    "Pasajero",
    "Usuario",
    "UserRole",
    "LlaveroRfid",
    "Parada",
    "LectorRfid",
    "Bus",
    "DeteccionRfid",
    "Alerta",
    "Ruta",
    "RutaParada",
    "AsignacionDiaria",
    "CheckinRuta",
]
