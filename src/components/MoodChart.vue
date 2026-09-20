<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { EChartsOption } from 'echarts'
import { useECharts } from '@/composables/useECharts'
import type { MoodType } from '@/types/cycle'

interface MoodItem {
  key: MoodType
  label: string
  value: number
}

interface Props {
  items: MoodItem[]
  total: number
}

const props = defineProps<Props>()

const el = ref<HTMLElement | null>(null)
const { setOption } = useECharts(el)

/** 情绪配色（柔和、易区分） */
const MOOD_COLORS: Record<MoodType, string> = {
  great: '#7DBF8A',
  normal: '#F8A5B8',
  low: '#7FB6DD',
  anxious: '#B891D6',
  irritable: '#F0A04B'
}

function buildOption(): EChartsOption {
  const data = props.items.map((i) => ({
    name: i.label,
    value: i.value,
    itemStyle: { color: MOOD_COLORS[i.key] }
  }))

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        // trigger: 'item' 时为单个数据项参数
        const p = params as unknown as {
          name: string
          value: number
          percent: number
        }
        return `${p.name}<br/>记录：<b>${p.value}</b> 次（${p.percent}%）`
      }
    },
    legend: {
      bottom: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 12,
      textStyle: { color: '#6B6677', fontSize: 11 }
    },
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '38%',
        style: {
          text: String(props.total),
          fontSize: 22,
          fontWeight: 700,
          fill: '#2B2233'
        }
      },
      {
        type: 'text',
        left: 'center',
        top: '52%',
        style: {
          text: '总记录',
          fontSize: 11,
          fill: '#9AA0A6'
        }
      }
    ],
    series: [
      {
        type: 'pie',
        radius: ['46%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2
        },
        data
      }
    ]
  }
}

function render() {
  if (props.total > 0) setOption(buildOption())
}

onMounted(render)
watch(() => [props.items, props.total], render, { deep: true })
</script>

<template>
  <div ref="el" class="chart-box mood-chart"></div>
</template>

<style scoped>
.chart-box {
  width: 100%;
  height: 250px;
}
</style>
