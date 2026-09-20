import type { AIAnalyzeRequest, AIRecordInput, AIPeriodInput } from '@/types/ai'
import type { useCycleStore } from '@/stores/cycle'
import {
  BODY_STATUS_LABELS,
  MOOD_LABELS
} from '@/utils/recordHelpers'

/** 发送给 AI 的最近记录条数上限（控制 Token） */
const MAX_RECORDS = 14
/** 最近经期次数上限 */
const MAX_PERIODS = 3
/** 备注截断长度 */
const NOTE_MAX = 100

type CycleStore = ReturnType<typeof useCycleStore>

/**
 * 把 Pinia 数据转换为 AIAnalyzeRequest。
 * 只发送必要字段，不透传 Store 原始对象（id/时间戳等不发送）。
 */
export function buildAIAnalyzeRequest(store: CycleStore): AIAnalyzeRequest {
  const cycle = {
    cycleDay: store.currentStatus.currentDay,
    cycleLength: store.averageCycleLength,
    phase: store.currentStatus.phase.phase
  }

  // 最近 N 条记录（按日期倒序取最近），映射为中文可读字段
  const recentRecords: AIRecordInput[] = [...store.records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_RECORDS)
    .map((r) => ({
      date: r.date,
      painLevel: r.pain,
      mood: MOOD_LABELS[r.mood],
      sleepHours: r.sleep,
      bodyStatus: r.bodyStatus.map((b) => BODY_STATUS_LABELS[b]),
      note: (r.note || '').slice(0, NOTE_MAX)
    }))

  // 最近 3 次经期
  const recentPeriods: AIPeriodInput[] = [...store.cycles]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, MAX_PERIODS)
    .map((p) => ({
      startDate: p.startDate,
      endDate: p.endDate ?? null
    }))

  return { cycle, recentRecords, recentPeriods }
}
