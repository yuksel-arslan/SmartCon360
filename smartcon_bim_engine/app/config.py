"""Configuration for the BIM Intelligence Engine.

All settings are loaded from environment variables with sensible defaults.
No external API calls required for v1.
"""

from __future__ import annotations

import os
from pathlib import Path


class BIMEngineConfig:
    """Application configuration loaded from environment variables."""

    HOST: str = os.environ.get("BIM_ENGINE_HOST", "0.0.0.0")
    PORT: int = int(os.environ.get("BIM_ENGINE_PORT", "8005"))
    DEBUG: bool = os.environ.get("BIM_ENGINE_DEBUG", "false").lower() == "true"

    LOG_LEVEL: str = os.environ.get("BIM_ENGINE_LOG_LEVEL", "INFO")
    LOG_FORMAT: str = "%(asctime)s | %(name)-30s | %(levelname)-7s | %(message)s"

    UPLOAD_DIR: Path = Path(os.environ.get(
        "BIM_ENGINE_UPLOAD_DIR",
        str(Path(__file__).parent.parent / "uploads"),
    ))
    MAX_UPLOAD_SIZE_MB: int = int(os.environ.get("BIM_ENGINE_MAX_UPLOAD_MB", "500"))

    MAPPINGS_DIR: Path = Path(os.environ.get(
        "BIM_ENGINE_MAPPINGS_DIR",
        str(Path(__file__).parent.parent / "mappings"),
    ))

    UNICLASS_FILE: Path = MAPPINGS_DIR / "uniclass.json"
    OMNICLASS_FILE: Path = MAPPINGS_DIR / "omniclass.json"

    CURRENCY: str = os.environ.get("BIM_ENGINE_CURRENCY", "USD")

    CORS_ORIGINS: list[str] = os.environ.get(
        "BIM_ENGINE_CORS_ORIGINS", "*"
    ).split(",")

    @classmethod
    def ensure_directories(cls) -> None:
        """Create required directories if they don't exist."""
        cls.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    @classmethod
    def to_dict(cls) -> dict:
        return {
            "host": cls.HOST,
            "port": cls.PORT,
            "debug": cls.DEBUG,
            "log_level": cls.LOG_LEVEL,
            "upload_dir": str(cls.UPLOAD_DIR),
            "max_upload_size_mb": cls.MAX_UPLOAD_SIZE_MB,
            "mappings_dir": str(cls.MAPPINGS_DIR),
            "currency": cls.CURRENCY,
        }
