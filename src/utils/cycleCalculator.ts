import type {
  CyclePeriod,
  CyclePhaseInfo,
  CycleSettings,
  CurrentCycleStatus,
  HealthRecord
} from '@/types/cycle'
import { addDays, diffDays, today } from '@/utils/date'

/** 默认周期长度 */
export const DEFAULT_CYCLE_LENGTH = 28
/** 默认经期长度 */
export const DEFAULT_PERIOD_LENGTH = 5

/** 有效周期长度范围（明显异常数据不纳入统计） */
export const CYCLE_LENGTH_MIN = 15
export const CYCLE_LENGTH_MAX = 60
/** 有效经期长度范围 */
export const PERIOD_LENGTH_MIN = 1
export const PERIOD_LENGTH_MAX = 15

/** 判断值是否为可参与统计的有效周期长度（排除 NaN/Infinity/负数/undefined） */
export function isValidCycleLength(n: unknown): n is number {
  return (
    typeof n === 'number' &&
    Number.isFinite(n) &&
    Number.isInteger(n) &&
    n >= CYCLE_LENGTH_MIN &&
    n <= CYCLE_LENGTH_MAX
  )
}

/** 判断值是否为有效经期长度 */
export function isValidPeriodLength(n: unknown): n is number {
  return (
    typeof n === 'number' &&
    Number.isFinite(n) &&
    Number.isInteger(n) &&
    n >= PERIOD_LENGTH_MIN &&
    n <= PERIOD_LENGTH_MAX
  )
}

/** 默认设置 */
export const DEFAULT_SETTINGS: CycleSettings = {
  defaultCycleLength: DEFAULT_CYCLE_LENGTH,
  defaultPeriodLength: DEFAULT_PERIOD_LENGTH,
  reminderEnabled: false
}

/**
 * 计算单个周期长度（两个相邻周期开始日期间隔天数）
 * - 若有 endDate（经期结束），优先用 endDate 计算
 * - 否则取与下一个周期的开始日间隔
 * - 若无下个周期，返回默认值
 */
export function calculateCycleLength(
  current: CyclePeriod,
  next?: CyclePeriod
): number {
  if (next) {
    return diffDays(current.startDate, next.startDate)
  }
  if (current.endDate) {
    // 经期结束 + 默认推算黄体期，不能直接得周期长度，仍按默认
    return DEFAULT_CYCLE_LENGTH
  }
  return DEFAULT_CYCLE_LENGTH
}

/**
 * 计算平均周期长度
 * - 使用最近最多 6 个有效周期（15-60 天）
 * - 若无有效数据，返回默认 28
 */
export function calculateAverageCycle(cycles: CyclePeriod[]): number {
  const valid = getRecentCycleLengths(cycles, 6)
  if (!valid.length) return DEFAULT_CYCLE_LENGTH
  const sum = valid.reduce((acc, n) => acc + n, 0)
  return Math.round(sum / valid.length)
}

/**
 * 计算平均经期长度
 * - 仅统计 endDate 存在的完整经期
 * - 经期天数 = endDate - startDate + 1
 * - 只统计 1-15 天的合理数据，异常忽略
 */
export function calculateAveragePeriodLength(cycles: CyclePeriod[]): number {
  const lengths = getRecentPeriodLengths(cycles, Number.MAX_SAFE_INTEGER)
  if (!lengths.length) return DEFAULT_PERIOD_LENGTH
  const sum = lengths.reduce((acc, n) => acc + n, 0)
  return Math.round(sum / lengths.length)
}

/**
 * 最近 N 个完整经期的持续天数（1-15 天有效，按时间顺序）
 */
export function getRecentPeriodLengths(cycles: CyclePeriod[], count = 6): number[] {
  const sorted = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const result: number[] = []
  for (const c of sorted) {
    if (!c.endDate) continue
    const len = diffDays(c.startDate, c.endDate) + 1
    if (isValidPeriodLength(len)) result.push(len)
  }
  return count === Number.MAX_SAFE_INTEGER ? result : result.slice(-count)
}

/** 完整经期（endDate 存在）数量 */
export function getCompletePeriodCount(cycles: CyclePeriod[]): number {
  return cycles.filter((c) => c.endDate).length
}

/**
 * 计算下一次预计经期日期
 * 最近一次经期开始日期 + 平均周期长度
 */
export function calculateNextPeriod(
  cycles: CyclePeriod[],
  averageCycleLength: number = DEFAULT_CYCLE_LENGTH
): string {
  if (!cycles.length) {
    return addDays(today(), averageCycleLength)
  }
  const sorted = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const last = sorted[sorted.length - 1]
  return addDays(last.startDate, averageCycleLength)
}

/**
 * 计算当前周期日（Day 1 起）
 * - 若今日落在某个周期内，则返回今日 - 周期开始日 + 1
 * - 若今日超过最后一个周期开始日，则按 1 + 与之相差天数
 */
export function calculateCurrentCycleDay(cycles: CyclePeriod[]): number {
  if (!cycles.length) return 1
  const sorted = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const last = sorted[sorted.length - 1]
  const todayStr = today()
  if (todayStr < last.startDate) {
    // 异常情况：今天早于最近周期开始日，按 1 计
    return 1
  }
  return diffDays(last.startDate, todayStr) + 1
}

