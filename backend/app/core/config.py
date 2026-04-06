from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str
    VERSION: str
    API_V1_STR: str
    SECRET_KEY: str
    DATABASE_URL: str
    
    # Khai báo thêm dòng này để nhận biến từ file .env
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    ADMIN_DEFAULT_PHONE: str
    ADMIN_DEFAULT_PASSWORD: str
    # Đọc cấu hình từ file .env
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()