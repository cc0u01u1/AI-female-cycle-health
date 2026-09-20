import type {
  BodyStatus,
  HealthRecord,
  MoodType
} from '@/types/cycle'
import {
  BODY_STATUS_LABELS,
  BODY_STATUS_VALUES,
  MOOD_LABELS,
  MOOD_VALUES,
  PAIN_MAX,
  PAIN_MIN
} from '@/utils/recordHelpers'

/** 疼痛等级分布（索引 0-5 对应疼痛等级，值为记录次数） */
export interface PainDistribution {
  /** 长度 6，counts[i] = 疼痛等级 i 的记录次数 */
  counts: number[]
  /** 参与统计的有效记录数 */
  total: number
}

/**
 * 疼痛等级分布统计
 * 防御：pain 非数字 / NaN / 超出 0-5 的记录不纳入统计。
 */
export function getPainDistribution(records: HealthRecord[]): PainDistribution {
  const counts = new Array(PAIN_MAX - PAIN_MIN + 1).fill(0)
  let total = 0
  for (const r of records) {
    const p = r.pain
    if (
      typeof p === 'number' &&
      Number.isFinite(p) &&
      Number.isInteger(p) &&
      p >= PAIN_MIN &&
      p <= PAIN_MAX
    ) {
      counts[p]++
      total++
    }
  }
  return { counts, total }
}

/** 情绪分布单项 */
export interface MoodDistributionItem {
  key: MoodType
  label: string
  value: number
}

export interface MoodDistribution {
  items: MoodDistributionItem[]
  total: number
}

/**
 * 情绪分布统计
 * 防御：mood 非合法枚举的记录不纳入。
 */
export function getMoodDistribution(records: HealthRecord[]): MoodDistribution {
  const map = new Map<MoodType, number>(MOOD_VALUES.map((m) => [m, 0]))
  let total = 0
  for (const r of records) {
    if (MOOD_VALUES.includes(r.mood)) {
      map.set(r.mood, (map.get(r.mood) || 0) + 1)
      total++
    }
  }
  const items: MoodDistributionItem[] = MOOD_VALUES.map((key) => ({
    key,
    label: MOOD_LABELS[key],
    value: map.get(key) || 0
  }))
  return { items, total }
}

/** 身体状态分布单项 */
export interface BodyStatusDistributionItem {
  key: BodyStatus
  label: string
  value: number
}

export interface BodyStatusDistribution {
  items: BodyStatusDistributionItem[]
  total: number
}

/**
 * 身体状态分布统计（同一条记录的多种状态分别计数）
 * 防御：bodyStatus 非数组或含非法值时仅跳过非法项。
 */
export function getBodyStatusDistribution(records: HealthRecord[]): BodyStatusDistribution {
  const map = new Map<BodyStatus, number>(BODY_STATUS_VALUES.map((b) => [b, 0]))
  let total = 0
  for (const r of records) {
    if (!Array.isArray(r.bodyStatus)) continue
    const validInRecord = new Set<BodyStatus>()
    for (const b of r.bodyStatus) {
      if (BODY_STATUS_VALUES.includes(b)) validInRecord.add(b)
    }
    validInRecord.forEach((b) => {
      map.set(b, (map.get(b) || 0) + 1)
      total++
    })
  }
  const items: BodyStatusDistributionItem[] = BODY_STATUS_VALUES.map((key) => ({
    key,
    label: BODY_STATUS_LABELS[key],
    value: map.get(key) || 0
  }))
  return { items, total }
}
