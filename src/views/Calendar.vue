<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Button as VanButton,
  Empty as VanEmpty,
  Tag,
  Popup as VanPopup,
  Switch as VanSwitch,
  DatePicker as VanDatePicker,
  showSuccessToast,
  showFailToast,
  showConfirmDialog
} from 'vant'
import { useCycleStore } from '@/stores/cycle'
import { today, formatChineseDate, addDays } from '@/utils/date'
import { getCycleDayForDate } from '@/utils/cycleCalculator'
import { isFutureDate, expandPeriodDates } from '@/utils/periodHelpers'
import {
  FLOW_LABELS,
  MOOD_LABELS,
  BODY_STATUS_LABELS,
  getRecordDateSet
} from '@/utils/recordHelpers'
import CalendarView from '@/components/CalendarView.vue'

const router = useRouter()
const store = useCycleStore()

// 选中日期，默认今天
const selectedDate = ref<string>(today())

// 已有记录日期集合
const recordDates = computed(() => getRecordDateSet(store.records))

// 历史经期日集合（真实 CyclePeriod 展开；进行中的经期覆盖到今天）
const periodDates = computed<Set<string>>(() => expandPeriodDates(store.cycles))

// ===== 经期操作 =====
const activePeriod = computed(() => store.getActivePeriod())
const selectedPeriod = computed(() => store.getPeriodByDate(selectedDate.value))
/** 能否将选中日期记录为经期开始 */
const canStartPeriodHere = computed(
  () => !selectedPeriod.value && !activePeriod.value && !isFutureDate(selectedDate.value)
)
/** 选中日期是进行中经期的开始日或覆盖日 → 可结束 */
const canEndHere = computed(
  () =>
    !!activePeriod.value &&
    !!selectedPeriod.value &&
    !selectedPeriod.value.endDate &&
    selectedDate.value >= selectedPeriod.value.startDate
)

function onStartPeriodHere() {
  const r = store.startPeriod(selectedDate.value)
  if (r.ok) showSuccessToast('已记录为经期开始')
  else showFailToast(r.message || '操作失败')
}

function onEndPeriodHere() {
  const r = store.endPeriod(selectedDate.value)
  if (r.ok) showSuccessToast('经期已结束')
  else showFailToast(r.message || '操作失败')
}

function onDeletePeriod() {
  if (!selectedPeriod.value) return
  showConfirmDialog({
    title: '删除经期',
    message: `确定删除 ${formatChineseDate(selectedPeriod.value.startDate)} 开始的经期记录吗？`,
    confirmButtonText: '删除',
    confirmButtonColor: '#E55D8C',
    cancelButtonText: '取消'
  })
    .then(() => {
      const r = store.deletePeriod(selectedPeriod.value!.id)
      if (r.ok) showSuccessToast('已删除')
      else showFailToast(r.message || '删除失败')
    })
    .catch(() => {
      // 用户取消
    })
}

// ===== 编辑经期（Popup + DatePicker，校验全部复用 store.updatePeriod） =====
const showEditPopup = ref(false)
/** 编辑中的开始日期 */
const editStart = ref('')
/** 编辑中的结束日期（'' 表示进行中） */
const editEnd = ref('')
/** 是否标记结束日期（关 = 进行中） */
const editHasEnd = ref(false)

// 日期选择弹层
const showEditDatePicker = ref(false)
const editDatePickerTarget = ref<'start' | 'end'>('start')
const editDatePickerValue = ref<string[]>([])

function openEditPeriod() {
  if (!selectedPeriod.value) return
  editStart.value = selectedPeriod.value.startDate
  editEnd.value = selectedPeriod.value.endDate || ''
  editHasEnd.value = !!selectedPeriod.value.endDate
  showEditPopup.value = true
}

function openEditDatePicker(target: 'start' | 'end') {
  editDatePickerTarget.value = target
  const base = target === 'start' ? editStart.value : editEnd.value
  editDatePickerValue.value = (base || today()).split('-')
  showEditDatePicker.value = true
}

function onEditDateConfirm(payload: { selectedValues: string[] }) {
  const [y, m, d] = payload.selectedValues
  if (y && m && d) {
    const val = `${y}-${m}-${d}`
    if (editDatePickerTarget.value === 'start') editStart.value = val
    else {
      editEnd.value = val
      editHasEnd.value = true
    }
  }
  showEditDatePicker.value = false
}

/** 结束开关切换：关闭时清空 endDate（进行中） */
function onEditHasEndChange(checked: boolean) {
  editHasEnd.value = checked
  if (!checked) editEnd.value = ''
}

function onEditConfirm() {
  if (!selectedPeriod.value) return
  // 构造更新对象，校验逻辑全部在 store.updatePeriod（未来/先后/重复开始/重叠）
  const updated = {
    ...selectedPeriod.value,
    startDate: editStart.value,
    endDate: editHasEnd.value && editEnd.value ? editEnd.value : undefined
  }
  const r = store.updatePeriod(updated)
  if (!r.ok) {
    showFailToast(r.message || '修改失败')
    return
  }
  showSuccessToast('经期已修改')
  showEditPopup.value = false
}

