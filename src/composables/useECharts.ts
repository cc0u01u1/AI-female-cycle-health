import {
  onBeforeUnmount,
  onMounted,
  shallowRef,
  type Ref
} from 'vue'
// 按需引入 echarts/core（代替全量 import 'echarts'，显著减小 Statistics chunk）
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  GraphicComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import type { EChartsType, SetOptionOpts } from 'echarts/core'

/**
 * 按需注册项目实际用到的能力：
 * - 图表：折线（周期趋势）、柱状（疼痛 / 身体状态）、环形（情绪）
 * - 组件：grid / tooltip / legend / graphic（情绪图中心文字）
 * - 渲染器：Canvas
 */
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent,
  CanvasRenderer
])

export type EChartsInstance = EChartsType

/**
 * ECharts 生命周期复用 composable
 *
 * 标准模式：
 * - onMounted 初始化实例
 * - 监听 window resize 自动 resize
 * - onBeforeUnmount removeEventListener + dispose
 *
 * 注意：调用方应在 useECharts() 之后再注册自己的 onMounted 渲染，
 * 以保证初始化先于首次 setOption。
 */
export function useECharts(el: Ref<HTMLElement | null | undefined>) {
  const chart = shallowRef<EChartsType | null>(null)

  function handleResize(): void {
    chart.value?.resize()
  }

  onMounted(() => {
    if (!el.value) return
    chart.value = echarts.init(el.value)
    window.addEventListener('resize', handleResize)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
    chart.value?.dispose()
    chart.value = null
  })

  /** 数据更新时调用 setOption（不重新创建实例） */
  function setOption(option: EChartsOption, opts?: SetOptionOpts): void {
    chart.value?.setOption(option, opts)
  }

  function resize(): void {
    chart.value?.resize()
  }

  return { chart, setOption, resize }
}
