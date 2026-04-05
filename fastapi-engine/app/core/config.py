from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEBUG: bool = True

    # DB
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/grooveai"
    REDIS_URL: str = "redis://localhost:6379"

    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str = "password"

    # JWT — shared with node-api to validate tokens issued there
    JWT_SECRET: str = "changeme_jwt_secret"

    # Gemini (Google)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-pro"
    
    # Hugging Face
    HF_TOKEN: str = ""
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIMENSION: int = 384

    # Grok (Groq Inference)
    GROK_API_KEY: str = ""
    GROK_MODEL: str = "llama-3.3-70b-versatile"

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"

    # FAISS / Repos
    FAISS_INDEX_PATH: str = "./data/faiss_index"
    REPOS_BASE_DIR: str = "./data/repos"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5000"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
