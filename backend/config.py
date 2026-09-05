from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    FRONTEND_HOST: str
    GEMINI_MODEL: str
    GEMINI_API_KEY: str
    GEMINI_RESPONSE_TIMEOUT: float

    model_config = SettingsConfigDict(env_file=".env")

@lru_cache
def get_settings() -> Settings:
    return Settings()