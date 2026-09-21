"""System settings and environment variable loading."""
import os
from pathlib import Path
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load local .env if present
env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings(BaseModel):
    """Application runtime settings."""

    app_name: str = "AI Change Impact Engine - Intelligence Service"
    app_version: str = "1.0.0"
    debug: bool = Field(default_factory=lambda: os.getenv("DEBUG", "false").lower() == "true")
    host: str = Field(default_factory=lambda: os.getenv("HOST", "0.0.0.0"))
    port: int = Field(default_factory=lambda: int(os.getenv("PORT", os.getenv("INTELLIGENCE_SERVICE_PORT", "8000"))))
    
    # Storage & Mongo
    mongo_uri: str = Field(default_factory=lambda: os.getenv("MONGO_URI", "mongodb://localhost:27017/change_impact_engine"))
    
    # LLM Settings
    gemini_api_key: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    
    # Workspaces and ephemeral clone path
    workspaces_dir: str = Field(
        default_factory=lambda: os.getenv(
            "WORKSPACES_DIR", 
            str(Path(__file__).resolve().parent.parent.parent / "temp_workspaces")
        )
    )


settings = Settings()
