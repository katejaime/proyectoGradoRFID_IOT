from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import date

class KeyringRfidCreate(BaseModel):
    uidRfid: str = Field(min_length=1, max_length=50)
    estado: str = Field(default="activo", min_length=1, max_length=20)
    fechaAsignacion: date | None = Field(default=None)
    id_pasajero: int = Field(gt=0)


class KeyringRfidUpdate(BaseModel):
    estado:str | None = Field (default = None, min_length=1, max_length=20)
    fechaAsignacion: date|None=Field(default=None)
    id_pasajero: int | None = Field(default=None, gt=0)

    @field_validator("id_pasajero")
    @classmethod
    def id_pasajero_no_nulo(cls, value: int | None) -> int:
        # Se puede omitir al editar, pero no enviarse en null para dejar el llavero sin dueño.
        if value is None:
            raise ValueError("El llavero debe estar asociado a un pasajero")
        return value

class KeyringRfidRead(BaseModel):
    model_config=ConfigDict(from_attributes=True)
    uidRfid: str
    estado: str
    fechaAsignacion: date|None
    id_pasajero: int

class KeyringRfidsPage(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[KeyringRfidRead]