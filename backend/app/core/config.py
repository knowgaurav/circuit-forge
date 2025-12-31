"""Application configuration using Pydantic Settings."""


from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "CircuitForge"
    debug: bool = False
    log_level: str = "INFO"

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "circuitforge"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Session
    session_expiry_hours: int = 24
    session_code_length: int = 6

    # Rate limiting
    rate_limit_actions_per_minute: int = 100

    # LLM Configuration (supports OpenAI-compatible APIs like ohmygpt.com)
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.ohmygpt.com/v1/chat/completions"
    openai_model: str = "gpt-4o"
    openai_max_tokens: int = 4000
    openai_temperature: float = 0.7


settings = Settings()
