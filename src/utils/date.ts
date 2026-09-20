import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import isBetween from 'dayjs/plugin/isBetween'

dayjs.extend(relativeTime)
dayjs.extend(isBetween)
dayjs.locale('zh-cn')

/** 标准日期格式 YYYY-MM-DD */
export const DATE_FORMAT = 'YYYY-MM-DD'

/** 获取今日日期字符串 */
export function today(): string {
  return dayjs().format(DATE_FORMAT)
}

/** 格式化日期 */
export function formatDate(date: string | Date | dayjs.Dayjs | undefined | null): string {
  if (!date) return '--'
  return dayjs(date).format(DATE_FORMAT)
}

/** 友好日期：2026年9月20日 */
export function formatChineseDate(date: string | dayjs.Dayjs): string {
  return dayjs(date).format('YYYY年M月D日')
}

/** 计算两日期相差天数 */
export function diffDays(start: string, end: string): number {
  return dayjs(end).diff(dayjs(start), 'day')
}

/** 增加天数 */
export function addDays(date: string, days: number): string {
  return dayjs(date).add(days, 'day').format(DATE_FORMAT)
}

/** 是否今天 */
export function isToday(date: string): boolean {
  return dayjs(date).isSame(dayjs(), 'day')
}

/** 获取月份首日是星期几（0-6，0为周日） */
export function getMonthFirstDayWeek(year: number, month: number): number {
  // month 为 0-11
  return dayjs().year(year).month(month).date(1).day()
}

/** 获取月份总天数 */
export function getMonthDays(year: number, month: number): number {
  return dayjs().year(year).month(month).daysInMonth()
}

export { dayjs }
