from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DeteccionRfidCreate(BaseModel):
    uidRfid: str = Field(min_length=1, max_length=50)
    idLector: int
    fechaHora: datetime | None = Field(default=None)
    estado: str = Field(default="activo", min_length=1, max_length=20)


class DeteccionRfidRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    idDeteccion: int
    fechaHora: datetime
    uidRfid: str
    estado: str
    idLector: int


class DeteccionRfidsPage(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[DeteccionRfidRead]
