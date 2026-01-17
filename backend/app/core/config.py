"""
Application configuration management using Pydantic Settings.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    DATABASE_URL: str
    
    # JWT Authentication
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    # SharePoint
    SHAREPOINT_CLIENT_ID: str = ""
    SHAREPOINT_CLIENT_SECRET: str = ""
    SHAREPOINT_TENANT_ID: str = ""
    SHAREPOINT_SITE_URL: str = ""

    # Keycloak
    KEYCLOAK_URL: str = ""
    KEYCLOAK_REALM: str = ""
    KEYCLOAK_CLIENT_ID: str = ""
    KEYCLOAK_CLIENT_SECRET: str = ""
    
    # Application
    APP_NAME: str = "ITIL CMDB Dashboard"
    DEBUG: bool = True
    GEMINI_API_KEY: str = ""
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Convert CORS origins string to list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
