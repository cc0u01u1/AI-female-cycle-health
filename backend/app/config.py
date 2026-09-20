"""应用配置：所有配置项通过环境变量 / .env 读取。

API Key 只允许存在于后端 .env 中，禁止写入前端代码或版本库。
"""
from functools import lru_cache

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    request_timeout: float = 30.0

    allowed_origins: str = "http://localhost:5173"

    # 本地联调 Mock 开关：不调用 DeepSeek，返回固定结构化内容
    enable_mock: bool = False

    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    def has_api_key(self) -> bool:
        return bool(self.deepseek_api_key.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
