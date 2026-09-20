import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type {
  CyclePeriod,
  CycleSettings,
  HealthRecord
} from '@/types/cycle'
import { StorageKeys, loadJSON, saveJSON, clearAllHerCycleData } from '@/utils/storage'
import {
  DEFAULT_SETTINGS,
  calculateAverageCycle,
  calculateCurrentStatus
} from '@/utils/cycleCalculator'
import { nowISO } from '@/utils/recordHelpers'
import { generatePeriodId, isFutureDate, normalizeCycles } from '@/utils/periodHelpers'
import { today } from '@/utils/date'

/** 通用操作结果（经期管理用） */
export interface OpResult {
  ok: boolean
  message?: string
}

/**
 * 周期数据 store
 * 使用 LocalStorage 持久化。
 *
 * 经期管理规则：
 * - 同一天不能创建重复经期开始
 * - 结束日期不能早于开始日期
 * - 不能同时存在多个未结束经期
 * - 不能记录未来日期
 */
export const useCycleStore = defineStore('cycle', () => {
  // 状态（cycles 加载时做旧数据兼容迁移）
  const records = ref<HealthRecord[]>(loadJSON<HealthRecord[]>(StorageKeys.RECORDS, []))
  const cycles = ref<CyclePeriod[]>(normalizeCycles(loadJSON<CyclePeriod[]>(StorageKeys.CYCLES, [])))
  const settings = ref<CycleSettings>(loadJSON<CycleSettings>(StorageKeys.SETTINGS, DEFAULT_SETTINGS))

  // 持久化（深度监听自动写回 LocalStorage）
  watch(records, (val) => saveJSON(StorageKeys.RECORDS, val), { deep: true })
  watch(cycles, (val) => saveJSON(StorageKeys.CYCLES, val), { deep: true })
  watch(settings, (val) => saveJSON(StorageKeys.SETTINGS, val), { deep: true })

  // 计算属性
  const averageCycleLength = computed(() => calculateAverageCycle(cycles.value))

  const currentStatus = computed(() =>
    calculateCurrentStatus(cycles.value, settings.value)
  )

  // ===== 健康记录 =====

  /**
   * 保存记录（新增或更新）
   * 业务唯一键为 date，避免同一天出现重复记录。
   */
  function addRecord(record: HealthRecord): void {
    const idx = records.value.findIndex((r) => r.date === record.date)
    const ts = nowISO()
    if (idx >= 0) {
      const prev = records.value[idx]
      records.value[idx] = {
        ...record,
        id: prev.id,
        createdAt: prev.createdAt,
        updatedAt: ts
      }
    } else {
      records.value.push({
        ...record,
        createdAt: record.createdAt || ts,
        updatedAt: ts
      })
    }
  }

  /** 兼容别名 */
  const saveRecord = addRecord

  function updateRecord(record: HealthRecord): void {
    addRecord(record)
  }

  function deleteRecord(date: string): boolean {
    const idx = records.value.findIndex((r) => r.date === date)
    if (idx < 0) return false
    records.value.splice(idx, 1)
    return true
  }

  function getRecordByDate(date: string): HealthRecord | undefined {
    return records.value.find((r) => r.date === date)
  }

  function hasRecord(date: string): boolean {
    return records.value.some((r) => r.date === date)
  }

  // ===== 经期管理 =====

  /** 进行中的经期（endDate 为空） */
  function getActivePeriod(): CyclePeriod | undefined {
    return cycles.value.find((c) => !c.endDate)
  }

  function getPeriodById(id: string): CyclePeriod | undefined {
    return cycles.value.find((c) => c.id === id)
  }

  /**
   * 按日期查找覆盖该日的经期
   * 进行中的经期视为覆盖 startDate..今天
   */
  function getPeriodByDate(date: string): CyclePeriod | undefined {
    const todayStr = today()
    return cycles.value.find((c) => {
      const end = c.endDate || todayStr
      return date >= c.startDate && date <= end
    })
  }

  /** 开始经期（startDate = date） */
  function startPeriod(date: string): OpResult {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { ok: false, message: '日期格式不正确' }
    }
    if (isFutureDate(date)) {
      return { ok: false, message: '不能记录未来日期的经期' }
    }
    if (cycles.value.some((c) => c.startDate === date)) {
      return { ok: false, message: '该日期已有经期开始记录' }
    }
    if (getActivePeriod()) {
      return { ok: false, message: '已有进行中的经期，请先结束它' }
    }
    const ts = nowISO()
    cycles.value.push({
      id: generatePeriodId(date),
      startDate: date,
      endDate: undefined,
      createdAt: ts,
      updatedAt: ts
    })
    return { ok: true }
  }

  /** 结束当前进行中的经期（endDate = date） */
  function endPeriod(date: string): OpResult {
    const active = getActivePeriod()
    if (!active) {
      return { ok: false, message: '当前没有进行中的经期' }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { ok: false, message: '日期格式不正确' }
    }
    if (isFutureDate(date)) {
      return { ok: false, message: '不能记录未来日期' }
    }
    if (date < active.startDate) {
      return { ok: false, message: '结束日期不能早于开始日期' }
    }
    active.endDate = date
    active.updatedAt = nowISO()
    return { ok: true }
  }

  /** 更新经期（开始/结束日期） */
  function updatePeriod(period: CyclePeriod): OpResult {
    const idx = cycles.value.findIndex((c) => c.id === period.id)
    if (idx < 0) {
      return { ok: false, message: '经期记录不存在' }
    }
    if (isFutureDate(period.startDate)) {
      return { ok: false, message: '开始日期不能是未来日期' }
    }
    if (period.endDate && period.endDate < period.startDate) {
      return { ok: false, message: '结束日期不能早于开始日期' }
    }
    if (cycles.value.some((c, i) => i !== idx && c.startDate === period.startDate)) {
      return { ok: false, message: '该日期已有经期开始记录' }
    }
    // 进行中的经期（endDate 为空）全局唯一
    if (
      !period.endDate &&
      cycles.value.some((c, i) => i !== idx && !c.endDate)
    ) {
      return { ok: false, message: '不能同时存在多个进行中的经期' }
    }
    // 区间重叠校验：与其它经期（进行中的区间按覆盖到今天）不得重叠
    const aStart = period.startDate
    const aEnd = period.endDate || today()
    for (let i = 0; i < cycles.value.length; i++) {
      if (i === idx) continue
      const other = cycles.value[i]
      const bStart = other.startDate
      const bEnd = other.endDate || today()
      // 两闭区间重叠条件：aStart <= bEnd && bStart <= aEnd
      if (aStart <= bEnd && bStart <= aEnd) {
        return { ok: false, message: '修改后的经期与其它经期记录重叠' }
      }
    }
    cycles.value[idx] = { ...period, updatedAt: nowISO() }
    return { ok: true }
  }

  /** 删除经期 */
  function deletePeriod(id: string): OpResult {
    const idx = cycles.value.findIndex((c) => c.id === id)
    if (idx < 0) {
      return { ok: false, message: '经期记录不存在' }
    }
    cycles.value.splice(idx, 1)
    return { ok: true }
  }

  function updateSettings(patch: Partial<CycleSettings>) {
    settings.value = { ...settings.value, ...patch }
  }

  function clearAll() {
    clearAllHerCycleData()
    records.value = []
    cycles.value = []
    settings.value = DEFAULT_SETTINGS
  }

  return {
    records,
    cycles,
    settings,
    averageCycleLength,
    currentStatus,
    addRecord,
    saveRecord,
    updateRecord,
    deleteRecord,
    getRecordByDate,
    hasRecord,
    getActivePeriod,
    getPeriodById,
    getPeriodByDate,
    startPeriod,
    endPeriod,
    updatePeriod,
    deletePeriod,
    updateSettings,
    clearAll
  }
})
