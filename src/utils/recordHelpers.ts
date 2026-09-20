import type { BodyStatus, FlowLevel, HealthRecord, MoodType } from '@/types/cycle'
import { today } from '@/utils/date'

/** 各枚举合法值集合，用于校验 */
export const FLOW_VALUES: readonly FlowLevel[] = ['none', 'light', 'medium', 'heavy']
export const MOOD_VALUES: readonly MoodType[] = ['great', 'normal', 'low', 'anxious', 'irritable']
export const BODY_STATUS_VALUES: readonly BodyStatus[] = [
  'normal', 'tired', 'bloating', 'headache', 'backache', 'other'
]

/** 疼痛等级范围 */
export const PAIN_MIN = 0
export const PAIN_MAX = 5
/** 睡眠小时数范围 */
export const SLEEP_MIN = 0
export const SLEEP_MAX = 24

/** 生成记录 id：日期 + 短随机后缀，足够本地唯一 */
export function generateRecordId(date: string): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `r_${date.replace(/-/g, '')}_${rand}`
}

/** 当前时间 ISO 字符串 */
export function nowISO(): string {
  return new Date().toISOString()
}

export interface RecordValidationResult {
  ok: boolean
  errors: string[]
}

/**
 * 校验 HealthRecord 字段
 * - date 必填且 YYYY-MM-DD
 * - flow / mood 必须为合法枚举
 * - pain 0-5 整数
 * - sleep 0-24 数字
 * - bodyStatus 数组且元素合法；空数组视为合法（等价于未填写）
 */
export function validateRecord(input: Partial<HealthRecord>): RecordValidationResult {
  const errors: string[] = []

  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    errors.push('日期格式应为 YYYY-MM-DD')
  }
  if (!input.flow || !FLOW_VALUES.includes(input.flow)) {
    errors.push('经量取值非法')
  }
  if (!input.mood || !MOOD_VALUES.includes(input.mood)) {
    errors.push('情绪取值非法')
  }
  if (typeof input.pain !== 'number' || !Number.isInteger(input.pain) || input.pain < PAIN_MIN || input.pain > PAIN_MAX) {
    errors.push(`疼痛等级应为 ${PAIN_MIN}-${PAIN_MAX} 的整数`)
  }
  if (typeof input.sleep !== 'number' || input.sleep < SLEEP_MIN || input.sleep > SLEEP_MAX) {
    errors.push(`睡眠小时数应为 ${SLEEP_MIN}-${SLEEP_MAX} 的数字`)
  }
  const bs = input.bodyStatus
  if (!Array.isArray(bs)) {
    errors.push('身体状态应为数组')
  } else if (bs.length > 0 && !bs.every((v) => BODY_STATUS_VALUES.includes(v))) {
    errors.push('身体状态存在非法值')
  }

  return { ok: errors.length === 0, errors }
}

/** 标签文案表（供 UI 共享） */
export const FLOW_LABELS: Record<FlowLevel, string> = {
  none: '无',
  light: '少',
  medium: '中',
  heavy: '多'
}

export const MOOD_LABELS: Record<MoodType, string> = {
  great: '很好',
  normal: '正常',
  low: '低落',
  anxious: '焦虑',
  irritable: '烦躁'
}

export const BODY_STATUS_LABELS: Record<BodyStatus, string> = {
  normal: '正常',
  tired: '疲劳',
  bloating: '腹胀',
  headache: '头痛',
  backache: '腰酸',
  other: '其他'
}

/** 默认空记录（仅日期），供表单初始化 */
export function buildEmptyRecord(date: string = today()): HealthRecord {
  const ts = nowISO()
  return {
    id: generateRecordId(date),
    date,
    flow: 'none',
    pain: 0,
    mood: 'normal',
    sleep: 7,
    bodyStatus: ['normal'],
    note: '',
    createdAt: ts,
    updatedAt: ts
  }
}

/** 获取记录日期集合（YYYY-MM-DD），用于日历标记 */
export function getRecordDateSet(records: HealthRecord[]): Set<string> {
  return new Set(records.map((r) => r.date))
}
