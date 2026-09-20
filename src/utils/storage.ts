/**
 * LocalStorage 保存/读取封装
 * 第一阶段不接后端，数据全部存本地。
 */
const PREFIX = 'hercycle:'

export const StorageKeys = {
  /** 所有健康记录 */
  RECORDS: `${PREFIX}records`,
  /** 历史周期列表 */
  CYCLES: `${PREFIX}cycles`,
  /** 周期设置 */
  SETTINGS: `${PREFIX}settings`,
  /** 上次 AI 分析时间 ISO */
  AI_LAST_ANALYSIS: `${PREFIX}ai:lastAnalysis`
} as const

export function saveJSON<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error('[storage] saveJSON failed:', err)
  }
}

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch (err) {
    console.error('[storage] loadJSON failed:', err)
    return fallback
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch (err) {
    console.error('[storage] removeKey failed:', err)
  }
}

/** 清除所有她周期相关数据 */
export function clearAllHerCycleData(): void {
  Object.values(StorageKeys).forEach((key) => removeKey(key))
}
