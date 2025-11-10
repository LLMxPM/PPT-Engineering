<template>
  <svg ref="svgRef" class="connector-svg" :style="{
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: zIndex,
    overflow: 'visible'
  }">
    <defs>
      <!-- 箭头标记定义 -->
      <marker v-if="arrow === 'end' || arrow === 'both'" :id="`arrow-end-${uniqueId}`" markerWidth="10"
        markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z " :fill="resolvedColor" />
      </marker>
      <marker v-if="arrow === 'start' || arrow === 'both'" :id="`arrow-start-${uniqueId}`" markerWidth="10"
        markerHeight="10" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M9,0 L9,6 L0,3 z" :fill="resolvedColor" />
      </marker>
    </defs>

    <path v-if="pathData" :d="pathData" :stroke="resolvedColor" :stroke-width="strokeWidth" fill="none"
      :stroke-dasharray="dashed ? '5,5' : 'none'"
      :marker-end="arrow === 'end' || arrow === 'both' ? `url(#arrow-end-${uniqueId})` : ''"
      :marker-start="arrow === 'start' || arrow === 'both' ? `url(#arrow-start-${uniqueId})` : ''" />
  </svg>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'

export interface ConnectorProps {
  // 起始元素选择器或 ref
  from: string | HTMLElement
  // 目标元素选择器或 ref
  to: string | HTMLElement
  // 连接类型：直线、折线、曲线
  type?: 'straight' | 'polyline' | 'curve'
  // 线条粗细
  strokeWidth?: number
  // 线条颜色（支持 CSS 颜色值或 CSS 变量，如 'var(--theme-text-primary)'）
  color?: string
  // 箭头位置：无、起点、终点、两端
  arrow?: 'none' | 'start' | 'end' | 'both'
  // 是否虚线
  dashed?: boolean
  // 起始锚点位置
  fromAnchor?: 'center' | 'top' | 'bottom' | 'left' | 'right'
  // 目标锚点位置
  toAnchor?: 'center' | 'top' | 'bottom' | 'left' | 'right'
  // z-index
  zIndex?: number
  // 曲线弯曲程度（仅对 curve 类型有效）
  curvature?: number
}

const props = withDefaults(defineProps<ConnectorProps>(), {
  type: 'straight',
  strokeWidth: 2,
  color: '#000000',
  arrow: 'none',
  dashed: false,
  fromAnchor: 'center',
  toAnchor: 'center',
  zIndex: 1,
  curvature: 0.5
})

// 解析颜色值，支持 CSS 变量
const resolvedColor = computed(() => {
  const color = props.color

  // 如果是 CSS 变量格式（如 var(--theme-text-primary)）
  if (color.startsWith('var(')) {
    // 从 DOM 中获取计算后的颜色值
    const varMatch = color.match(/var\((--[^)]+)\)/)
    if (varMatch && varMatch[1]) {
      const varName = varMatch[1]
      // 从根元素获取 CSS 变量的值
      const computedColor = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
      return computedColor || color // 如果获取失败，返回原始值
    }
  }

  // 直接返回颜色值
  return color
})

const pathData = ref('')
const uniqueId = ref(Math.random().toString(36).substring(2, 11))
const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

// 获取元素
const getElement = (target: string | HTMLElement): HTMLElement | null => {
  if (typeof target === 'string') {
    return document.querySelector(target)
  }
  return target
}

// 查找共同的父容器（最近的定位祖先）
const findCommonContainer = (el1: HTMLElement, el2: HTMLElement): HTMLElement => {
  const getParents = (el: HTMLElement): HTMLElement[] => {
    const parents: HTMLElement[] = []
    let current = el.parentElement
    while (current) {
      parents.push(current)
      current = current.parentElement
    }
    return parents
  }

  const parents1 = getParents(el1)
  const parents2 = getParents(el2)

  // 找到第一个共同的父元素
  for (const parent of parents1) {
    if (parents2.includes(parent)) {
      return parent
    }
  }

  return document.body
}

// 获取元素相对于容器的位置（不受 transform 影响）
const getElementPosition = (element: HTMLElement, container: HTMLElement): { x: number; y: number; width: number; height: number } => {
  // 使用 offsetLeft/offsetTop 递归计算相对位置
  let x = 0
  let y = 0
  let current: HTMLElement | null = element

  while (current && current !== container) {
    x += current.offsetLeft
    y += current.offsetTop
    current = current.offsetParent as HTMLElement | null

    if (current === container) {
      break
    }
  }

  return {
    x,
    y,
    width: element.offsetWidth,
    height: element.offsetHeight
  }
}