/**
 * 指定日期所属周期的"周期日"（Day 1 起）
 * - 找到 startDate <= date 的最近一个周期开始日
 * - 返回 diffDays(开始日, date) + 1
 * - 若没有更早的周期开始日（该日期早于所有周期），返回 null
 */
export function getCycleDayForDate(date: string, cycles: CyclePeriod[]): number | null {
  if (!cycles.length) return null
  const sorted = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate))
  // 找最后一个 startDate <= date 的周期
  let target: CyclePeriod | undefined
  for (const c of sorted) {
    if (c.startDate <= date) target = c
    else break
  }
  if (!target) return null
  const diff = diffDays(target.startDate, date)
  if (diff < 0) return null
  return diff + 1
}

/**
 * 计算当前周期阶段
 * 注意：以上阶段为基于周期日期的估算，不代表医学判断。
 */
export function calculateCyclePhase(cycleDay: number, averageCycleLength: number = DEFAULT_CYCLE_LENGTH): CyclePhaseInfo {
  // 阶段定义（与平均周期相关）
  // Day 1~5 经期
  // Day 6~13 卵泡期
  // Day 14 排卵期附近
  // Day 15 ~ 平均周期结束 黄体期
  if (cycleDay >= 1 && cycleDay <= 5) {
    return {
      phase: 'menstrual',
      label: '经期',
      description: '注意保暖、休息，避免过度劳累。'
    }
  }
  if (cycleDay >= 6 && cycleDay <= 13) {
    return {
      phase: 'follicular',
      label: '卵泡期',
      description: '身体能量上升，适合开始新计划。'
    }
  }
  if (cycleDay === 14) {
    return {
      phase: 'ovulation',
      label: '排卵期附近',
      description: '基础体温可能略升，注意观察身体信号。'
    }
  }
  if (cycleDay >= 15 && cycleDay <= averageCycleLength) {
    return {
      phase: 'luteal',
      label: '黄体期',
      description: '可能出现情绪波动，注意自我关怀。'
    }
  }
  // 超过平均周期长度，归入黄体期末尾
  return {
    phase: 'luteal',
    label: '黄体期',
    description: '周期可能偏长，注意休息与观察。'
  }
}

/** 计算首页所需的周期状态汇总 */
export function calculateCurrentStatus(
  cycles: CyclePeriod[],
  settings: CycleSettings = DEFAULT_SETTINGS
): CurrentCycleStatus {
  const validLengths = getRecentCycleLengths(cycles, 6)
  const avgCycle = validLengths.length ? calculateAverageCycle(cycles) : settings.defaultCycleLength
  const currentDay = calculateCurrentCycleDay(cycles)
  const nextPeriod = calculateNextPeriod(cycles, avgCycle)
  const daysUntil = Math.max(0, diffDays(today(), nextPeriod))
  const phase = calculateCyclePhase(currentDay, avgCycle)
  return {
    currentDay,
    nextPeriodDate: nextPeriod,
    daysUntilNextPeriod: daysUntil,
    // 无有效历史周期时，下次经期按默认周期估算
    nextPeriodEstimated: validLengths.length === 0,
    phase
  }
}

/** 根据周期列表，标记某日是否属于历史经期 */
export function isDateInPeriodHistory(date: string, cycles: CyclePeriod[]): boolean {
  return cycles.some((c) => {
    if (!c.endDate) {
      // 单日经期
      return c.startDate === date
    }
    return dayjsInclusive(date, c.startDate, c.endDate)
  })
}

/** 判断日期是否在 [start, end] 闭区间 */
function dayjsInclusive(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

/** 判断日期是否在预测经期区间（基于下一次预测开始日 + 默认经期长度） */
export function isDateInPredictedPeriod(
  date: string,
  predictedStart: string,
  periodLength: number = DEFAULT_PERIOD_LENGTH
): boolean {
  const end = addDays(predictedStart, periodLength - 1)
  return dayjsInclusive(date, predictedStart, end)
}

/** 按日期获取对应健康记录 */
export function getRecordByDate(records: HealthRecord[], date: string): HealthRecord | undefined {
  return records.find((r) => r.date === date)
}

/**
 * 最近 N 次有效周期长度序列（按时间顺序）
 * - 仅统计有效周期：15-60 天整数
 * - 排除 NaN / Infinity / 负数 / undefined 等异常值
 */
export function getRecentCycleLengths(cycles: CyclePeriod[], count = 6): number[] {
  const sorted = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const result: number[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const len = calculateCycleLength(sorted[i], sorted[i + 1])
    if (isValidCycleLength(len)) result.push(len)
  }
  return result.slice(-count)
}

/**
 * 最近一个完整周期的长度（最近两个周期开始日间隔）
 * 无效或数据不足返回 null
 */
export function getLastCycleLength(cycles: CyclePeriod[]): number | null {
  const lengths = getRecentCycleLengths(cycles, Number.MAX_SAFE_INTEGER)
  if (!lengths.length) return null
  return lengths[lengths.length - 1]
}
