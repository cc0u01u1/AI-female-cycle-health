<script setup lang="ts">
import { computed, onActivated, ref } from 'vue'
import {
  Icon,
  Loading,
  Button as VanButton,
  Collapse as VanCollapse,
  CollapseItem as VanCollapseItem
} from 'vant'
import dayjs from 'dayjs'
import type { AIAnalyzeRequest, AIAnalyzeResponse } from '@/types/ai'
import { analyzeHealth } from '@/api/ai'
import { StorageKeys, loadJSON, saveJSON } from '@/utils/storage'

interface Props {
  /** 由父组件构造好的 AI 请求体（来自 aiPayload.ts） */
  request: AIAnalyzeRequest
}

const props = defineProps<Props>()

type Status = 'idle' | 'loading' | 'success' | 'error'

const status = ref<Status>('idle')
const data = ref<AIAnalyzeResponse | null>(null)
const errorMsg = ref('')

// 上次分析时间（ISO 或 ''）
const lastAnalysisISO = ref<string>(
  loadJSON<string>(StorageKeys.AI_LAST_ANALYSIS, '')
)

/** 是否完全没有可分析的数据（无记录无经期） */
const hasAnalyzableData = computed(
  () =>
    props.request.recentRecords.length > 0 ||
    props.request.recentPeriods.length > 0
)

/** 上次分析时间的友好展示：今天 HH:mm / 昨天 HH:mm / M月D日 HH:mm */
const lastAnalysisText = computed(() => {
  if (!lastAnalysisISO.value) return ''
  const d = dayjs(lastAnalysisISO.value)
  const hm = d.format('HH:mm')
  const now = dayjs()
  if (d.isSame(now, 'day')) return `今天 ${hm}`
  if (d.isSame(now.subtract(1, 'day'), 'day')) return `昨天 ${hm}`
  return `${d.format('M月D日')} ${hm}`
})

// keep-alive 重新激活时重新读取（数据在 Profile 被清空后，重置卡片）
onActivated(() => {
  const stored = loadJSON<string>(StorageKeys.AI_LAST_ANALYSIS, '')
  if (stored !== lastAnalysisISO.value) {
    lastAnalysisISO.value = stored
    if (!stored) {
      status.value = 'idle'
      data.value = null
      errorMsg.value = ''
    }
  }
})

// Collapse 默认展开观察与建议
const activeCollapse = ref<string[]>(['observations', 'suggestions'])

async function onAnalyze() {
  if (status.value === 'loading') return // loading 期间禁止再次请求
  // 空数据拦截：不发送无意义请求
  if (!hasAnalyzableData.value) {
    errorMsg.value = '请先记录一些周期或健康状态，再进行 AI 分析。'
    status.value = 'error'
    return
  }
  status.value = 'loading'
  errorMsg.value = ''
  try {
    data.value = await analyzeHealth(props.request)
    status.value = 'success'
    const ts = new Date().toISOString()
    lastAnalysisISO.value = ts
    saveJSON(StorageKeys.AI_LAST_ANALYSIS, ts)
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '暂时无法连接 AI 服务'
    status.value = 'error'
  }
}
</script>

