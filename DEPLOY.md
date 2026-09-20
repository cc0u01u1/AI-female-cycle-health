# 部署指南（Vercel 前端 + Render 后端）

目标：得到一个可以直接发给 HR / 面试官打开的 HTTPS 地址。

```text
面试官浏览器
   ↓ HTTPS
Vercel（Vue3 前端，自动构建 dist）
   ↓ Axios（VITE_API_BASE_URL）
Render（FastAPI 后端，免费 Web Service）
   ↓ HTTPS + Bearer
DeepSeek API
```

两个平台均自动提供 HTTPS 证书，无需手动配置。

---

## 0. 前置准备

- GitHub 账号（Vercel / Render 均从 GitHub 仓库拉取代码）
- [Vercel](https://vercel.com) 账号（可用 GitHub 登录）
- [Render](https://render.com) 账号（可用 GitHub 登录）
- DeepSeek API Key（[platform.deepseek.com](https://platform.deepseek.com)）

## 1. 推送代码到 GitHub

仓库已初始化 Git（见 README「本地运行」）。在 GitHub 新建**空**仓库（不要勾选 README 初始化），然后：

```bash
git remote add origin https://github.com/<你的用户名>/HerCycle.git
git push -u origin main
```

## 2. 部署后端到 Render

1. Render Dashboard → **New +** → **Blueprint** → 选择 HerCycle 仓库
   （Render 会自动读取根目录 `render.yaml`）
2. Apply 创建服务。创建后进入 **Environment** 页：
   - `DEEPSEEK_API_KEY`：填入真实 Key（`sk-` 开头，仅存在 Render，不进 Git）
   - `ALLOWED_ORIGINS`：先保持默认，第 4 步回填
3. 等待部署完成，得到后端地址，例如 `https://hercycle-api.onrender.com`

**验证**：浏览器打开 `https://hercycle-api.onrender.com/api/health`，应返回 `{"status":"ok"}`。

## 3. 部署前端到 Vercel

1. Vercel Dashboard → **Add New...** → **Project** → Import HerCycle 仓库
2. Framework Preset 会自动识别为 Vite。展开 **Environment Variables**，添加：

   | Name | Value |
   | --- | --- |
   | `VITE_API_BASE_URL` | `https://hercycle-api.onrender.com`（上一步的 Render 地址，**不带末尾斜杠**） |

3. Deploy。得到前端地址，例如 `https://hercycle.vercel.app`

## 4. 回填 CORS（关键步骤）

前端真实域名确定后，回到 Render → hercycle-api → **Environment**：

```env
ALLOWED_ORIGINS=https://hercycle.vercel.app
```

> 值为前端完整 origin（协议 + 域名，不带 `/`）。自定义域名或 Vercel 分配的
> 其他域名（如 `xxx.vercel.app`）都要加进来，多个用英文逗号分隔。

保存后 Render 会自动重新部署。后端 CORS 是白名单机制（见 `backend/app/main.py`），不在名单内的来源会被拒绝。

## 5. 部署验证清单

- [ ] `GET https://<render域名>/api/health` → `{"status":"ok"}`
- [ ] `GET https://<render域名>/api/health/ai` → `{"enabled":true,"mock":false}`
- [ ] 打开 `https://<vercel域名>`，开始经期 / 记录状态正常
- [ ] 首页点「AI 分析」→ 返回真实 DeepSeek 总结（非 Mock 文案）
- [ ] 浏览器 DevTools 确认：请求走 HTTPS；响应无 CORS 报错；前端源码 / 请求参数中无 API Key

## 6. 常见问题

| 现象 | 原因 / 解决 |
| --- | --- |
| 前端报 CORS 错误 | `ALLOWED_ORIGINS` 未包含前端真实 origin，回填后等 Render 重新部署 |
| AI 分析一直 loading 后失败 | Render 免费实例冷启动（约 30–60s），首次请求稍等；或 Key 未配置（查 `/api/health/ai`） |
| AI 返回 503「认证失败」 | Render 环境变量里 Key 填错（不要带引号 / 多余空格） |
| 前端环境变量不生效 | `VITE_*` 是**构建时**注入，改完必须在 Vercel 重新 Deploy |
| 想临时不调 DeepSeek 演示 | Render 环境变量 `ENABLE_MOCK=true`（记得演示后改回 false） |

## 7. 费用与说明

- Vercel Hobby / Render Free 均为免费层，足够求职演示
- Render 免费实例 15 分钟无流量会休眠，首次唤醒慢属正常现象
- DeepSeek Key 只存在 Render 环境变量与本地 `backend/.env`（已 gitignore），绝不进入前端代码与 Git
