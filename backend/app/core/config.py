import os
import secrets
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union

_RUNTIME_EPHEMERAL_JWT_KEY = secrets.token_urlsafe(32)


class Settings(BaseSettings):
    PROJECT_NAME: str = "Crisis Response Intelligence System (CRIS)"
    PROJECT_DESCRIPTION: str = (
        "Academic Emergency Decision-Support Platform for Incident Prioritization "
        "and Resource Allocation. Decision Support Only • Simulated Data."
    )
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"
    APP_ENV: str = os.getenv("APP_ENV", "development")

    # Database Configuration (PostgreSQL + PostGIS primary, SQLite fallback)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./crisis_response.db",
    )

    # JWT Security Configuration (never hardcoded; set JWT_SECRET_KEY in .env for persistent tokens)
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY") or _RUNTIME_EPHEMERAL_JWT_KEY
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

    # CORS Origins (explicit allowlist; no wildcard when allow_credentials=True)
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:80",
        "http://localhost",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Demonstration Default Weights
    DEFAULT_WEIGHT_SEVERITY: float = 0.30
    DEFAULT_WEIGHT_IMPACT: float = 0.25
    DEFAULT_WEIGHT_URGENCY: float = 0.20
    DEFAULT_WEIGHT_VULNERABILITY: float = 0.15
    DEFAULT_WEIGHT_ACCESSIBILITY: float = 0.10

    # Bounding Box for Bengaluru demo coordinate validation & warnings
    BLR_MIN_LAT: float = 12.70
    BLR_MAX_LAT: float = 13.30
    BLR_MIN_LON: float = 77.30
    BLR_MAX_LON: float = 77.90

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="allow",
    )


settings = Settings()
