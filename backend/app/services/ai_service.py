"""DeepSeek AI 健康信息辅助服务。

职责：构造 Prompt → 调用 DeepSeek → 解析并校验 JSON → 异常处理。
不包含任何 FastAPI 路由逻辑。

安全边界：本服务仅做健康信息辅助，不做疾病诊断 / 处方 / 准确性保证。
"""
import json
import re
from typing import Any

import httpx
from pydantic import ValidationError

from ..config import settings
from ..schemas.ai import AIAnalyzeRequest, AIAnalyzeResponse

SYSTEM_PROMPT = """你是一名健康信息辅助助手。

你不是医生，不能进行疾病诊断、医疗诊断或处方推荐。

你的任务是：
1. 根据用户提供的周期和健康记录进行信息整理
2. 总结可能存在的记录趋势
3. 提供一般性的生活方式建议
4. 对需要专业医疗帮助的情况进行合理提醒

禁止：
- 诊断疾病
- 判断用户患有某种疾病
- 推荐处方药
- 保证预测结果
- 编造用户没有提供的数据
- 把周期日期估算描述成医学确定结论

所有周期阶段（经期/卵泡期/排卵期附近/黄体期）均属于日期算法估算，不代表医学判断。

如果数据不足，必须明确说明数据不足，不要虚构趋势或结论。

如果用户出现严重、持续或异常症状，建议用户咨询专业医疗人员。

回答必须完全基于用户提供的数据。

你必须严格按以下 JSON 格式返回，不要返回任何 Markdown、代码块标记或多余文本：
{
  "summary": "简短总结（数据不足时说明数据不足，不超过 100 字）",
  "observations": ["观察1", "观察2"],
  "suggestions": ["建议1", "建议2"],
  "disclaimer": "以上内容仅用于健康信息参考，不构成医疗诊断或治疗建议。"
}"""


class AIServiceError(Exception):
    """AI 服务异常，message 面向用户展示，不暴露内部堆栈。"""


class APIKeyMissingError(AIServiceError):
    """API Key 未配置。"""


def _build_user_prompt(req: AIAnalyzeRequest) -> str:
    """把用户数据压缩为紧凑 JSON，控制 Token 用量。"""
    payload: dict[str, Any] = {
        "cycle": req.cycle.model_dump(),
        "recentRecords": [r.model_dump() for r in req.recentRecords],
        "recentPeriods": [p.model_dump() for p in req.recentPeriods],
    }
    return (
        "以下是用户记录的周期与健康数据（JSON），请基于这些数据给出分析：\n"
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    )


def _extract_json(text: str) -> dict[str, Any]:
    """从模型返回文本中提取 JSON（容忍代码块包裹）。"""
    cleaned = text.strip()
    # 去掉 ```json ... ``` 包裹
    fence = re.search(r"```(?:json)?\s*(.*?)\s*```", cleaned, re.DOTALL)
    if fence:
        cleaned = fence.group(1).strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        # 退一步：截取第一个 { 到最后一个 }
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise AIServiceError("AI 返回内容格式异常，请重新尝试。")
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise AIServiceError("AI 返回内容格式异常，请重新尝试。") from exc
    if not isinstance(data, dict):
        raise AIServiceError("AI 返回内容格式异常，请重新尝试。")
    return data


def _mock_response(req: AIAnalyzeRequest) -> AIAnalyzeResponse:
    """本地联调 Mock（ENABLE_MOCK=true 时使用，不调用 DeepSeek）。"""
    n = len(req.recentRecords)
    pain_records = sum(1 for r in req.recentRecords if r.painLevel >= 3)
    return AIAnalyzeResponse(
        summary=(
            f"当前为周期第 {req.cycle.cycleDay} 天（{req.cycle.phase} 阶段），"
            f"近期共 {n} 条记录，其中 {pain_records} 天疼痛等级达到 3 级或以上。"
        ),
        observations=[
            f"最近 {n} 条记录已纳入分析。" if n else "近期暂无健康记录。",
            f"周期数据基于历史记录估算，当前阶段为 {req.cycle.phase}。",
        ],
        suggestions=[
            "保持规律作息与充足睡眠。",
            "如出现持续或明显异常的身体不适，建议咨询专业医疗人员。",
        ],
        disclaimer="以上内容仅用于健康信息参考，不构成医疗诊断或治疗建议。",
    )


async def analyze(req: AIAnalyzeRequest) -> AIAnalyzeResponse:
    """调用 DeepSeek 分析用户数据，返回结构化结果。"""
    if settings.enable_mock:
        return _mock_response(req)

    if not settings.has_api_key():
        raise APIKeyMissingError("AI 服务尚未配置，请先在后端 .env 中配置 DEEPSEEK_API_KEY。")

    url = f"{settings.deepseek_base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.deepseek_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": settings.deepseek_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_prompt(req)},
        ],
        "temperature": 0.7,
        "response_format": {"type": "json_object"},
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            resp = await client.post(url, headers=headers, json=body)
    except httpx.TimeoutException as exc:
        raise AIServiceError("AI 服务响应超时，请稍后再试。") from exc
    except httpx.HTTPError as exc:
        raise AIServiceError("暂时无法连接 AI 服务，请检查网络后重试。") from exc

    if resp.status_code == 401:
        raise AIServiceError("AI 服务认证失败，请检查 API Key 配置。")
    if resp.status_code != 200:
        # 不把上游错误体透传给前端
        raise AIServiceError("AI 服务暂时不可用，请稍后再试。")

    try:
        content: str = resp.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, ValueError) as exc:
        raise AIServiceError("AI 服务返回数据异常，请稍后再试。") from exc

    data = _extract_json(content)
    try:
        return AIAnalyzeResponse(**data)
    except ValidationError as exc:
        raise AIServiceError("AI 返回内容格式异常，请重新尝试。") from exc
