<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast, showFailToast, showConfirmDialog } from 'vant'
import { useCycleStore } from '@/stores/cycle'
import { today, formatChineseDate } from '@/utils/date'
import { isFutureDate } from '@/utils/periodHelpers'
import HealthRecordForm from '@/components/HealthRecordForm.vue'
import type { HealthRecord } from '@/types/cycle'

const route = useRoute()
const router = useRouter()
const store = useCycleStore()

// 从 URL 读取 date，默认今天
function readDateFromQuery(): string {
  const q = route.query.date
  if (typeof q === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q)) {
    return q
  }
  return today()
}

const date = ref<string>(readDateFromQuery())

// URL query 变化时同步（例如从日历点击"记录这一天"再返回到不同日期）
watch(
  () => route.query.date,
  () => {
    date.value = readDateFromQuery()
  }
)

// 已有记录（编辑模式自动填充）
const initialRecord = computed<HealthRecord | undefined>(() =>
  store.getRecordByDate(date.value)
)

// 顶部标题
const pageTitle = computed(() => (initialRecord.value ? '修改记录' : '记录状态'))

function onSubmit(record: HealthRecord) {
  try {
    store.saveRecord(record)
    showSuccessToast({
      message: '记录已保存',
      duration: 800,
      onClose: () => {
        // 优先返回上一页，无历史则回首页
        if (window.history.length > 1) {
          router.back()
        } else {
          router.replace('/home')
        }
      }
    })
  } catch (err) {
    console.error('[Record] save failed:', err)
    showFailToast('保存失败，请稍后再试')
  }
}

function onDelete(dateStr: string) {
  showConfirmDialog({
    title: '删除记录',
    message: `确定删除 ${formatChineseDate(dateStr)} 的记录吗？`,
    confirmButtonText: '删除',
    confirmButtonColor: '#E55D8C',
    cancelButtonText: '取消'
  })
    .then(() => {
      const ok = store.deleteRecord(dateStr)
      if (!ok) {
        showFailToast('该日期暂无记录')
        return
      }
      showSuccessToast({
        message: '已删除',
        duration: 800,
        onClose: () => {
          if (window.history.length > 1) {
            router.back()
          } else {
            router.replace('/calendar')
          }
        }
      })
    })
    .catch(() => {
      // 用户取消，不操作
    })
}

function onCancel() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/home')
  }
}

// ===== 经期入口 =====
const periodForDate = computed(() => store.getPeriodByDate(date.value))
const activePeriod = computed(() => store.getActivePeriod())
const canStartPeriod = computed(
  () => !periodForDate.value && !activePeriod.value && !isFutureDate(date.value)
)
const canEndPeriod = computed(
  () =>
    !!activePeriod.value &&
    !!periodForDate.value &&
    !periodForDate.value.endDate &&
    date.value >= periodForDate.value.startDate
)

function onStartPeriod() {
  const r = store.startPeriod(date.value)
  if (r.ok) showSuccessToast('已记录为经期开始')
  else showFailToast(r.message || '操作失败')
}

function onEndPeriod() {
  const r = store.endPeriod(date.value)
  if (r.ok) showSuccessToast('经期已结束')
  else showFailToast(r.message || '操作失败')
}
</script>

<template>
  <div class="hc-page record-page">
    <!-- 顶部标题 -->
    <header class="rec-header">
      <h1 class="hc-page-title">{{ pageTitle }}</h1>
      <p class="rec-date">{{ formatChineseDate(date) }}</p>
    </header>

    <!-- 经期入口 -->
    <div class="rec-period-bar">
      <template v-if="canStartPeriod">
        <span class="rpb-text">这一天是经期开始吗？</span>
        <VanButton size="small" round plain color="#E55D8C" @click="onStartPeriod">
          记录为经期开始
        </VanButton>
      </template>
      <template v-else-if="canEndPeriod">
        <span class="rpb-text rpb-text--active">经期进行中</span>
        <VanButton size="small" round plain color="#B891D6" @click="onEndPeriod">
          在这一天结束经期
        </VanButton>
      </template>
      <template v-else-if="periodForDate">
        <span class="rpb-text">该日期在经期记录内</span>
      </template>
      <template v-else-if="activePeriod">
        <span class="rpb-text">已有进行中的经期（{{ formatChineseDate(activePeriod.startDate) }} 开始）</span>
      </template>
    </div>

    <!-- 健康记录表单 -->
    <HealthRecordForm
      :key="date"
      :initial-record="initialRecord"
      :default-date="date"
      @submit="onSubmit"
      @delete="onDelete"
      @cancel="onCancel"
    />
  </div>
</template>

<style scoped>
.record-page {
  padding-bottom: 32px;
}
.rec-header {
  margin: 8px 0 4px;
}
.rec-date {
  font-size: 13px;
  color: var(--hc-text-muted);
  margin: 4px 0 0;
}

/* 经期入口条 */
.rec-period-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  background: #fff;
  border-radius: 12px;
  box-shadow: var(--hc-shadow);
  padding: 10px 14px;
  margin: 12px 0 4px;
}
.rpb-text {
  font-size: 13px;
  color: var(--hc-text-sub);
}
.rpb-text--active {
  color: var(--hc-primary);
  font-weight: 600;
}
</style>
