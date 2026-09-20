/** AI 健康信息辅助接口类型（与后端 schemas/ai.py 对应） */

export type AIPhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'

/** 当前周期上下文 */
export interface AICycleContext {
  cycleDay: number
  cycleLength: number
  phase: AIPhase
}

/** 单条健康记录输入（仅必要字段） */
export interface AIRecordInput {
  date: string
  painLevel: number
  mood: string
  sleepHours: number
  bodyStatus: string[]
  note: string
}

/** 最近经期输入 */
export interface AIPeriodInput {
  startDate: string
  endDate: string | null
}

/** POST /api/ai/analyze 请求体 */
export interface AIAnalyzeRequest {
  cycle: AICycleContext
  recentRecords: AIRecordInput[]
  recentPeriods: AIPeriodInput[]
}

/** POST /api/ai/analyze 响应体 */
export interface AIAnalyzeResponse {
  summary: string
  observations: string[]
  suggestions: string[]
  disclaimer: string
}
