<script setup lang="ts">
import { computed } from 'vue'
import { formatChineseDate } from '@/utils/date'
import type { CurrentCycleStatus } from '@/types/cycle'

const props = defineProps<{
  status: CurrentCycleStatus
}>()

const phaseLabel = computed(() => props.status.phase.label)
const phaseDescription = computed(() => props.status.phase.description)

// 根据阶段选择背景渐变
const phaseGradient = computed(() => {
  switch (props.status.phase.phase) {
    case 'menstrual':
      return 'linear-gradient(135deg, #E55D8C 0%, #F8A5B8 100%)'
    case 'follicular':
      return 'linear-gradient(135deg, #F8A5B8 0%, #FFC9D6 100%)'
    case 'ovulation':
      return 'linear-gradient(135deg, #C77DD3 0%, #F8A5B8 100%)'
    case 'luteal':
    default:
      return 'linear-gradient(135deg, #B891D6 0%, #F8A5B8 100%)'
  }
})
</script>

<template>
  <section class="cycle-card" :style="{ background: phaseGradient }">
    <div class="card-top">
      <span class="card-label">当前周期</span>
      <span class="card-phase-tag">{{ phaseLabel }}（估算）</span>
    </div>

    <div class="card-day-row">
      <span class="card-day-num">Day {{ status.currentDay }}</span>
    </div>

    <div class="card-meta">
      <div class="meta-item">
        <div class="meta-label">
          预计下次经期<span v-if="status.nextPeriodEstimated" class="meta-estimated">（估算）</span>
        </div>
        <div class="meta-value">{{ formatChineseDate(status.nextPeriodDate) }}</div>
      </div>
      <div class="meta-divider"></div>
      <div class="meta-item">
        <div class="meta-label">距离预计经期</div>
        <div class="meta-value">{{ status.daysUntilNextPeriod }} 天</div>
      </div>
    </div>

    <p class="card-tip">{{ phaseDescription }}</p>
    <p class="card-disclaimer">* 以上阶段为基于周期日期的估算，不代表医学判断。</p>
  </section>
</template>

<style scoped>
.cycle-card {
  border-radius: 20px;
  padding: 20px;
  color: #fff;
  box-shadow: 0 8px 24px rgba(229, 93, 140, 0.18);
  position: relative;
  overflow: hidden;
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-label {
  font-size: 13px;
  opacity: 0.9;
}
.card-phase-tag {
  font-size: 12px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 999px;
}
.card-day-row {
  margin: 16px 0;
}
.card-day-num {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: 1px;
}
.card-meta {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}
.meta-item {
  flex: 1;
}
.meta-label {
  font-size: 12px;
  opacity: 0.85;
  margin-bottom: 4px;
}
.meta-estimated {
  opacity: 0.85;
  font-size: 10px;
}
.meta-value {
  font-size: 15px;
  font-weight: 600;
}
.meta-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.35);
  margin: 0 8px;
}
.card-tip {
  font-size: 13px;
  margin: 0 0 8px;
  opacity: 0.95;
}
.card-disclaimer {
  font-size: 11px;
  margin: 0;
  opacity: 0.7;
}
</style>