// 编辑日期选择器范围：最近 2 年到今天
const editPickerMinDate = computed(() => {
  const d = new Date()
  return new Date(d.getFullYear() - 2, 0, 1)
})
const editPickerMaxDate = computed(() => new Date())

// 预测经期区间
const predictedRange = computed(() => {
  const next = store.currentStatus.nextPeriodDate
  if (!next) return null
  // 默认经期长度
  const periodLen = store.settings.defaultPeriodLength
  const endStr = addDays(next, Math.max(1, periodLen) - 1)
  return { start: next, end: endStr }
})

// 选中日期对应的记录
const selectedRecord = computed(() => store.getRecordByDate(selectedDate.value))

// 选中日期的周期日（若无周期数据则为 null）
const selectedCycleDay = computed(() => getCycleDayForDate(selectedDate.value, store.cycles))

// 月份标题（CalendarView 月份切换时同步）
const monthTitle = ref<string>(formatChineseDate(selectedDate.value).replace(/日$/, '月'))

function onSelectDate(date: string) {
  selectedDate.value = date
}

function onMonthShow(payload: { year: number; month: number }) {
  monthTitle.value = `${payload.year}年${payload.month}月`
}

function goRecord() {
  router.push(`/record?date=${encodeURIComponent(selectedDate.value)}`)
}
</script>

