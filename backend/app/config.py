import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    secret_key: str
    upload_dir: str
    frontend_origin: str
    max_upload_mb: int


def get_settings() -> Settings:
    return Settings(
        database_url=os.environ.get("DATABASE_URL", "sqlite:///./dev.db"),
        secret_key=os.environ.get("SECRET_KEY", ""),
        upload_dir=os.environ.get("UPLOAD_DIR", "./uploads"),
        frontend_origin=os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173"),
        max_upload_mb=int(os.environ.get("MAX_UPLOAD_MB", "5")),
    )
