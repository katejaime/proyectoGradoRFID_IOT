from pydantic import BaseModel, ConfigDict, Field


class LectorRfidCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    estado: str = Field(default="activo", min_length=1, max_length=20)
    idParada: int


class LectorRfidUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    estado: str | None = Field(default=None, min_length=1, max_length=20)
    idParada: int | None = Field(default=None)


class LectorRfidRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    idLector: int
    nombre: str
    estado: str
    idParada: int


class LectorRfidsPage(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[LectorRfidRead]
