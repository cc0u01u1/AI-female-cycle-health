<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Cell as VanCell,
  CellGroup as VanCellGroup,
  Stepper as VanStepper,
  Button as VanButton,
  showSuccessToast,
  showConfirmDialog
} from 'vant'
import { useCycleStore } from '@/stores/cycle'

const router = useRouter()
const store = useCycleStore()

// 周期设置（直接绑定 store.settings，watch 自动持久化）
const defaultCycleLength = computed({
  get: () => store.settings.defaultCycleLength,
  set: (v: number) => store.updateSettings({ defaultCycleLength: v })
})
const defaultPeriodLength = computed({
  get: () => store.settings.defaultPeriodLength,
  set: (v: number) => store.updateSettings({ defaultPeriodLength: v })
})

// 数据统计
const recordCount = computed(() => store.records.length)
const periodCount = computed(() => store.cycles.length)

/** 清空全部本地数据（含 AI 分析缓存） */
function onClearAll() {
  showConfirmDialog({
    title: '确定清空全部数据？',
    message:
      '此操作会删除：\n• 健康记录\n• 经期记录\n• 周期设置\n• AI 分析缓存\n\n删除后无法恢复。',
    confirmButtonText: '清空全部',
    confirmButtonColor: '#E55D8C',
    cancelButtonText: '取消',
    messageAlign: 'left'
  })
    .then(() => {
      store.clearAll()
      showSuccessToast('数据已清空')
      router.replace('/home')
    })
    .catch(() => {
      // 用户取消
    })
}
</script>

<template>
  <div class="hc-page profile-page">
    <h1 class="hc-page-title">我的</h1>

    <!-- 周期设置 -->
    <h2 class="pf-section-title">周期设置</h2>
    <VanCellGroup inset class="pf-group">
      <VanCell title="默认周期长度" title-class="pf-cell-title">
        <template #value>
          <VanStepper
            v-model="defaultCycleLength"
            :min="15"
            :max="60"
            :step="1"
            theme="round"
            integer
          />
        </template>
      </VanCell>
      <VanCell title="默认经期长度" title-class="pf-cell-title">
        <template #value>
          <VanStepper
            v-model="defaultPeriodLength"
            :min="1"
            :max="15"
            :step="1"
            theme="round"
            integer
          />
        </template>
      </VanCell>
    </VanCellGroup>
    <p class="pf-tip">
      默认值用于尚无足够历史数据时的周期估算。
    </p>

    <!-- 数据管理 -->
    <h2 class="pf-section-title">数据管理</h2>
    <VanCellGroup inset class="pf-group">
      <VanCell title="健康记录" :value="`${recordCount} 条`" />
      <VanCell title="经期记录" :value="`${periodCount} 条`" />
    </VanCellGroup>
    <div class="pf-clear">
      <VanButton
        block
        round
        plain
        type="danger"
        @click="onClearAll"
      >
        清空全部本地数据
      </VanButton>
    </div>

    <!-- 关于 -->
    <h2 class="pf-section-title">关于</h2>
    <VanCellGroup inset class="pf-group">
      <VanCell title="她周期" value="v1.0.0" />
      <VanCell title="前端技术" value="Vue 3 · TypeScript · Vant · ECharts" />
      <VanCell title="后端技术" value="FastAPI · Pydantic · httpx" />
      <VanCell title="AI 服务" value="DeepSeek" />
    </VanCellGroup>

    <!-- 免责声明 -->
    <footer class="pf-disclaimer">
      本应用仅用于个人健康记录和信息整理，<br />
      不用于疾病诊断、治疗或医疗决策。
    </footer>
  </div>
</template>

<style scoped>
.profile-page {
  padding-bottom: 32px;
}
.pf-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--hc-text-sub);
  margin: 18px 16px 8px;
}
.pf-group {
  border-radius: var(--hc-radius);
  overflow: hidden;
  box-shadow: var(--hc-shadow);
}
:deep(.pf-cell-title) {
  font-size: 14px;
}
.pf-tip {
  margin: 8px 20px 0;
  font-size: 11px;
  color: var(--hc-text-muted);
  line-height: 1.6;
}
.pf-clear {
  margin: 12px 16px 0;
}
.pf-disclaimer {
  margin-top: 28px;
  text-align: center;
  font-size: 11px;
  color: var(--hc-text-muted);
  line-height: 1.8;
}
</style>
