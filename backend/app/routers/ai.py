"""AI 健康信息辅助接口。

路由只做参数接收与异常转 HTTP 状态码，AI 逻辑全部在 service 层。
"""
from fastapi import APIRouter, HTTPException, status

from ..schemas.ai import AIAnalyzeRequest, AIAnalyzeResponse
from ..services import ai_service
from ..services.ai_service import AIServiceError

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post(
    "/analyze",
    response_model=AIAnalyzeResponse,
    summary="基于用户周期与健康记录返回健康信息辅助内容（非医疗诊断）",
)
async def analyze(req: AIAnalyzeRequest) -> AIAnalyzeResponse:
    try:
        return await ai_service.analyze(req)
    except AIServiceError as exc:
        # 统一 503：面向用户的友好信息（main.py 中会转成 {"message": ...}）
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
