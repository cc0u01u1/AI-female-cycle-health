<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Button as VanButton,
  Empty as VanEmpty
} from 'vant'
import { useCycleStore } from '@/stores/cycle'
import {
  calculateAverageCycle,
  getCompletePeriodCount,
  getLastCycleLength,
  getRecentCycleLengths,
  getRecentPeriodLengths
} from '@/utils/cycleCalculator'
import {
  getBodyStatusDistribution,
  getMoodDistribution,
  getPainDistribution
} from '@/utils/statistics'
import { seedDemoData } from '@/utils/demoData'
import { showConfirmDialog } from 'vant'
import StatisticCard from '@/components/StatisticCard.vue'
import CycleTrendChart from '@/components/CycleTrendChart.vue'
import PainChart from '@/components/PainChart.vue'
import MoodChart from '@/components/MoodChart.vue'
import BodyStatusChart from '@/components/BodyStatusChart.vue'

const router = useRouter()
const store = useCycleStore()

// ========== 周期数据（真实数据，不写死） ==========
const cycleLengths = computed<number[]>(() =>
  getRecentCycleLengths(store.cycles, 6)
)

const avgCycle = computed<number | null>(() =>
  cycleLengths.value.length ? calculateAverageCycle(store.cycles) : null
)

const avgPeriod = computed<number | null>(() => {
  const lens = getRecentPeriodLengths(store.cycles, Number.MAX_SAFE_INTEGER)
  if (!lens.length) return null
  const sum = lens.reduce((a, b) => a + b, 0)
  return Math.round(sum / lens.length)
})

const lastCycle = computed<number | null>(() => getLastCycleLength(store.cycles))

const registeredCycleCount = computed<number>(() => store.cycles.length)
const completePeriodCount = computed<number>(() => getCompletePeriodCount(store.cycles))

// ========== 健康状态分布 ==========
const painDist = computed(() => getPainDistribution(store.records))
const moodDist = computed(() => getMoodDistribution(store.records))
const bodyDist = computed(() => getBodyStatusDistribution(store.records))

const hasRecords = computed(() => store.records.length > 0)
const hasAnyData = computed(() => hasRecords.value || store.cycles.length > 0)

/** 趋势图需要至少 2 个有效周期 */
const showTrendChart = computed(() => cycleLengths.value.length >= 2)
const trendHintText = computed(() => {
  if (store.cycles.length === 0) {
    return '持续记录至少 2 个周期后，这里会显示周期长度趋势。'
  }
  return '继续记录后可以观察趋势。'
})

function goRecord() {
  router.push('/record')
}

function loadDemo() {
  showConfirmDialog({
    title: '加载演示数据',
    message: '演示数据仅用于体验功能，将覆盖当前本地数据。',
    confirmButtonText: '继续加载',
    cancelButtonText: '取消'
  })
    .then(() => seedDemoData())
    .catch(() => {
      // 用户取消
    })
}
</script>

