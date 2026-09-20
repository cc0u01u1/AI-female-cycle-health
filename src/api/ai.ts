import axios from 'axios'
import type { AIAnalyzeRequest, AIAnalyzeResponse } from '@/types/ai'

/** API 基础地址：开发默认本地 FastAPI，可通过 VITE_API_BASE_URL 覆盖 */
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const client = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

/** 把任意错误转换为面向用户的友好信息（不暴露堆栈与内部细节） */
function toFriendlyMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ECONNABORTED') {
      return 'AI 服务响应超时，请稍后再试。'
    }
    const message = (err.response?.data as { message?: string } | undefined)?.message
    if (message) return message
    if (err.response) {
      return 'AI 服务暂时不可用，请稍后再试。'
    }
    return '暂时无法连接 AI 服务，请确认后端已启动。'
  }
  return 'AI 服务出现未知错误，请稍后再试。'
}

/**
 * 调用后端 AI 健康信息辅助接口
 * 失败时抛出携带友好 message 的 Error，由组件展示
 */
export async function analyzeHealth(payload: AIAnalyzeRequest): Promise<AIAnalyzeResponse> {
  try {
    const resp = await client.post<AIAnalyzeResponse>('/api/ai/analyze', payload)
    return resp.data
  } catch (err) {
    throw new Error(toFriendlyMessage(err))
  }
}
