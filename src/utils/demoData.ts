import type {
  CyclePeriod,
  FlowLevel,
  HealthRecord,
  MoodType,
  BodyStatus
} from '@/types/cycle'
import { StorageKeys, saveJSON } from '@/utils/storage'
import { dayjs, today } from '@/utils/date'
import { generateRecordId } from '@/utils/recordHelpers'
import { generatePeriodId } from '@/utils/periodHelpers'

/**
 * 演示数据 seed（按需触发，不在图表中写死数据）。
 *
 * 生成：
 * - 6 个完整周期（含经期 endDate）
 * - 从最早周期开始日到今天的逐日健康记录（少量随机缺记）
 *
 * 所有日期相对今天动态推算，避免随时间失效。
 */

/** 周期长度（最旧 → 最新之间的间隔） */
const CYCLE_LENGTHS = [28, 29, 27, 30, 28, 29]
/** 每次经期持续天数 */
const PERIOD_LENGTHS = [5, 5, 4, 5, 6, 5]

/** 让今天恰好是最近周期 Day 12 */
const TARGET_CURRENT_DAY = 12

interface BuiltCycle {
  period: CyclePeriod
  start: string
  end: string
}

function buildCycles(): BuiltCycle[] {
  const newestStart = dayjs(today()).subtract(TARGET_CURRENT_DAY - 1, 'day')
  const starts: string[] = [newestStart.format('YYYY-MM-DD')]
  // 由新向旧推算
  for (let i = CYCLE_LENGTHS.length - 1; i >= 1; i--) {
    const prev = dayjs(starts[starts.length - 1]).subtract(CYCLE_LENGTHS[i], 'day')
    starts.push(prev.format('YYYY-MM-DD'))
  }
  const ordered = starts.reverse()
  return ordered.map((start, i) => {
    const end = dayjs(start).add(PERIOD_LENGTHS[i] - 1, 'day').format('YYYY-MM-DD')
    const ts = dayjs(start).hour(8).minute(0).second(0).millisecond(0).toDate().toISOString()
    return {
      start,
      end,
      period: {
        id: generatePeriodId(start),
        startDate: start,
        endDate: end,
        createdAt: ts,
        updatedAt: ts
      }
    }
  })
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 加权随机：weights 与 arr 等长 */
function pickWeighted<T>(arr: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i]
    if (r <= 0) return arr[i]
  }
  return arr[arr.length - 1]
}

function roundHalf(n: number): number {
  return Math.round(n * 2) / 2
}

function buildRecord(date: string, cycle: BuiltCycle): HealthRecord {
  const djs = dayjs(date)
  const inPeriod =
    (djs.isAfter(dayjs(cycle.start)) || djs.isSame(dayjs(cycle.start))) &&
    (djs.isBefore(dayjs(cycle.end)) || djs.isSame(dayjs(cycle.end)))

  const periodDay = inPeriod ? djs.diff(dayjs(cycle.start), 'day') + 1 : 0

  // 经量
  let flow: FlowLevel = 'none'
  if (inPeriod) {
    if (periodDay <= 1) flow = pick<FlowLevel>(['medium', 'heavy'])
    else if (periodDay <= 3) flow = pick<FlowLevel>(['light', 'medium'])
    else flow = 'light'
  }

  // 疼痛
  let pain: number
  if (inPeriod) {
    pain = periodDay <= 2 ? pick([1, 2, 3]) : pick([0, 1])
  } else {
    pain = Math.random() < 0.08 ? 1 : 0
  }

  // 情绪
  let mood: MoodType
  if (inPeriod) {
    mood = pickWeighted<MoodType>(
      ['great', 'normal', 'low', 'anxious', 'irritable'],
      [2, 4, 1, 1.5, 1.5]
    )
  } else {
    mood = pickWeighted<MoodType>(
      ['great', 'normal', 'low', 'anxious', 'irritable'],
      [2.5, 4.5, 1, 1, 1]
    )
  }

  // 睡眠
  let sleep = roundHalf(7 + (Math.random() - 0.5) * 2)
  if (Math.random() < 0.08) sleep = roundHalf(5.5 + Math.random())

  // 身体状态
  let bodyStatus: BodyStatus[]
  if (inPeriod && periodDay <= 3) {
    bodyStatus = pick<BodyStatus[]>([
      ['bloating'],
      ['bloating', 'backache'],
      ['backache'],
      ['tired'],
      ['normal']
    ])
  } else if (Math.random() < 0.07) {
    bodyStatus = ['tired']
  } else if (Math.random() < 0.03) {
    bodyStatus = ['headache']
  } else {
    bodyStatus = ['normal']
  }

  const ts = djs.hour(21).minute(0).second(0).millisecond(0).toDate().toISOString()

  return {
    id: generateRecordId(date),
    date,
    flow,
    pain,
    mood,
    sleep,
    bodyStatus,
    note: '',
    createdAt: ts,
    updatedAt: ts
  }
}

/**
 * 写入演示数据并刷新页面，让 Pinia 从 LocalStorage 重新加载。
 */
export function seedDemoData(): void {
  const cycles = buildCycles()
  const records: HealthRecord[] = []

  let cursor = dayjs(cycles[0].start)
  const end = dayjs(today())
  while (cursor.isBefore(end) || cursor.isSame(end)) {
    const date = cursor.format('YYYY-MM-DD')
    // 找到该日期所属周期
    const belonging = findBelongingCycle(date, cycles)
    // 非经期日随机缺记约 6%
    const skip = !isInPeriod(date, belonging) && Math.random() < 0.06
    if (belonging && !skip) {
      records.push(buildRecord(date, belonging))
    }
    cursor = cursor.add(1, 'day')
  }

  saveJSON(StorageKeys.CYCLES, cycles.map((c) => c.period))
  saveJSON(StorageKeys.RECORDS, records)
  // 强制刷新，确保所有页面状态一致
  window.location.reload()
}

function findBelongingCycle(date: string, cycles: BuiltCycle[]): BuiltCycle | undefined {
  // 找 startDate <= date 的最后一个周期
  let target: BuiltCycle | undefined
  for (const c of cycles) {
    if (c.start <= date) target = c
    else break
  }
  return target
}

function isInPeriod(date: string, cycle: BuiltCycle | undefined): boolean {
  if (!cycle) return false
  return date >= cycle.start && date <= cycle.end
}
