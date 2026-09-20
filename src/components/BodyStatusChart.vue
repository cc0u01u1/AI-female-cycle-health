<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { EChartsOption } from 'echarts'
import { useECharts } from '@/composables/useECharts'
import type { BodyStatus } from '@/types/cycle'

interface BodyItem {
  key: BodyStatus
  label: string
  value: number
}

interface Props {
  items: BodyItem[]
}

const props = defineProps<Props>()

const el = ref<HTMLElement | null>(null)
const { setOption } = useECharts(el)

function buildOption(): EChartsOption {
  // ECharts 横向柱状图最后一项显示在最上方，反转一次使"正常"在顶
  const ordered = [...props.items].reverse()
  const categories = ordered.map((i) => i.label)
  const values = ordered.map((i) => i.value)

  return {
    grid: { left: 52, right: 28, top: 16, bottom: 24 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params
        return `${p.name}<br/>记录：<b>${p.value}</b> 次`
      }
    },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#F5EDF1' } },
      axisLabel: { color: '#9AA0A6', fontSize: 11 }
    },
    yAxis: {
      type: 'category',
      data: categories,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#E8DCE4' } },
      axisLabel: { color: '#6B6677', fontSize: 12 }
    },
    series: [
      {
        type: 'bar',
        data: values,
        barWidth: '56%',
        itemStyle: {
          color: '#B891D6',
          borderRadius: [0, 6, 6, 0]
        },
        label: {
          show: true,
          position: 'right',
          color: '#6B6677',
          fontSize: 11
        }
      }
    ]
  }
}

function render() {
  if (props.items.length) setOption(buildOption())
}

onMounted(render)
watch(() => props.items, render, { deep: true })
</script>

<template>
  <div ref="el" class="chart-box body-chart"></div>
</template>

<style scoped>
.chart-box {
  width: 100%;
  height: 230px;
}
</style>