<template>
  <div class="hc-page calendar-page">
    <!-- 顶部标题 -->
    <header class="cal-header">
      <h1 class="hc-page-title">周期日历</h1>
      <p class="cal-subtitle">记录与查看你的周期状态</p>
    </header>

    <!-- 月份指示 -->
    <div class="cal-month-tag">
      <Tag color="#fdeef3" text-color="#E55D8C" round size="medium">{{ monthTitle }}</Tag>
    </div>

    <!-- 日历视图 -->
    <CalendarView
      :default-date="selectedDate"
      :period-dates="periodDates"
      :predicted-range="predictedRange"
      :record-dates="recordDates"
      @select="onSelectDate"
      @month-show="onMonthShow"
    />

    <!-- 选中日期信息卡 -->
    <section class="hc-card cal-info-card">
      <div class="info-header">
        <div>
          <div class="info-date">{{ formatChineseDate(selectedDate) }}</div>
          <div class="info-cycle-day" v-if="selectedCycleDay !== null">
            周期第 {{ selectedCycleDay }} 天
          </div>
        </div>
        <div class="info-tags">
          <Tag v-if="selectedPeriod" color="#E55D8C" text-color="#fff" round size="medium">经期</Tag>
          <Tag v-if="selectedRecord" color="#fdeef3" text-color="#E55D8C" round size="medium">已记录</Tag>
        </div>
      </div>

      <!-- 有记录 -->
      <div v-if="selectedRecord" class="info-grid">
        <div class="info-item">
          <div class="info-label">经量</div>
          <div class="info-value">{{ FLOW_LABELS[selectedRecord.flow] }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">疼痛</div>
          <div class="info-value">{{ selectedRecord.pain }} / 5</div>
        </div>
        <div class="info-item">
          <div class="info-label">情绪</div>
          <div class="info-value">{{ MOOD_LABELS[selectedRecord.mood] }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">睡眠</div>
          <div class="info-value">{{ selectedRecord.sleep }} h</div>
        </div>
        <div class="info-item info-item--full">
          <div class="info-label">身体状态</div>
          <div class="info-value">
            <span v-for="b in selectedRecord.bodyStatus" :key="b" class="info-body-tag">
              {{ BODY_STATUS_LABELS[b] }}
            </span>
          </div>
        </div>
        <div class="info-item info-item--full" v-if="selectedRecord.note">
          <div class="info-label">备注</div>
          <div class="info-value info-note">{{ selectedRecord.note }}</div>
        </div>
      </div>

      <!-- 无记录 -->
      <div v-else class="info-empty">
        <VanEmpty description="这一天还没有记录" image-size="80" />
      </div>

      <!-- 操作按钮 -->
      <div class="info-actions">
        <!-- 经期操作 -->
        <div v-if="canStartPeriodHere || canEndHere || selectedPeriod" class="period-actions">
          <VanButton
            v-if="canStartPeriodHere"
            block
            round
            plain
            color="#E55D8C"
            @click="onStartPeriodHere"
          >
            记录为经期开始
          </VanButton>
          <VanButton
            v-if="canEndHere"
            block
            round
            plain
            color="#B891D6"
            @click="onEndPeriodHere"
          >
            在这一天结束经期
          </VanButton>
          <div v-if="selectedPeriod" class="period-edit-row">
            <VanButton
              block
              round
              plain
              color="#6B6677"
              @click="openEditPeriod"
            >
              修改经期
            </VanButton>
            <VanButton
              block
              round
              plain
              type="danger"
              @click="onDeletePeriod"
            >
              删除经期
            </VanButton>
          </div>
        </div>

        <VanButton
          block
          round
          type="primary"
          :color="selectedRecord ? '#B891D6' : '#E55D8C'"
          @click="goRecord"
        >
          {{ selectedRecord ? '修改记录' : '记录这一天' }}
        </VanButton>
      </div>
    </section>

    <!-- 编辑经期弹层 -->
    <VanPopup
      v-model:show="showEditPopup"
      position="bottom"
      round
      close-on-click-overlay
    >
      <div class="edit-popup">
        <h3 class="edit-popup-title">编辑经期</h3>

        <!-- 开始日期（必填） -->
        <div class="edit-row" @click="openEditDatePicker('start')">
          <span class="edit-row-label">开始日期</span>
          <span class="edit-row-value">{{ editStart }}</span>
        </div>

        <!-- 结束日期开关 -->
        <div class="edit-row">
          <span class="edit-row-label">标记结束日期</span>
          <VanSwitch
            :model-value="editHasEnd"
            active-color="#E55D8C"
            @change="onEditHasEndChange"
          />
        </div>

        <!-- 结束日期（开启时显示） -->
        <div
          v-if="editHasEnd"
          class="edit-row"
          @click="openEditDatePicker('end')"
        >
          <span class="edit-row-label">结束日期</span>
          <span class="edit-row-value">{{ editEnd || '选择日期' }}</span>
        </div>

        <p class="edit-tip">
          关闭「标记结束日期」可将该经期恢复为进行中。
        </p>

        <div class="edit-actions">
          <VanButton block round plain @click="showEditPopup = false">
            取消
          </VanButton>
          <VanButton
            block
            round
            type="primary"
            color="#E55D8C"
            @click="onEditConfirm"
          >
            确认修改
          </VanButton>
        </div>
      </div>
    </VanPopup>

    <!-- 编辑中的日期选择器 -->
    <VanPopup
      v-model:show="showEditDatePicker"
      position="bottom"
      round
    >
      <VanDatePicker
        v-model="editDatePickerValue"
        :columns-type="['year', 'month', 'day']"
        :min-date="editPickerMinDate"
        :max-date="editPickerMaxDate"
        title="选择日期"
        @confirm="onEditDateConfirm"
        @cancel="showEditDatePicker = false"
      />
    </VanPopup>
  </div>
</template>

<style scoped>
.calendar-page {
  padding-bottom: 24px;
}
.cal-header {
  margin: 8px 0 12px;
}
.cal-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--hc-text-muted);
}
.cal-month-tag {
  margin: 4px 0 12px;
}
.cal-info-card {
  margin-top: 16px;
}
.info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}
.info-date {
  font-size: 18px;
  font-weight: 600;
  color: var(--hc-text-main);
}
.info-cycle-day {
  font-size: 12px;
  color: var(--hc-text-sub);
  margin-top: 4px;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 8px 0;
}
.info-item {
  background: #faf6f8;
  border-radius: 12px;
  padding: 8px 4px;
  text-align: center;
}
.info-item--full {
  grid-column: 1 / -1;
  text-align: left;
  padding: 10px 12px;
}
.info-label {
  font-size: 11px;
  color: var(--hc-text-sub);
  margin-bottom: 4px;
}
.info-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--hc-text-main);
}
.info-body-tag {
  display: inline-block;
  padding: 2px 8px;
  background: #fff;
  border: 1px solid #f3e3ea;
  border-radius: 999px;
  margin-right: 4px;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 500;
}
.info-note {
  font-weight: 400;
  font-size: 13px;
  color: var(--hc-text-main);
  line-height: 1.6;
}
.info-empty {
  padding: 8px 0 4px;
}
.info-actions {
  margin-top: 12px;
}
.info-tags {
  display: flex;
  gap: 6px;
}
.period-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}
.period-edit-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/* 编辑弹层 */
.edit-popup {
  padding: 20px 16px calc(env(safe-area-inset-bottom) + 16px);
}
.edit-popup-title {
  margin: 0 0 12px;
  font-size: 17px;
  font-weight: 600;
  color: var(--hc-text-main);
  text-align: center;
}
.edit-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 4px;
  border-bottom: 1px solid #f3e9ee;
}
.edit-row-label {
  font-size: 14px;
  color: var(--hc-text-main);
}
.edit-row-value {
  font-size: 14px;
  color: var(--hc-primary);
  font-weight: 500;
}
.edit-tip {
  margin: 10px 0 16px;
  font-size: 12px;
  color: var(--hc-text-muted);
  line-height: 1.6;
}
.edit-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
</style>
