<script setup lang="ts">
import { computed } from 'vue'
import { today } from '@/utils/date'
import type { HealthRecord, FlowLevel, MoodType } from '@/types/cycle'

const props = defineProps<{
  record?: HealthRecord
}>()

const flowLabels: Record<FlowLevel, string> = {
  none: '无',
  light: '少',
  medium: '中',
  heavy: '多'
}

const moodLabels: Record<MoodType, string> = {
  great: '很好',
  normal: '正常',
  low: '低落',
  anxious: '焦虑',
  irritable: '烦躁'
}

const hasRecord = computed(() => !!props.record)
const todayStr = computed(() => today())

const flowText = computed(() =>
  props.record ? flowLabels[props.record.flow] : '未记录'
)
const painText = computed(() =>
  props.record ? `${props.record.pain} / 5` : '未记录'
)
const moodText = computed(() =>
  props.record ? moodLabels[props.record.mood] : '未记录'
)
const sleepText = computed(() =>
  props.record ? `${props.record.sleep} h` : '未记录'
)
</script>

<template>
  <section class="quick-record hc-card">
    <div class="qr-header">
      <span class="qr-title">今日记录</span>
      <span class="qr-date">{{ todayStr }}</span>
    </div>

    <div class="qr-grid">
      <div class="qr-item">
        <div class="qr-label">经量</div>
        <div class="qr-value" :class="{ muted: !hasRecord }">{{ flowText }}</div>
      </div>
      <div class="qr-item">
        <div class="qr-label">疼痛</div>
        <div class="qr-value" :class="{ muted: !hasRecord }">{{ painText }}</div>
      </div>
      <div class="qr-item">
        <div class="qr-label">情绪</div>
        <div class="qr-value" :class="{ muted: !hasRecord }">{{ moodText }}</div>
      </div>
      <div class="qr-item">
        <div class="qr-label">睡眠</div>
        <div class="qr-value" :class="{ muted: !hasRecord }">{{ sleepText }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.qr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.qr-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--hc-text-main);
}
.qr-date {
  font-size: 12px;
  color: var(--hc-text-muted);
}
.qr-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.qr-item {
  background: #faf6f8;
  border-radius: 12px;
  padding: 10px 4px;
  text-align: center;
}
.qr-label {
  font-size: 11px;
  color: var(--hc-text-sub);
  margin-bottom: 4px;
}
.qr-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--hc-text-main);
}
.qr-value.muted {
  color: var(--hc-text-muted);
  font-weight: 400;
  font-size: 12px;
}
</style>