// 获取锚点坐标（相对于容器）
const getAnchorPoint = (
  element: HTMLElement,
  anchor: 'center' | 'top' | 'bottom' | 'left' | 'right',
  container: HTMLElement
): { x: number; y: number } => {
  const pos = getElementPosition(element, container)

  let x = 0
  let y = 0

  switch (anchor) {
    case 'top':
      x = pos.x + pos.width / 2
      y = pos.y
      break
    case 'bottom':
      x = pos.x + pos.width / 2
      y = pos.y + pos.height
      break
    case 'left':
      x = pos.x
      y = pos.y + pos.height / 2
      break
    case 'right':
      x = pos.x + pos.width
      y = pos.y + pos.height / 2
      break
    case 'center':
    default:
      x = pos.x + pos.width / 2
      y = pos.y + pos.height / 2
      break
  }

  return { x, y }
}

// 生成直线路径
const generateStraightPath = (
  start: { x: number; y: number },
  end: { x: number; y: number }
): string => {
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
}

// 生成折线路径（智能选择水平或垂直优先）
const generatePolylinePath = (
  start: { x: number; y: number },
  end: { x: number; y: number }
): string => {
  const dx = Math.abs(end.x - start.x)
  const dy = Math.abs(end.y - start.y)

  // 如果水平距离更大，使用垂直中点
  if (dx > dy) {
    const midX = (start.x + end.x) / 2
    return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`
  } else {
    // 否则使用水平中点
    const midY = (start.y + end.y) / 2
    return `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`
  }
}

// 生成曲线路径
const generateCurvePath = (
  start: { x: number; y: number },
  end: { x: number; y: number }
): string => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  // 控制点偏移量
  const offset = distance * props.curvature

  // 计算控制点
  const cp1x = start.x + dx * 0.5 - dy * offset / distance
  const cp1y = start.y + dy * 0.5 + dx * offset / distance

  return `M ${start.x} ${start.y} Q ${cp1x} ${cp1y} ${end.x} ${end.y}`
}

// 更新连接线
const updateConnector = () => {
  const fromElement = getElement(props.from)
  const toElement = getElement(props.to)

  if (!fromElement || !toElement) {
    pathData.value = ''
    return
  }

  // 确保元素尺寸不为 0
  if (fromElement.offsetWidth === 0 || fromElement.offsetHeight === 0 ||
    toElement.offsetWidth === 0 || toElement.offsetHeight === 0) {
    pathData.value = ''
    return
  }

  // 找到共同的容器
  const container = findCommonContainer(fromElement, toElement)
  containerRef.value = container

  // 将 SVG 插入到容器中（如果还没有）
  if (svgRef.value && svgRef.value.parentElement !== container) {
    // 确保容器有定位上下文
    const containerStyle = window.getComputedStyle(container)
    if (containerStyle.position === 'static') {
      container.style.position = 'relative'
    }
    container.appendChild(svgRef.value)
  }

  // 使用容器坐标计算锚点位置
  const start = getAnchorPoint(fromElement, props.fromAnchor, container)
  const end = getAnchorPoint(toElement, props.toAnchor, container)

  switch (props.type) {
    case 'polyline':
      pathData.value = generatePolylinePath(start, end)
      break
    case 'curve':
      pathData.value = generateCurvePath(start, end)
      break
    case 'straight':
    default:
      pathData.value = generateStraightPath(start, end)
      break
  }
}

// 监听属性变化
watch(
  () => [props.from, props.to, props.type, props.fromAnchor, props.toAnchor, props.curvature, props.color],
  () => {
    updateConnector()
  }
)

let resizeObserver: ResizeObserver | null = null
let mutationObserver: MutationObserver | null = null

// 生命周期
onMounted(() => {
  // 初始化，延迟确保 DOM 完全渲染
  setTimeout(updateConnector, 50)
  setTimeout(updateConnector, 200)

  // 监听窗口大小变化和滚动
  window.addEventListener('resize', updateConnector)
  window.addEventListener('scroll', updateConnector, true)

  // 使用 ResizeObserver 监听元素大小变化
  const fromElement = getElement(props.from)
  const toElement = getElement(props.to)

  if (fromElement && toElement) {
    resizeObserver = new ResizeObserver(updateConnector)
    resizeObserver.observe(fromElement)
    resizeObserver.observe(toElement)
  }

  // 使用 MutationObserver 监听 DOM 变化
  mutationObserver = new MutationObserver(() => {
    requestAnimationFrame(updateConnector)
  })

  if (fromElement && toElement) {
    mutationObserver.observe(fromElement, {
      attributes: true,
      attributeFilter: ['style', 'class']
    })
    mutationObserver.observe(toElement, {
      attributes: true,
      attributeFilter: ['style', 'class']
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateConnector)
  window.removeEventListener('scroll', updateConnector, true)

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  if (mutationObserver) {
    mutationObserver.disconnect()
    mutationObserver = null
  }
})
</script>

<style scoped>
.connector-svg {
  overflow: visible;
}
</style>
