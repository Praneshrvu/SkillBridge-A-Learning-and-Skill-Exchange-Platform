import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "SkillBridge - Peer-to-Peer Skill Sharing & Mentorship Platform"
    PROJECT_DESCRIPTION: str = (
        "SkillBridge is an enterprise-grade RESTful platform connecting learners and mentors. "
        "Supports skill-for-skill barter (e.g., C++ for Java), paid tutoring, anonymous/confidential "
        "profiles, company training interview question banks, and direct company mentor Q&A."
    )
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = "super-secret-skillbridge-jwt-token-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database configuration
    DATABASE_URL: str = "mysql+pymysql://root:root@localhost:3306/skillbridge_db"
    FALLBACK_TO_SQLITE: bool = True
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
