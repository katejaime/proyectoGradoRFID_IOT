from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración cargada desde variables de entorno y el archivo .env."""

    project_name: str = "Mi Proyecto FastAPI"
    environment: str = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    secret_key: str
    access_token_expire_minutes: int = 30
    algorithm: str = "HS256"
    database_url: str

    rabbitmq_url: str = "amqp://user:1234@localhost:5672/"
    rabbitmq_exchange: str = "personas_discapacidad"
    rabbitmq_routing_key: str = "parada.#"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
