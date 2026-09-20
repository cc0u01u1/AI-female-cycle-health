<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button as VanButton, Icon } from 'vant'
import { useCycleStore } from '@/stores/cycle'
import { today, diffDays, formatChineseDate } from '@/utils/date'
import { showSuccessToast, showFailToast } from 'vant'
import {
  getLastCycleLength,
  getRecentCycleLengths
} from '@/utils/cycleCalculator'
import { buildAIAnalyzeRequest } from '@/utils/aiPayload'
import CycleCard from '@/components/CycleCard.vue'
import QuickRecord from '@/components/QuickRecord.vue'
import AIHealthCard from '@/components/AIHealthCard.vue'

const router = useRouter()
const store = useCycleStore()

const currentStatus = computed(() => store.currentStatus)
const todayRecord = computed(() => store.getRecordByDate(today()))

// AI 请求体（Pinia → AIAnalyzeRequest，只发送必要字段）
const aiRequest = computed(() => buildAIAnalyzeRequest(store))

// 首页简洁周期趋势卡（真实数据，无数据时不显示虚假数字）
const homeAvgCycle = computed<number | null>(() => {
  const lens = getRecentCycleLengths(store.cycles, 6)
  if (!lens.length) return null
  const sum = lens.reduce((a, b) => a + b, 0)
  return Math.round(sum / lens.length)
})
const homeLastCycle = computed<number | null>(() => getLastCycleLength(store.cycles))
/** 最近周期与平均周期的差值（正=偏长，负=偏短） */
const homeCycleDiff = computed<number | null>(() => {
  if (homeAvgCycle.value === null || homeLastCycle.value === null) return null
  return homeLastCycle.value - homeAvgCycle.value
})

function goRecord() {
  router.push(`/record?date=${encodeURIComponent(today())}`)
}

function goStatistics() {
  router.push('/statistics')
}

// ===== 经期状态 =====
const activePeriod = computed(() => store.getActivePeriod())
const activeDayCount = computed(() =>
  activePeriod.value ? diffDays(activePeriod.value.startDate, today()) + 1 : 0
)
const todayIsPeriodStart = computed(() =>
  store.cycles.some((c) => c.startDate === today())
)

function onStartPeriod() {
  const r = store.startPeriod(today())
  if (r.ok) showSuccessToast('已开始记录经期')
  else showFailToast(r.message || '操作失败')
}

function onEndPeriod() {
  const r = store.endPeriod(today())
  if (r.ok) showSuccessToast('经期已结束')
  else showFailToast(r.message || '操作失败')
}
</script>

<template>
  <div class="hc-page home-page">
    <!-- 顶部标题 -->
    <header class="home-header">
      <div>
        <h1 class="home-title">她周期</h1>
        <p class="home-subtitle">今天 · {{ formatChineseDate(today()) }}</p>
      </div>
      <div class="home-avatar">
        <Icon name="user-o" />
      </div>
    </header>

    <!-- 核心周期卡片 -->
    <CycleCard :status="currentStatus" />

    <!-- 经期状态操作 -->
    <section class="hc-card home-period">
      <div class="hp-left">
        <span class="hp-title">经期</span>
        <span v-if="activePeriod" class="hp-desc hp-desc--active">
          经期进行中 · 第 {{ activeDayCount }} 天
        </span>
        <span v-else-if="todayIsPeriodStart" class="hp-desc">今日已记录经期开始</span>
        <span v-else class="hp-desc">当前没有进行中的经期</span>
      </div>
      <VanButton
        v-if="activePeriod"
        size="small"
        round
        plain
        color="#B891D6"
        @click="onEndPeriod"
      >
        结束经期
      </VanButton>
      <VanButton
        v-else-if="!todayIsPeriodStart"
        size="small"
        round
        type="primary"
        color="#E55D8C"
        @click="onStartPeriod"
      >
        开始经期
      </VanButton>
    </section>

    <!-- 今日状态（记录网格 + 操作按钮同组） -->
    <div class="home-today">
      <QuickRecord :record="todayRecord" />

      <VanButton
        block
        round
        type="primary"
        class="home-cta"
        color="linear-gradient(135deg, #E55D8C 0%, #C77DD3 100%)"
        @click="goRecord"
      >
        <template #icon>
          <Icon name="edit" />
        </template>
        记录今天状态
      </VanButton>
    </div>

    <!-- AI 健康信息助手 -->
    <AIHealthCard :request="aiRequest" />

    <!-- 周期趋势（置底，点击进入统计页） -->
    <section class="hc-card home-trend" @click="goStatistics">
      <div class="ht-head">
        <span class="ht-title">周期趋势</span>
        <Icon name="arrow" class="ht-arrow" />
      </div>

      <template v-if="homeLastCycle !== null">
        <div class="ht-grid">
          <div class="ht-item">
            <span class="ht-label">平均周期</span>
            <span class="ht-value">{{ homeAvgCycle }} 天</span>
          </div>
          <div class="ht-item">
            <span class="ht-label">最近一次</span>
            <span class="ht-value">{{ homeLastCycle }} 天</span>
          </div>
        </div>
        <p
          v-if="homeCycleDiff !== null"
          class="ht-diff"
          :class="{
            'ht-diff--up': homeCycleDiff > 0,
            'ht-diff--down': homeCycleDiff < 0
          }"
        >
          <template v-if="homeCycleDiff > 0">↗ 比平均周期长 {{ homeCycleDiff }} 天</template>
          <template v-else-if="homeCycleDiff < 0">↘ 比平均周期短 {{ Math.abs(homeCycleDiff) }} 天</template>
          <template v-else>＝ 与平均周期持平</template>
        </p>
      </template>

      <p v-else class="ht-empty">记录更多周期，查看趋势</p>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  padding-bottom: 24px;
}
.home-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0 20px;
}
.home-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0;
  color: var(--hc-text-main);
  letter-spacing: 1px;
}
.home-subtitle {
  font-size: 12px;
  color: var(--hc-text-muted);
  margin: 4px 0 0;
}
.home-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--hc-primary);
  box-shadow: var(--hc-shadow);
}
.home-cta {
  margin: 14px 0 0;
  height: 48px;
  font-size: 15px;
  font-weight: 600;
}
.home-today {
  margin-top: 4px;
}

/* 经期状态卡 */
.home-period {
  margin: 12px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}
.hp-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hp-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--hc-text-main);
}
.hp-desc {
  font-size: 12px;
  color: var(--hc-text-muted);
}
.hp-desc--active {
  color: var(--hc-primary);
}

/* 周期趋势卡 */
.home-trend {
  margin: 16px 0 0;
  cursor: pointer;
}
.ht-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.ht-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--hc-text-main);
}
.ht-arrow {
  color: var(--hc-text-muted);
  font-size: 14px;
}
.ht-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.ht-item {
  background: #faf6f8;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ht-label {
  font-size: 11px;
  color: var(--hc-text-sub);
}
.ht-value {
  font-size: 17px;
  font-weight: 700;
  color: var(--hc-text-main);
}
.ht-diff {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--hc-text-muted);
}
.ht-diff--up {
  color: #e55d8c;
}
.ht-diff--down {
  color: #5aaf6f;
}
.ht-empty {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--hc-text-muted);
}
</style>
