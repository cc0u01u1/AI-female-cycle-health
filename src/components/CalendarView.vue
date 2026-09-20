<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Calendar as VanCalendar, type CalendarDayItem } from 'vant'

interface PredictedRange {
  start: string
  end: string
}

interface Props {
  /** 初始选中日期 YYYY-MM-DD */
  defaultDate: string
  /** 历史经期日集合 */
  periodDates: Set<string>
  /** 预测经期区间（含两端），无则 null */
  predictedRange: PredictedRange | null
  /** 已有健康记录的日集合 */
  recordDates: Set<string>
  /** 允许选择的最小日期 */
  minDate?: Date
  /** 允许选择的最大日期 */
  maxDate?: Date
}

const props = withDefaults(defineProps<Props>(), {
  predictedRange: null,
  minDate: () => {
    const d = new Date()
    return new Date(d.getFullYear() - 1, 0, 1)
  },
  maxDate: () => {
    const d = new Date()
    return new Date(d.getFullYear() + 1, 11, 31)
  }
})

const emit = defineEmits<{
  (e: 'select', date: string): void
  (e: 'month-show', payload: { year: number; month: number }): void
}>()

// 内部维护选中日期，避免双向绑定循环
const innerSelected = ref<Date | null>(new Date(props.defaultDate))

// 父组件改 defaultDate（外部按钮"今天"等）时同步内部
watch(
  () => props.defaultDate,
  (val) => {
    if (!val) return
    const d = new Date(val)
    if (!innerSelected.value || d.getTime() !== innerSelected.value.getTime()) {
      innerSelected.value = d
    }
  }
)

const minDateComputed = computed(() => props.minDate)
const maxDateComputed = computed(() => props.maxDate)

/** Date -> YYYY-MM-DD（本地时区） */
function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 自定义日期单元格：历史经期 / 预测经期 / 有记录 / 今天（同日多重状态合并展示） */
function formatter(day: CalendarDayItem): CalendarDayItem {
  if (!day.date) return day
  const ymd = toYMD(day.date)
  const hasRecord = props.recordDates.has(ymd)

  // 优先级：历史经期 > 预测经期 > 仅记录
  if (props.periodDates.has(ymd)) {
    day.className = 'cv-day-period'
    day.bottomInfo = hasRecord ? '经期 ·' : '经期'
    return day
  }
  if (props.predictedRange && ymd >= props.predictedRange.start && ymd <= props.predictedRange.end) {
    day.className = 'cv-day-predicted'
    day.bottomInfo = hasRecord ? '预测 ·' : '预测'
    return day
  }
  if (hasRecord) {
    day.className = 'cv-day-record'
    day.bottomInfo = '·'
    return day
  }
  return day
}

function onSelect(date: Date | Date[]): void {
  const d = Array.isArray(date) ? date[0] : date
  if (!d) return
  innerSelected.value = d
  emit('select', toYMD(d))
}

function onMonthShow(payload: { date: Date; title: string }): void {
  emit('month-show', {
    year: payload.date.getFullYear(),
    month: payload.date.getMonth() + 1
  })
}
</script>

<template>
  <div class="cv calendar-wrap">
    <VanCalendar
      v-model="innerSelected"
      :poppable="false"
      :show-confirm="false"
      :show-title="false"
      :show-subtitle="true"
      switch-mode="month"
      :min-date="minDateComputed"
      :max-date="maxDateComputed"
      :formatter="formatter"
      :row-height="56"
      first-day-of-week="0"
      color="#E55D8C"
      @select="onSelect"
      @month-show="onMonthShow"
    />
  </div>
</template>

<style scoped>
.calendar-wrap {
  background: #fff;
  border-radius: var(--hc-radius);
  overflow: hidden;
  box-shadow: var(--hc-shadow);
}
.calendar-wrap :deep(.van-calendar) {
  --van-calendar-height: 360px;
}
/* 缩小月份标题与副标题，更紧凑 */
.calendar-wrap :deep(.van-calendar__header) {
  box-shadow: none;
}
.calendar-wrap :deep(.van-calendar__body) {
  border-radius: 12px;
}
</style>

<!-- 非 scoped：覆盖 Vant 内部 cell 样式 -->
<style>
.cv-day-period {
  background: #fdeef3 !important;
  color: #e55d8c !important;
  font-weight: 600;
}
.cv-day-period .van-calendar__day-bottom-info {
  color: #e55d8c;
  font-size: 10px;
  line-height: 1;
}
.cv-day-predicted {
  background: #f3ecfb !important;
  color: #8a5cc7 !important;
}
.cv-day-predicted .van-calendar__day-bottom-info {
  color: #8a5cc7;
  font-size: 10px;
  line-height: 1;
}
.cv-day-record .van-calendar__day-bottom-info {
  color: #5aaf6f;
  font-size: 18px;
  line-height: 1;
  font-weight: 700;
}
</style>
