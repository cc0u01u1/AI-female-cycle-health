<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { EChartsOption } from 'echarts'
import { useECharts } from '@/composables/useECharts'

interface Props {
  /** 各疼痛等级（0-5）记录次数 */
  counts: number[]
}

const props = defineProps<Props>()

const el = ref<HTMLElement | null>(null)
const { setOption } = useECharts(el)

function buildOption(): EChartsOption {
  const categories = ['0', '1', '2', '3', '4', '5']
  return {
    grid: { left: 32, right: 16, top: 30, bottom: 30 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params
        return `疼痛 ${p.name} 级<br/>记录：<b>${p.value}</b> 次`
      }
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#E8DCE4' } },
      axisLabel: { color: '#9AA0A6', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#F5EDF1' } },
      axisLabel: { color: '#9AA0A6', fontSize: 11 }
    },
    series: [
      {
        type: 'bar',
        data: props.counts,
        barWidth: '52%',
        itemStyle: {
          color: '#E55D8C',
          borderRadius: [6, 6, 0, 0]
        }
      }
    ]
  }
}

function render() {
  if (props.counts.length) setOption(buildOption())
}

onMounted(render)
watch(() => props.counts, render, { deep: true })
</script>

<template>
  <div ref="el" class="chart-box pain-chart"></div>
</template>

<style scoped>
.chart-box {
  width: 100%;
  height: 220px;
}
</style>