<template>
  <section class="ai-card hc-card">
    <div class="ai-header">
      <div class="ai-avatar">
        <Icon name="chat-o" />
      </div>
      <div class="ai-meta">
        <div class="ai-name">AI 健康信息助手</div>
        <div class="ai-sub">根据你的近期记录，看看今天的状态</div>
      </div>
    </div>

    <!-- 上次分析时间 -->
    <div v-if="lastAnalysisText && status !== 'loading'" class="ai-last-time">
      <Icon name="underway-o" class="ai-last-icon" />
      上次分析：{{ lastAnalysisText }}
    </div>

    <!-- idle -->
    <template v-if="status === 'idle'">
      <p class="ai-tip">根据近期记录分析今日状态</p>
      <VanButton
        block
        round
        plain
        color="#E55D8C"
        class="ai-btn"
        @click="onAnalyze"
      >
        AI 分析今日状态
      </VanButton>
    </template>

    <!-- loading -->
    <template v-else-if="status === 'loading'">
      <div class="ai-loading">
        <Loading size="18" color="#E55D8C" vertical>正在整理你的近期记录…</Loading>
      </div>
      <VanButton block round disabled class="ai-btn">分析中…</VanButton>
    </template>

    <!-- success -->
    <template v-else-if="status === 'success' && data">
      <!-- 总结（常驻可见） -->
      <div class="ai-block ai-summary-block">
        <div class="ai-block-title">
          <Icon name="points" class="ai-block-icon" />总结
        </div>
        <p class="ai-summary">{{ data.summary }}</p>
      </div>

      <!-- 可折叠：观察 / 建议 / 免责声明 -->
      <VanCollapse v-model="activeCollapse" class="ai-collapse">
        <VanCollapseItem title="近期观察" name="observations">
          <ul class="ai-list">
            <li v-for="(o, i) in data.observations" :key="`o-${i}`">{{ o }}</li>
          </ul>
        </VanCollapseItem>
        <VanCollapseItem title="生活建议" name="suggestions">
          <ul class="ai-list">
            <li v-for="(s, i) in data.suggestions" :key="`s-${i}`">{{ s }}</li>
          </ul>
        </VanCollapseItem>
        <VanCollapseItem title="免责声明" name="disclaimer">
          <p class="ai-disclaimer-text">{{ data.disclaimer }}</p>
        </VanCollapseItem>
      </VanCollapse>

      <VanButton
        block
        round
        plain
        color="#E55D8C"
        class="ai-btn"
        @click="onAnalyze"
      >
        重新分析
      </VanButton>
    </template>

    <!-- error -->
    <template v-else-if="status === 'error'">
      <p class="ai-error">暂时无法连接 AI 服务</p>
      <p class="ai-error-detail">{{ errorMsg }}</p>
      <VanButton
        block
        round
        plain
        color="#E55D8C"
        class="ai-btn"
        @click="onAnalyze"
      >
        重新尝试
      </VanButton>
    </template>

    <div class="ai-footer">
      <span class="ai-foot-note">* 健康管理工具，非医疗诊断。</span>
    </div>
  </section>
</template>

<style scoped>
.ai-card {
  background: linear-gradient(135deg, #ffffff 0%, #fff5f8 100%);
  border: 1px solid #f3e3ea;
}
.ai-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.ai-avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: linear-gradient(135deg, #e55d8c 0%, #c77dd3 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  font-size: 18px;
  flex-shrink: 0;
}
.ai-meta {
  flex: 1;
  min-width: 0;
}
.ai-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--hc-text-main);
}
.ai-sub {
  font-size: 12px;
  color: var(--hc-text-sub);
}

/* 上次分析时间 */
.ai-last-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--hc-text-muted);
  padding: 2px 0 10px;
}
.ai-last-icon {
  font-size: 12px;
}

.ai-tip {
  font-size: 14px;
  color: var(--hc-text-main);
  margin: 0 0 12px;
}

/* 总结区块 */
.ai-summary-block {
  background: #faf6f8;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
}
.ai-block-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--hc-primary);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.ai-block-icon {
  font-size: 13px;
}
.ai-summary {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--hc-text-main);
  word-break: break-word;
}

/* 折叠面板 */
.ai-collapse {
  margin-bottom: 10px;
}
.ai-collapse :deep(.van-cell) {
  background: #faf6f8;
  padding: 11px 12px;
}
.ai-collapse :deep(.van-collapse-item__title) {
  font-size: 13px;
  font-weight: 600;
}
.ai-collapse :deep(.van-collapse-item__wrapper .van-cell) {
  border-top: 1px solid #f3e9ee;
}
.ai-list {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--hc-text-main);
}
.ai-list li {
  word-break: break-word;
  margin-bottom: 2px;
}
.ai-disclaimer-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--hc-text-muted);
  word-break: break-word;
}

/* loading / error */
.ai-loading {
  padding: 16px 0;
  font-size: 13px;
  color: var(--hc-text-sub);
}
.ai-error {
  font-size: 14px;
  color: var(--hc-text-main);
  margin: 0 0 4px;
}
.ai-error-detail {
  font-size: 12px;
  color: var(--hc-text-muted);
  margin: 0 0 12px;
  word-break: break-word;
}

.ai-btn {
  height: 40px;
  font-weight: 600;
}

.ai-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
.ai-foot-note {
  font-size: 11px;
  color: var(--hc-text-muted);
}
</style>
