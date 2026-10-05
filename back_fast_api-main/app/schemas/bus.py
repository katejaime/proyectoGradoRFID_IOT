from pydantic import BaseModel, ConfigDict, Field


class BusCreate(BaseModel):
    placa: str = Field(min_length=1, max_length=10)
    estado: str = Field(default="activo", min_length=1, max_length=20)


class BusUpdate(BaseModel):
    placa: str | None = Field(default=None, min_length=1, max_length=10)
    estado: str | None = Field(default=None, min_length=1, max_length=20)


class BusRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    idBus: int
    placa: str
    estado: str


class BusesPage(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[BusRead]
