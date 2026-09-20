"""AI 分析接口的请求 / 响应模型（严格类型，不用 Dict[str, Any]）。"""
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"

CyclePhase = Literal["menstrual", "follicular", "ovulation", "luteal"]


class CycleContext(BaseModel):
    """当前周期上下文（估算值，非医学判断）"""

    cycleDay: int = Field(ge=1, le=200, description="当前周期日 Day N")
    cycleLength: int = Field(ge=15, le=60, description="平均周期长度（天）")
    phase: CyclePhase = Field(description="当前阶段（估算）")


class HealthRecordInput(BaseModel):
    """单条健康记录（仅传必要字段，控制 Token）"""

    date: str = Field(pattern=DATE_PATTERN)
    painLevel: int = Field(ge=0, le=5)
    mood: str = Field(min_length=1, max_length=20)
    sleepHours: float = Field(ge=0, le=24)
    bodyStatus: List[str] = Field(default_factory=list, max_length=10)
    note: str = Field(default="", max_length=300)


class RecentPeriodInput(BaseModel):
    """最近一次经期（进行中时 endDate 为空）"""

    startDate: str = Field(pattern=DATE_PATTERN)
    endDate: Optional[str] = Field(default=None, pattern=DATE_PATTERN)


class AIAnalyzeRequest(BaseModel):
    """POST /api/ai/analyze 请求体"""

    cycle: CycleContext
    recentRecords: List[HealthRecordInput] = Field(default_factory=list, max_length=30)
    recentPeriods: List[RecentPeriodInput] = Field(default_factory=list, max_length=6)


class AIAnalyzeResponse(BaseModel):
    """POST /api/ai/analyze 响应体"""

    summary: str = Field(min_length=1, max_length=500)
    observations: List[str] = Field(default_factory=list, max_length=10)
    suggestions: List[str] = Field(default_factory=list, max_length=10)
    disclaimer: str = Field(min_length=1, max_length=300)


class ErrorResponse(BaseModel):
    """统一错误响应"""

    message: str
