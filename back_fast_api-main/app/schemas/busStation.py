from pydantic import BaseModel, ConfigDict, Field


class ParadaCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    estado: str = Field(default="activo", min_length=1, max_length=20)


class ParadaUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    estado: str | None = Field(default=None, min_length=1, max_length=20)


class ParadaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    idParada: int
    nombre: str
    estado: str


class ParadasPage(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[ParadaRead]
