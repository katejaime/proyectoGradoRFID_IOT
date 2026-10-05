from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    correo: EmailStr
    password: str = Field(min_length=8, max_length=128)
    rol: UserRole


class UserUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    correo: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
    rol: UserRole | None = None
    estado: bool | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    correo: EmailStr
    rol: UserRole
    estado: bool


class UsersPage(BaseModel):
    total: int
    skip: int
    limit: int
    items: list[UserRead]
