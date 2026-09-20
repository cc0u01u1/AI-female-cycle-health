<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Field as VanField,
  CellGroup as VanCellGroup,
  Cell as VanCell,
  RadioGroup as VanRadioGroup,
  Radio as VanRadio,
  Slider as VanSlider,
  CheckboxGroup as VanCheckboxGroup,
  Checkbox as VanCheckbox,
  Stepper as VanStepper,
  Button as VanButton,
  Popup as VanPopup,
  DatePicker as VanDatePicker,
  showFailToast
} from 'vant'
import type { BodyStatus, HealthRecord } from '@/types/cycle'
import {
  FLOW_LABELS,
  FLOW_VALUES,
  MOOD_LABELS,
  MOOD_VALUES,
  BODY_STATUS_LABELS,
  BODY_STATUS_VALUES,
  validateRecord,
  buildEmptyRecord
} from '@/utils/recordHelpers'
import { formatChineseDate, today } from '@/utils/date'

interface Props {
  /** 已有记录（编辑模式自动填充），无则按 defaultDate 新建 */
  initialRecord?: HealthRecord
  /** 默认日期 YYYY-MM-DD，仅新增模式生效 */
  defaultDate?: string
  /** 是否显示删除按钮（默认仅编辑模式显示） */
  showDelete?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialRecord: undefined,
  defaultDate: () => today(),
  showDelete: true
})

const emit = defineEmits<{
  (e: 'submit', record: HealthRecord): void
  (e: 'delete', date: string): void
  (e: 'cancel'): void
}>()

// 表单模型：编辑模式直接复制原记录，新增模式按默认日期构造空记录
const model = ref<HealthRecord>(
  props.initialRecord ? { ...props.initialRecord } : buildEmptyRecord(props.defaultDate)
)

// 监听 props 变化（例如父组件根据 query.date 切换记录）
watch(
  () => props.initialRecord,
  (rec) => {
    if (rec) {
      model.value = { ...rec, bodyStatus: [...rec.bodyStatus] }
    } else {
      model.value = buildEmptyRecord(props.defaultDate)
    }
  }
)
watch(
  () => props.defaultDate,
  (d) => {
    if (!props.initialRecord) {
      model.value = buildEmptyRecord(d)
    }
  }
)

const isEdit = computed(() => !!props.initialRecord)

// 日期选择器
const showDatePicker = ref(false)
const datePickerValue = ref<string[]>(model.value.date.split('-'))

function openDatePicker() {
  datePickerValue.value = model.value.date.split('-')
  showDatePicker.value = true
}
function onDateConfirm(payload: { selectedValues: string[] }) {
  const [y, m, d] = payload.selectedValues
  if (y && m && d) {
    model.value.date = `${y}-${m}-${d}`
  }
  showDatePicker.value = false
}

// 日期选择器范围：最近 2 年到今天
const minDate = computed(() => {
  const d = new Date()
  return new Date(d.getFullYear() - 2, 0, 1)
})
const maxDate = computed(() => new Date())

// 身体状态互斥逻辑：选了"正常"清空其它；选了其它移除"正常"
function onBodyStatusChange(_checked: BodyStatus[]) {
  // CheckboxGroup 变化回调（保留接口，主要逻辑在 onCheckboxClick）
}
function onCheckboxClick(item: BodyStatus) {
  const list = model.value.bodyStatus
  if (item === 'normal') {
    // 选中"正常"，清空其它
    if (list.includes('normal')) {
      model.value.bodyStatus = list.filter((v) => v === 'normal')
    } else {
      model.value.bodyStatus = ['normal']
    }
  } else {
    // 选中其它：移除"正常"
    const withoutNormal = list.filter((v) => v !== 'normal')
    if (withoutNormal.includes(item)) {
      model.value.bodyStatus = withoutNormal.filter((v) => v !== item)
      if (model.value.bodyStatus.length === 0) {
        model.value.bodyStatus = ['normal']
      }
    } else {
      model.value.bodyStatus = [...withoutNormal, item]
    }
  }
}

function onSubmit() {
  // 至少要有一项身体状态
  if (model.value.bodyStatus.length === 0) {
    model.value.bodyStatus = ['normal']
  }
  // 防御性类型转换：Vant Stepper / Slider 偶尔会 emit 字符串
  const payload: HealthRecord = {
    ...model.value,
    pain: Number(model.value.pain),
    sleep: Number(model.value.sleep),
    bodyStatus: [...model.value.bodyStatus]
  }
  const result = validateRecord(payload)
  if (!result.ok) {
    showFailToast(result.errors[0] || '请检查填写内容')
    return
  }
  emit('submit', payload)
}

function onDelete() {
  emit('delete', model.value.date)
}

function onCancel() {
  emit('cancel')
}
</script>

