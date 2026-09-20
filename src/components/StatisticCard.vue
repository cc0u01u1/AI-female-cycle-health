<script setup lang="ts">
import { computed } from 'vue'
import { Icon as VanIcon } from 'vant'

/** 趋势方向 */
type TrendDirection = 'up' | 'down' | 'flat'

interface TrendInfo {
  direction: TrendDirection
  text?: string
}

interface Props {
  /** 卡片标题 */
  title: string
  /** 主数值；null/undefined 表示暂无数据 */
  value?: number | string | null
  /** 单位 */
  unit?: string
  /** 描述/口径说明 */
  description?: string
  /** Vant 图标名（已确认存在的图标） */
  icon?: string
  /** 趋势信息 */
  trend?: TrendInfo
}

const props = withDefaults(defineProps<Props>(), {
  value: undefined,
  unit: '',
  description: '',
  icon: '',
  trend: undefined
})

const hasValue = computed(
  () => props.value !== null && props.value !== undefined && props.value !== ''
)

const trendIcon = computed(() => {
  if (!props.trend) return ''
  switch (props.trend.direction) {
    case 'up':
      return 'arrow-up'
    case 'down':
      return 'arrow-down'
    default:
      return 'minus'
  }
})

const trendColorClass = computed(() =>
  props.trend ? `sc-trend--${props.trend.direction}` : ''
)
</script>

<template>
  <section class="sc hc-card">
    <div class="sc-head">
      <span class="sc-title">{{ title }}</span>
      <span v-if="icon" class="sc-icon">
        <VanIcon :name="icon" />
      </span>
    </div>

    <div v-if="hasValue" class="sc-body">
      <span class="sc-value">{{ value }}</span>
      <span v-if="unit" class="sc-unit">{{ unit }}</span>
    </div>
    <div v-else class="sc-body sc-body--empty">
      <span class="sc-empty">暂无数据</span>
    </div>

    <p v-if="description" class="sc-desc">{{ description }}</p>

    <div v-if="trend" class="sc-trend" :class="trendColorClass">
      <VanIcon :name="trendIcon" class="sc-trend-icon" />
      <span>{{ trend.text }}</span>
    </div>
  </section>
</template>

<style scoped>
.sc {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  min-height: 118px;
}
.sc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sc-title {
  font-size: 13px;
  color: var(--hc-text-sub);
}
.sc-icon {
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: #fdeef3;
  color: var(--hc-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}
.sc-body {
  margin: 10px 0 4px;
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.sc-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--hc-text-main);
  line-height: 1.1;
}
.sc-unit {
  font-size: 13px;
  color: var(--hc-text-sub);
}
.sc-body--empty {
  align-items: center;
}
.sc-empty {
  font-size: 15px;
  color: var(--hc-text-muted);
}
.sc-desc {
  margin: 0;
  font-size: 11px;
  color: var(--hc-text-muted);
  line-height: 1.5;
}
.sc-trend {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}
.sc-trend-icon {
  font-size: 12px;
}
.sc-trend--up {
  color: #e55d8c;
}
.sc-trend--down {
  color: #5aaf6f;
}
.sc-trend--flat {
  color: var(--hc-text-muted);
}
</style>
