# 她周期 Backend（FastAPI + DeepSeek）

健康管理工具后端，仅提供 AI 健康信息辅助接口。**不是医疗产品**：AI 输出不构成医疗诊断或治疗建议。

## 目录结构

```
backend/
├── app/
│   ├── main.py              # FastAPI 入口、CORS、统一错误响应
│   ├── config.py            # 环境变量配置（.env）
│   ├── routers/ai.py        # POST /api/ai/analyze
│   ├── services/ai_service.py  # Prompt 构造 + DeepSeek 调用 + JSON 校验
│   └── schemas/ai.py        # Pydantic 请求/响应模型
├── requirements.txt
└── .env.example
```

## 启动

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt

copy .env.example .env   # Windows
# 然后在 .env 中填写 DEEPSEEK_API_KEY=sk-...

uvicorn app.main:app --reload --port 8000
```

- 接口文档：<http://localhost:8000/docs>
- 健康检查：<http://localhost:8000/api/health>

## 环境变量

| 变量 | 说明 |
|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API Key，只在后端 `.env` 中配置 |
| `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 默认 `deepseek-chat` |
| `REQUEST_TIMEOUT` | 请求超时秒数，默认 30 |
| `ALLOWED_ORIGINS` | CORS 白名单，逗号分隔，默认 `http://localhost:5173` |
| `ENABLE_MOCK` | `true` 时不调用 DeepSeek，返回结构化 Mock（仅联调） |

## 安全

- API Key 仅存在后端 `.env`，禁止提交到 Git、写入前端代码或 localStorage
- 统一错误响应 `{"message": "..."}`，不向上游透传错误堆栈
- CORS 不使用 `allow_origins=["*"]`
