from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

# Obligatorio: el sistema es para personas con discapacidad. Se recortan espacios
# para que "   " no cuente como un valor.
TipoDiscapacidad = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]


class PassengerCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    tipo_discapacidad: TipoDiscapacidad
    telefono: str = Field(min_length=7, max_length=15)
    estado: str = Field(default="activo", min_length=1, max_length=20)


class PassengerUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    tipo_discapacidad: TipoDiscapacidad | None = None
    telefono: str | None = Field(default=None, min_length=7, max_length=15)
    estado: str | None = Field(default=None, min_length=1, max_length=20)

    @field_validator("tipo_discapacidad")
    @classmethod
    def tipo_discapacidad_no_nulo(cls, value: str | None) -> str:
        # Se puede omitir al editar, pero no enviarse en null para borrarlo.
        if value is None:
            raise ValueError("El tipo de discapacidad es obligatorio")
        return value


class PassengerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_pasajero: int
    nombre: str
    tipo_discapacidad: str
    telefono: str
    estado: str


class PassengersPage(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[PassengerRead]
