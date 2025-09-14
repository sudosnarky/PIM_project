"""
Configuration settings for the PARA InfoSystem API.

This module centralizes all configuration values and provides 
environment-specific settings for development, testing, and production.
"""
import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings using Pydantic for validation and environment variable support.
    
    Attributes:
        app_name: Application title
        version: API version
        debug: Debug mode flag
        database_url: SQLite database path
        secret_key: Secret key for token generation
        token_expire_hours: Token expiration time in hours
        cors_origins: Allowed CORS origins
        max_username_length: Maximum username length
        max_password_length: Maximum password length
        max_title_length: Maximum particle title length
        max_content_length: Maximum particle content length
        max_tags_per_particle: Maximum number of tags per particle
        max_tag_length: Maximum tag length
    """
    
    # Application Settings
    app_name: str = "PARA InfoSystem API"
    version: str = "1.0.0"
    debug: bool = False
    
    # Database Settings
    database_url: str = "pim.db"
    database_timeout: float = 30.0
    
    # Security Settings
    secret_key: str = "your-secret-key-change-in-production"
    token_expire_hours: int = 24
    password_hash_schemes: List[str] = ["bcrypt"]
    
    # CORS Settings
    cors_origins: List[str] = [
        "https://pim-project.onrender.com",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    # Validation Settings
    min_username_length: int = 3
    max_username_length: int = 50
    min_password_length: int = 6
    max_password_length: int = 100
    max_title_length: int = 255
    max_content_length: int = 10000
    max_tags_per_particle: int = 10
    max_tag_length: int = 50
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()