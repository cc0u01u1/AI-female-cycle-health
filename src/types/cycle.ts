// 周期相关类型定义

/** 经量等级 */
export type FlowLevel = 'none' | 'light' | 'medium' | 'heavy'

/** 情绪类型 */
export type MoodType = 'great' | 'normal' | 'low' | 'anxious' | 'irritable'

/** 身体状态 */
export type BodyStatus = 'normal' | 'tired' | 'bloating' | 'headache' | 'backache' | 'other'

/** 周期阶段（仅作为周期管理估算，不代表医学判断） */
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal'

/** 单次健康记录 */
export interface HealthRecord {
  /** 唯一 id */
  id: string
  /** 日期 YYYY-MM-DD（一天仅一条，作为业务唯一键） */
  date: string
  /** 经量 */
  flow: FlowLevel
  /** 疼痛 0-5 */
  pain: number
  /** 情绪 */
  mood: MoodType
  /** 睡眠时长（小时） */
  sleep: number
  /** 身体状态（可多选，正常时通常为 ['normal']） */
  bodyStatus: BodyStatus[]
  /** 备注 */
  note: string
  /** 创建时间 ISO */
  createdAt: string
  /** 最近更新时间 ISO */
  updatedAt: string
}

/** 一次经期记录 */
export interface CyclePeriod {
  /** 唯一 id */
  id: string
  /** 经期开始日期 YYYY-MM-DD */
  startDate: string
  /** 经期结束日期 YYYY-MM-DD（未结束时为 undefined，表示进行中） */
  endDate?: string
  /** 创建时间 ISO */
  createdAt: string
  /** 最近更新时间 ISO */
  updatedAt: string
}

/** 周期设置 */
export interface CycleSettings {
  /** 默认周期长度 */
  defaultCycleLength: number
  /** 默认经期长度 */
  defaultPeriodLength: number
  /** 是否开启提醒 */
  reminderEnabled: boolean
}

/** 周期阶段计算结果 */
export interface CyclePhaseInfo {
  phase: CyclePhase
  label: string
  description: string
}

/** 当前周期状态汇总（首页用） */
export interface CurrentCycleStatus {
  /** 当前周期日 */
  currentDay: number
  /** 预计下次经期 */
  nextPeriodDate: string
  /** 距离预计经期天数 */
  daysUntilNextPeriod: number
  /** 下次经期是否基于默认周期估算（无有效历史周期时为 true） */
  nextPeriodEstimated: boolean
  /** 当前阶段 */
  phase: CyclePhaseInfo
}
