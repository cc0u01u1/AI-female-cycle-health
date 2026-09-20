import type { CyclePeriod } from '@/types/cycle'
import { dayjs, today, diffDays } from '@/utils/date'

/** 生成经期 id */
export function generatePeriodId(date: string): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `p_${date.replace(/-/g, '')}_${rand}`
}

/** 当前时间 ISO（复用 recordHelpers 的实现语义） */
export function nowISO(): string {
  return new Date().toISOString()
}

/** 是否未来日期（晚于今天） */
export function isFutureDate(date: string): boolean {
  return dayjs(date).isAfter(dayjs(), 'day')
}

/**
 * 兼容迁移：为旧格式（无 id/时间戳）的经期数据补齐字段，
 * 过滤非法项，保证 store 与计算逻辑拿到合法数据。
 */
export function normalizeCycles(input: unknown): CyclePeriod[] {
  if (!Array.isArray(input)) return []
  const ts = nowISO()
  const result: CyclePeriod[] = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue
    const c = raw as Partial<CyclePeriod>
    if (typeof c.startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(c.startDate)) continue
    result.push({
      id: typeof c.id === 'string' && c.id ? c.id : generatePeriodId(c.startDate),
      startDate: c.startDate,
      endDate:
        typeof c.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.endDate)
          ? c.endDate
          : undefined,
      createdAt: typeof c.createdAt === 'string' ? c.createdAt : ts,
      updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : ts
    })
  }
  return result
}

/**
 * 计算经期覆盖的天数（进行中的经期按覆盖到今天计）
 */
export function periodCoveredDays(p: CyclePeriod): number {
  const end = p.endDate || today()
  if (end < p.startDate) return 0
  return diffDays(p.startDate, end) + 1
}

/**
 * 展开经期覆盖的日期集合（进行中的经期覆盖到今天）
 * 单个经期最多展开 31 天，防御脏数据导致的死循环。
 */
export function expandPeriodDates(periods: CyclePeriod[]): Set<string> {
  const set = new Set<string>()
  for (const p of periods) {
    const end = p.endDate || today()
    let cur = p.startDate
    let i = 0
    while (cur <= end && i < 31) {
      set.add(cur)
      cur = dayjs(cur).add(1, 'day').format('YYYY-MM-DD')
      i++
    }
  }
  return set
}
