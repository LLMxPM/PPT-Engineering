<!--
  文档用途：通用视图预览组件（ViewPreview.vue）
  主要功能：
  - 根据传入的组件文件路径（支持 'src/...' 或 '@/...'）创建异步组件并进行预览
  - 使用 FixedRatioContainer 按 1920x1080 设计尺寸进行等比缩放
  - 自动监听容器尺寸变化，动态计算缩放比例，无需外部计算
  技术栈：Vue@3 + TypeScript@5 + Tailwind CSS@3
-->

<template>
  <div class="w-full h-full flex items-center justify-center overflow-hidden" :ref="setContainerRef">
    <FixedRatioContainer :isFullscreen="false" :scale="scale">
      <component v-if="comp" :is="comp" :key="refreshKey" />
      <div v-else class="w-full h-full flex items-center justify-center text-[12px] text-gray-500">无可预览组件</div>
      <div v-if="inspectMode && hoverRect" class="absolute pointer-events-none z-50" :style="overlayStyle">
        <div class="w-full h-full border border-emerald-500/80 bg-emerald-500/10"></div>
        <div class="absolute -top-6 left-0 px-1.5 py-0.5 text-[10px] rounded bg-emerald-600 text-white">{{ hoverLabel }}
        </div>
      </div>
    </FixedRatioContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, watch, onMounted, onUnmounted, nextTick, defineAsyncComponent, ComponentPublicInstance, computed } from 'vue'
import FixedRatioContainer from '@/layouts/FixedRatioContainer.vue'

/**
 * Props：预览配置
 */
interface Props {
  /** 目标 Vue 文件路径，支持 'src/...' 或 '@/...' */
  filePath: string
  /** 设计尺寸宽度，默认 1920 */
  designWidth?: number
  /** 设计尺寸高度，默认 1080 */
  designHeight?: number
  /** 最大缩放倍率上限，默认 3 */
  scaleLimit?: number
  /** 刷新令牌（变化时强制重新渲染） */
  refreshToken?: number
  /** 元素定位模式（仅 DEV 有效，点击预览元素触发定位） */
  inspectMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  designWidth: 1920,
  designHeight: 1080,
  scaleLimit: 3,
  refreshToken: 0,
  inspectMode: false
})

/** 容器与缩放状态 */
const containerRef = ref<HTMLElement | null>(null)
const scale = ref<number>(1)
let resizeObserver: ResizeObserver | null = null

/** 预览异步组件与刷新 key */
const comp = shallowRef<any | null>(null)
const refreshKey = ref<number>(0)

/** 悬浮高亮遮罩状态 */
const hoverRect = ref<{ left: number; top: number; width: number; height: number } | null>(null)
const hoverLabel = ref<string>('')

/** 事件：元素定位 */
const emit = defineEmits<{ (e: 'elementInspect', payload: InspectPayload): void }>()

/** 类型：元素定位事件载荷 */
interface InspectPayload {
  filePath?: string
  line?: number
  column?: number
  selector?: string
  tag?: string
  classes?: string[]
  id?: string
  text?: string
  attrs?: { name: string; value: string }[]
}

/**
 * 规范化输入路径到 '@/' 别名形式
 */
