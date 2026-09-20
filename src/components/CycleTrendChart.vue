<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { EChartsOption } from 'echarts'
import { useECharts } from '@/composables/useECharts'

interface Props {
  /** 最近周期长度序列（按时间顺序，最多 6 个） */
  lengths: number[]
}

const props = defineProps<Props>()

const el = ref<HTMLElement | null>(null)
const { setOption } = useECharts(el)

function buildOption(): EChartsOption {
  const data = props.lengths
  const labels = data.map((_, i) => `第${i + 1}次`)
  const minV = Math.floor(Math.min(...data) - 2)
  const maxV = Math.ceil(Math.max(...data) + 2)

  return {
    grid: { left: 32, right: 18, top: 30, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params
        return `${p.name}<br/>周期长度：<b>${p.value}</b> 天`
      }
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#E8DCE4' } },
      axisLabel: { color: '#9AA0A6', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      min: minV,
      max: maxV,
      interval: Math.max(1, Math.round((maxV - minV) / 4)),
      splitLine: { lineStyle: { color: '#F5EDF1' } },
      axisLabel: { color: '#9AA0A6', fontSize: 11 }
    },
    series: [
      {
        type: 'line',
        data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 3, color: '#E55D8C' },
        itemStyle: { color: '#E55D8C', borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(229,93,140,0.18)' },
              { offset: 1, color: 'rgba(229,93,140,0.01)' }
            ]
          }
        }
      }
    ]
  }
}

function render() {
  if (props.lengths.length) setOption(buildOption())
}

onMounted(render)
watch(() => props.lengths, render, { deep: true })
</script>

<template>
  <div ref="el" class="chart-box trend-chart"></div>
</template>

<style scoped>
.chart-box {
  width: 100%;
  height: 240px;
}
</style>
