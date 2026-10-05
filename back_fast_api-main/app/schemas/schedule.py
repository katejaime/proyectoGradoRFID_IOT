from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.route import RutaRead


class AsignacionCreate(BaseModel):
    fecha: date
    idBus: int
    idRuta: int
    idConductor: int


class AsignacionUpdate(BaseModel):
    fecha: date | None = Field(default=None)
    idBus: int | None = Field(default=None)
    idRuta: int | None = Field(default=None)
    idConductor: int | None = Field(default=None)


class AsignacionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    idAsignacion: int
    fecha: date
    idBus: int
    idRuta: int
    idConductor: int


class AsignacionesPage(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[AsignacionRead]


class TurnoHoyRead(BaseModel):
    idAsignacion: int
    fecha: date
    busPlaca: str
    busEstado: str
    ruta: RutaRead
    paradaActual: str | None
    paradaActualOrden: int | None
    proximaParada: str | None
    proximaParadaOrden: int | None


class TurnoAdminRead(TurnoHoyRead):
    conductorNombre: str
    alertasPendientes: int
    minutosEnTramoActual: int | None
