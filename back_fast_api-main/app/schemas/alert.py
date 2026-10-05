from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AlertaCreate(BaseModel):
    idDeteccion: int
    fechaHora: datetime | None = Field(default=None)
    estado: str = Field(default="activo", min_length=1, max_length=20)
    idAsignacion: int | None = Field(default=None)


class AlertaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    idAlerta: int
    fechaHora: datetime
    estado: str
    idDeteccion: int
    atendida: bool
    fechaAtencion: datetime | None
    tiempoEsperaSegundos: int | None = None
    uidRfid: str | None = None
    pasajeroNombre: str | None = None
    pasajeroTipoDiscapacidad: str | None = None
    paradaNombre: str | None = None
    busPlaca: str | None = None
    conductorNombre: str | None = None


class AlertasPage(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[AlertaRead]


class EstadisticaPorDia(BaseModel):
    fecha: str
    cantidad: int


class EstadisticaPorParada(BaseModel):
    parada: str
    promedioEsperaSegundos: float
    cantidad: int


class EstadisticaPorBus(BaseModel):
    bus: str
    cantidad: int


class AlertasEstadisticas(BaseModel):
    totalAlertas: int
    atendidas: int
    sinAtender: int
    porDia: list[EstadisticaPorDia]
    tiempoEsperaPromedioPorParada: list[EstadisticaPorParada]
    busesConMasAlertas: list[EstadisticaPorBus]