<template>
  <div class="hrf">
    <VanCellGroup inset class="hrf-group">
      <!-- 日期 -->
      <VanField
        :model-value="formatChineseDate(model.date)"
        label="日期"
        placeholder="选择日期"
        readonly
        is-link
        input-align="right"
        @click="openDatePicker"
      />

      <!-- 经量 -->
      <VanCell title="经量" title-class="hrf-cell-title">
        <template #value>
          <VanRadioGroup v-model="model.flow" direction="horizontal" class="hrf-radios">
            <VanRadio
              v-for="f in FLOW_VALUES"
              :key="f"
              :name="f"
              shape="dot"
            >{{ FLOW_LABELS[f] }}</VanRadio>
          </VanRadioGroup>
        </template>
      </VanCell>

      <!-- 疼痛 -->
      <VanCell title="疼痛" title-class="hrf-cell-title">
        <template #value>
          <div class="hrf-slider">
            <span class="hrf-slider-num">{{ model.pain }}</span>
            <VanSlider
              v-model="model.pain"
              :min="0"
              :max="5"
              :step="1"
              bar-color="#E55D8C"
              active-color="#E55D8C"
            />
          </div>
        </template>
      </VanCell>

      <!-- 情绪 -->
      <VanCell title="情绪" title-class="hrf-cell-title">
        <template #value>
          <VanRadioGroup v-model="model.mood" direction="horizontal" class="hrf-radios">
            <VanRadio
              v-for="m in MOOD_VALUES"
              :key="m"
              :name="m"
              shape="dot"
            >{{ MOOD_LABELS[m] }}</VanRadio>
          </VanRadioGroup>
        </template>
      </VanCell>

      <!-- 睡眠 -->
      <VanCell title="睡眠（小时）" title-class="hrf-cell-title">
        <template #value>
          <VanStepper
            v-model="model.sleep"
            :min="0"
            :max="24"
            :step="0.5"
            :decimal-length="1"
            theme="round"
          />
        </template>
      </VanCell>

      <!-- 身体状态 -->
      <VanCell title="身体状态" title-class="hrf-cell-title">
        <template #value>
          <VanCheckboxGroup
            v-model="model.bodyStatus"
            direction="horizontal"
            class="hrf-checks"
            @change="onBodyStatusChange"
          >
            <VanCheckbox
              v-for="b in BODY_STATUS_VALUES"
              :key="b"
              :name="b"
              shape="square"
              @click="onCheckboxClick(b)"
            >{{ BODY_STATUS_LABELS[b] }}</VanCheckbox>
          </VanCheckboxGroup>
        </template>
      </VanCell>

      <!-- 备注 -->
      <VanField
        v-model="model.note"
        label="备注"
        type="textarea"
        placeholder="记录今天的特殊感受或事件"
        rows="2"
        autosize
        maxlength="200"
        show-word-limit
        input-align="right"
      />
    </VanCellGroup>

    <!-- 操作按钮 -->
    <div class="hrf-actions">
      <VanButton block round plain class="hrf-btn" @click="onCancel">取消</VanButton>
      <VanButton
        block
        round
        type="primary"
        color="#E55D8C"
        class="hrf-btn"
        @click="onSubmit"
      >
        {{ isEdit ? '保存修改' : '保存记录' }}
      </VanButton>
      <VanButton
        v-if="isEdit && showDelete"
        block
        round
        plain
        type="danger"
        class="hrf-btn"
        @click="onDelete"
      >
        删除记录
      </VanButton>
    </div>

    <!-- 日期选择器弹层 -->
    <VanPopup v-model:show="showDatePicker" position="bottom" round>
      <VanDatePicker
        v-model="datePickerValue"
        :columns-type="['year', 'month', 'day']"
        :min-date="minDate"
        :max-date="maxDate"
        title="选择日期"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
      />
    </VanPopup>
  </div>
</template>

<style scoped>
.hrf {
  margin-top: 12px;
}
.hrf-group {
  margin: 0;
  border-radius: var(--hc-radius);
  overflow: hidden;
  box-shadow: var(--hc-shadow);
}
:deep(.hrf-cell-title) {
  width: 90px;
  flex: 0 0 90px;
  color: var(--hc-text-sub);
  font-size: 14px;
}
.hrf-radios {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  justify-content: flex-end;
}
.hrf-radios :deep(.van-radio) {
  margin-bottom: 4px;
}
.hrf-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  justify-content: flex-end;
}
.hrf-checks :deep(.van-checkbox) {
  margin-bottom: 4px;
}
.hrf-slider {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 180px;
}
.hrf-slider-num {
  font-size: 14px;
  font-weight: 600;
  color: var(--hc-primary);
  min-width: 14px;
  text-align: center;
}
.hrf-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
  padding: 0 4px;
}
.hrf-btn {
  height: 46px;
  font-weight: 600;
}
</style>