<template>
  <div class="hc-page stats-page">
    <!-- 顶部标题 -->
    <header class="stats-header">
      <h1 class="hc-page-title">周期统计</h1>
      <p class="stats-subtitle">了解你的周期变化趋势</p>
    </header>

    <!-- 完全无数据：空状态 -->
    <div v-if="!hasAnyData" class="stats-empty-hero hc-card">
      <VanEmpty
        image-size="110"
        description="开始记录你的周期"
      >
        <p class="empty-tip">持续记录后，这里会展示周期变化趋势。</p>
        <div class="empty-actions">
          <VanButton round type="primary" color="#E55D8C" @click="goRecord">
            去记录
          </VanButton>
        </div>
        <button class="empty-demo-link" @click="loadDemo">
          查看演示数据
        </button>
      </VanEmpty>
    </div>

    <template v-else>
      <!-- 核心指标 2×2 -->
      <div class="stats-grid">
        <StatisticCard
          title="平均周期"
          :value="avgCycle"
          unit="天"
          icon="clock-o"
          description="基于最近 6 个有效周期估算"
        />
        <StatisticCard
          title="平均经期"
          :value="avgPeriod"
          unit="天"
          icon="fire-o"
          description="基于完整经期记录"
        />
        <StatisticCard
          title="最近周期"
          :value="lastCycle"
          unit="天"
          icon="replay"
          description="最近一次完整周期长度"
        />
        <StatisticCard
          title="已记录周期"
          :value="registeredCycleCount || null"
          unit="次"
          icon="records"
          :description="`其中完整经期 ${completePeriodCount} 次`"
        />
      </div>

      <!-- 周期趋势 -->
      <section class="hc-card stats-section">
        <h2 class="section-title">周期趋势</h2>
        <p class="section-sub">最近最多 6 个完整周期长度</p>
        <CycleTrendChart v-if="showTrendChart" :lengths="cycleLengths" />
        <div v-else class="section-hint">
          <p>{{ trendHintText }}</p>
        </div>
      </section>

      <!-- 健康状态统计（有记录时展示） -->
      <template v-if="hasRecords">
        <!-- 疼痛统计 -->
        <section class="hc-card stats-section">
          <h2 class="section-title">疼痛等级分布</h2>
          <p class="section-sub">共 {{ painDist.total }} 条有效记录</p>
          <PainChart :counts="painDist.counts" />
        </section>

        <!-- 情绪统计 -->
        <section class="hc-card stats-section">
          <h2 class="section-title">情绪记录统计</h2>
          <p class="section-sub">共 {{ moodDist.total }} 条有效记录</p>
          <MoodChart :items="moodDist.items" :total="moodDist.total" />
        </section>

        <!-- 身体状态统计 -->
        <section class="hc-card stats-section">
          <h2 class="section-title">身体状态统计</h2>
          <p class="section-sub">同一条记录的多种状态分别计数</p>
          <BodyStatusChart :items="bodyDist.items" />
        </section>
      </template>

      <!-- 无健康记录但有周期数据时 -->
      <div v-if="!hasRecords" class="hc-card section-hint">
        <p>记录每日状态后，这里会显示疼痛、情绪与身体状态统计。</p>
        <VanButton size="small" round plain color="#E55D8C" @click="goRecord">
          去记录
        </VanButton>
      </div>
    </template>

    <!-- 统计说明 -->
    <footer class="stats-disclaimer">
      数据仅用于个人周期记录与趋势观察，不代表医学判断。
    </footer>
  </div>
</template>

<style scoped>
.stats-page {
  padding-bottom: 24px;
}
.stats-header {
  margin: 8px 0 16px;
}
.stats-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--hc-text-muted);
}

/* 空状态 */
.stats-empty-hero {
  padding: 32px 16px 28px;
  text-align: center;
}
.empty-tip {
  font-size: 13px;
  color: var(--hc-text-sub);
  margin: 4px 0 20px;
}
.empty-actions {
  margin-bottom: 16px;
}
.empty-demo-link {
  border: none;
  background: none;
  color: var(--hc-text-muted);
  font-size: 12px;
  text-decoration: underline;
  padding: 4px;
}

/* 核心指标 2×2 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

/* 区块卡片 */
.stats-section {
  margin-top: 16px;
}
.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--hc-text-main);
}
.section-sub {
  margin: 4px 0 10px;
  font-size: 12px;
  color: var(--hc-text-muted);
}
.section-hint {
  padding: 28px 16px;
  text-align: center;
  margin-top: 8px;
  color: var(--hc-text-sub);
  font-size: 13px;
  line-height: 1.7;
}
.section-hint p {
  margin: 0 0 12px;
}

/* 免责声明 */
.stats-disclaimer {
  margin-top: 20px;
  text-align: center;
  font-size: 11px;
  color: var(--hc-text-muted);
  line-height: 1.7;
  padding: 0 12px;
}
</style>
