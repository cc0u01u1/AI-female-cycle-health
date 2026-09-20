"""她周期 FastAPI 后端入口。

- CORS 白名单来自 ALLOWED_ORIGINS 环境变量，不默认开放所有来源
- 统一错误响应：{"message": "..."}，不暴露内部堆栈与 API Key
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import settings
from .routers import ai

logger = logging.getLogger("hercycle")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.enable_mock:
        logger.warning("ENABLE_MOCK=true：AI 接口返回本地 Mock 数据，仅用于联调。")
    if not settings.has_api_key() and not settings.enable_mock:
        logger.warning("DEEPSEEK_API_KEY 未配置：AI 接口将返回 503。")
    yield


app = FastAPI(
    title="她周期 API",
    description="健康管理工具后端：AI 健康信息辅助（非医疗诊断）。",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS：白名单机制，禁止默认 allow_origins=["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(ai.router)


@app.get("/api/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/health/ai", tags=["meta"])
async def health_ai() -> dict[str, bool]:
    """AI 服务可用性。

    enabled=true 表示发起 analyze 可以得到结果（已配置 Key 或启用 Mock）。
    注意：绝不返回 API Key、Key 长度或前缀等任何敏感信息。
    """
    return {
        "enabled": settings.enable_mock or settings.has_api_key(),
        "mock": settings.enable_mock,
    }


# ===== 统一错误响应：{"message": "..."} =====


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"message": str(exc.detail)})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"message": "请求参数错误，请检查后重试。"})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"message": "服务器内部错误，请稍后再试。"})
