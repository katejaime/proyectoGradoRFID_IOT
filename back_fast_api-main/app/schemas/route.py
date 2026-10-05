from pydantic import BaseModel, ConfigDict, Field


class RutaCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    estado: str = Field(default="activo", min_length=1, max_length=20)
    paradaIds: list[int] = Field(default_factory=list)


class RutaUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    estado: str | None = Field(default=None, min_length=1, max_length=20)
    paradaIds: list[int] | None = Field(default=None)


class RutaParadaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    idParada: int
    nombre: str
    orden: int


class RutaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    idRuta: int
    nombre: str
    estado: str
    paradas: list[RutaParadaRead]


class RutasPage(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[RutaRead]