function normalizeToAlias(p: string): string {
  const s = (p || '').replace(/\\/g, '/').trim()
  if (!s) return ''
  if (s.startsWith('@/')) return s
  if (s.startsWith('src/')) return s.replace(/^src\//, '@/')
  if (/^views\//.test(s) || s.includes('/')) return `@/${s.replace(/^\/+/, '')}`
  return s
}

/**
 * 根据别名路径创建异步视图组件
 * 优先精确匹配，其次回退到 '/src/' 形式，最后避免仅按文件名匹配导致误渲染
 */
function createAsyncViewByAliasPath(aliasPath: string) {
  const modules = {
    ...import.meta.glob('@/views/**/*.vue'),
    ...import.meta.glob('/src/views/**/*.vue')
  }
  const keys = Object.keys(modules)
  // 规范化到 '@/' 形式
  const normalizedAlias = aliasPath.startsWith('@/')
    ? aliasPath
    : aliasPath.startsWith('src/')
      ? aliasPath.replace(/^src\//, '@/')
      : `@/${aliasPath.replace(/^\/+/, '')}`

  // 精确匹配 '@/' 键
  let loader = modules[normalizedAlias]
  if (!loader) {
    // 回退尝试 '/src/' 键
    const srcPath = normalizedAlias.replace('@/', '/src/')
    loader = modules[srcPath]
  }
  if (!loader) return null
  return defineAsyncComponent(loader)
}

/**
 * 记录容器引用并计算缩放比例
 */
function setContainerRef(el: Element | ComponentPublicInstance | null): void {
  let dom: HTMLElement | null = null
  if (el instanceof HTMLElement) dom = el
  else if (el && (el as any).$el instanceof HTMLElement) dom = (el as any).$el as HTMLElement
  containerRef.value = dom
  computeScale()
  if (resizeObserver) resizeObserver.disconnect()
  if (dom) {
    resizeObserver = new ResizeObserver(() => computeScale())
    resizeObserver.observe(dom)
  }
  setupInspectListener()
}

/**
 * 计算预览缩放比例（基于容器尺寸与设计尺寸）
 */
function computeScale(): void {
  const el = containerRef.value
  if (!el) return
  const availableWidth = el.clientWidth
  const availableHeight = el.clientHeight
  const scaleX = availableWidth / props.designWidth
  const scaleY = availableHeight / props.designHeight
  scale.value = Math.min(scaleX, scaleY, props.scaleLimit)
}

/**
 * 刷新预览组件（路径或令牌变化时）
 */
function refreshComponent(): void {
  const alias = normalizeToAlias(props.filePath)
  comp.value = alias ? createAsyncViewByAliasPath(alias) : null
  refreshKey.value++
  nextTick(() => computeScale())
}

// 侦听：路径与刷新令牌变化
watch(() => props.filePath, () => refreshComponent(), { immediate: true })
watch(() => props.refreshToken, () => { refreshKey.value++ }, { immediate: false })

// 生命周期：卸载时清理观察器
onMounted(() => { /* 初始化在 setContainerRef 内完成 */ })
onUnmounted(() => {
  resizeObserver?.disconnect(); resizeObserver = null
  teardownInspectListener()
})

/**
 * 函数：安装/移除元素定位事件监听
 */
function setupInspectListener(): void {
  const el = containerRef.value
  teardownInspectListener()
  if (!el) return
  if (!import.meta.env.DEV) return
  const handler = (e: Event) => {
    if (!props.inspectMode) return
    const me = e as MouseEvent
    me.preventDefault()
    me.stopPropagation()
    const target = me.target as HTMLElement | null
    if (!target) return
    const payload = buildInspectPayload(target)
    emit('elementInspect', payload)
  }
  el.addEventListener('click', handler, true)
  const moveHandler = (e: Event) => {
    if (!props.inspectMode) { clearHoverOverlay(); return }
    const me = e as MouseEvent
    const target = me.target as HTMLElement | null
    if (!target) { clearHoverOverlay(); return }
    updateHoverOverlay(target)
  }
  const leaveHandler = () => { clearHoverOverlay() }
  el.addEventListener('mousemove', moveHandler, true)
  el.addEventListener('mouseleave', leaveHandler, true)
    ; (el as any)._inspectHandler = handler
    ; (el as any)._inspectMoveHandler = moveHandler
    ; (el as any)._inspectLeaveHandler = leaveHandler
}

function teardownInspectListener(): void {
  const el = containerRef.value as any
  if (el && el._inspectHandler) {
    el.removeEventListener('click', el._inspectHandler, true)
    el._inspectHandler = null
  }
  if (el && el._inspectMoveHandler) {
    el.removeEventListener('mousemove', el._inspectMoveHandler, true)
    el._inspectMoveHandler = null
  }
  if (el && el._inspectLeaveHandler) {
    el.removeEventListener('mouseleave', el._inspectLeaveHandler, true)
    el._inspectLeaveHandler = null
  }
  clearHoverOverlay()
}

/**
 * 侦听：定位模式开关变化时重设监听
 */
watch(() => props.inspectMode, () => setupInspectListener())

/**
 * 函数：从元素构造定位事件载荷
 */
function buildInspectPayload(target: HTMLElement): InspectPayload {
  const locator = findLocatorInfo(target)
  const tag = (target.tagName || '').toLowerCase()
  const id = target.id || ''
  const classes = Array.from(target.classList || [])
  const selector = buildSimpleSelector(tag, id, classes)
  const text = (target.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120)
  const attrs = collectElementAttrs(target)

  return {
    filePath: locator?.file,
    line: locator?.line,
    column: locator?.column,
    selector,
    tag,
    classes,
    id,
    text,
    attrs
  }
}

/**
 * 函数：收集元素的文本型属性（用于 props 匹配）
 */
function collectElementAttrs(el: HTMLElement): { name: string; value: string }[] {
  const prefer = new Set(['title', 'subtitle', 'label', 'name', 'alt', 'aria-label', 'placeholder', 'value'])
  const names = el.getAttributeNames ? el.getAttributeNames() : []
  const pairs: { name: string; value: string }[] = []
  for (const n of names) {
    const v = (el.getAttribute(n) || '').trim()
    if (!v) continue
    if (v.length > 240) continue
    const isTextLike = prefer.has(n) || /^[a-z][\w:-]*$/i.test(n)
    if (!isTextLike) continue
    pairs.push({ name: n, value: v })
  }
  return pairs.slice(0, 12)
}

/**
 * 函数：查找元素或祖先上的源码位置信息
 */
function findLocatorInfo(el: HTMLElement | null): { file?: string; line?: number; column?: number } | null {
  let cur: HTMLElement | null = el
  const re = /(.*\.vue):(\d+):(\d+)/
  while (cur) {
    const names = cur.getAttributeNames ? cur.getAttributeNames() : []
    for (const n of names) {
      const v = cur.getAttribute(n) || ''
      const m = re.exec(v)
      if (m) {
        return { file: m[1], line: Number(m[2]), column: Number(m[3]) }
      }
    }
    cur = cur.parentElement
  }
  return null
}

/**
 * 函数：构造简化选择器（tag#id.class1.class2）
 */
function buildSimpleSelector(tag: string, id: string, classes: string[]): string {
  const idSeg = id ? `#${id}` : ''
  const clsSeg = classes && classes.length ? `.${classes.join('.')}` : ''
  return `${tag}${idSeg}${clsSeg}`
}

/**
 * 函数：更新悬浮遮罩矩形与标签
 */
function updateHoverOverlay(target: HTMLElement): void {
  const outer = containerRef.value
  if (!outer) return
  const inner = outer.querySelector('.fixed-ratio-container') as HTMLElement | null
  if (!inner) return
  const tr = target.getBoundingClientRect()
  const ir = inner.getBoundingClientRect()
  const s = scale.value || 1
  const left = (tr.left - ir.left) / s
  const top = (tr.top - ir.top) / s
  const width = tr.width / s
  const height = tr.height / s
  hoverRect.value = { left, top, width, height }
  const tag = (target.tagName || '').toLowerCase()
  const id = target.id || ''
  const classes = Array.from(target.classList || [])
  hoverLabel.value = buildSimpleSelector(tag, id, classes)
}

/**
 * 函数：清除悬浮遮罩
 */
function clearHoverOverlay(): void { hoverRect.value = null; hoverLabel.value = '' }

/**
 * 计算属性：遮罩样式
 */
const overlayStyle = computed<Record<string, string>>(() => {
  const r = hoverRect.value
  if (!r) return {}
  return {
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`
  }
})
</script>

<style scoped>
/* 无额外样式，布局由父容器控制 */
</style>
