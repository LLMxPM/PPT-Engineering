<!--
  文档用途：Vue 文件分屏编辑与预览组件
  说明：左侧使用 DevMonacoEditor 编辑指定 .vue 文件内容，右侧使用 FixedRatioContainer 进行等比缩放预览；支持拖拽与滑块调整左右宽度占比，并在开发环境下自动保存以触发 HMR。
-->
<template>
  <div ref="rootRef" class="w-full h-full flex flex-col overflow-hidden select-none">
    <!-- 统一工具栏：合并编辑器与预览的按钮区域 -->
    <div class="pb-2 flex items-center gap-2 border-b">
      <div class="mr-auto flex items-center gap-2">
        <button @click="saveNow(true)"
          class="px-2 py-1 text-[12px] rounded bg-emerald-600 text-white hover:bg-emerald-700">保存</button>
        <button @click="refreshPreview"
          class="px-2 py-1 text-[12px] rounded bg-blue-600 text-white hover:bg-blue-700">刷新预览</button>

        <label class="flex items-center gap-1 text-[12px] text-gray-600">
          <input type="checkbox" v-model="isDark" /> 暗黑模式</label>
        <label class="flex items-center gap-1 text-[12px] text-gray-600">
          <input type="checkbox" v-model="autoSave" /> 自动保存
          <span v-if="autoSave" class="ml-1 inline-flex items-center" aria-label="自动保存状态">
            <span v-if="isSaving"
              class="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
            <span v-else class="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
          </span>
        </label>
        <label class="flex items-center gap-1 text-[12px] text-gray-600">
          <input type="checkbox" v-model="inspectMode" /> 元素定位模式
        </label>
      </div>
      <div class="text-[12px] text-gray-600 truncate" :title="displayFilePath">{{ displayFilePath }}</div>

    </div>

    <!-- 内容区域：编辑器与预览分栏 -->
  <div class="flex flex-1 overflow-hidden">
      <!-- 左侧：编辑器区域 -->
      <div class="h-full" :style="leftPaneStyle">
        <DevMonacoEditor ref="editorRef" v-model="content" language="vue" :height="editorHeight" :theme="editorTheme" :readOnly="false"
          :lineNumbers="'on'" :minimap="true" @change="handleEditorChange" />
      </div>

      <!-- 拖拽分隔条 -->
      <div class="w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize" @mousedown="startDrag"></div>

      <!-- 右侧：预览区域 -->
      <div class="h-full flex-1 min-w-[240px]">
        <div class="h-full">
          <div class="pl-3 pt-3 h-full">
            <div class="border rounded bg-gray-50 flex items-center justify-center w-full overflow-hidden"
              style="aspect-ratio: 16 / 9;">
              <ViewPreview :filePath="normalizedFilePath" :refreshToken="previewKey" :inspectMode="inspectMode"
                @elementInspect="handleElementInspect" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import DevMonacoEditor from './DevMonacoEditor.vue'
import ViewPreview from '@/components/editor/ViewPreview.vue'
import { fileManagerService } from '@/core/services/FileManagerService'
import { normalizeViewComponentPath as svcNormalize } from '@/core/services/RouteConfigService'
import { toast } from '@/core/composables/useToast'

/**
 * 组件入参
 */
interface Props {
  /** 目标 Vue 文件路径，支持 'src/...' 或 '@/...' */
  filePath: string
  /** 初始左侧占比（百分比 20-80） */
  initialLeftPercent?: number
  /** 是否自动保存（仅 DEV 有效） */
  initialAutoSave?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  initialLeftPercent: 50,
  initialAutoSave: true
})

/**
 * 触发事件
 */
const emit = defineEmits<{ (e: 'saved', path: string): void }>()

/**
 * 内部状态：容器与尺寸
 */
const rootRef = ref<HTMLElement | null>(null)
const editorHeight = ref<number>(600)
const ratioPercent = ref<number>(Math.min(80, Math.max(20, props.initialLeftPercent)))
const autoSave = ref<boolean>(props.initialAutoSave)
let dragging = false

/**
 * 内部状态：文件与内容
 */
const normalizedFilePath = computed<string>(() => normalizeToSrc(props.filePath))
const displayFilePath = computed<string>(() => props.filePath.replace(/\\/g, '/'))
const content = ref<string>('')
let saveTimer: any = null
const isSaving = ref<boolean>(false)
const editorRef = ref<InstanceType<typeof DevMonacoEditor> | null>(null)

/**
 * 内部状态：预览刷新令牌
 */
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080
const previewKey = ref<number>(0)
let resizeObserver: ResizeObserver | null = null
const isDark = ref<boolean>(true)
const THEME_KEY = 'SplitEditorPreview.editorTheme'
const inspectMode = ref<boolean>(true)
const INSPECT_KEY = 'SplitEditorPreview.inspectMode'

/**
 * 函数：规范化输入路径到 'src/...'
 */
function normalizeToSrc(p: string): string {
  const s = p.replace(/\\/g, '/')
  if (s.startsWith('@/')) return svcNormalize(s)
  return s
}

/**
 * 函数：计算编辑器高度为容器可用高度
 */
function computeEditorHeight(): void {
  const root = rootRef.value
  if (!root) return
  editorHeight.value = root.clientHeight - 40
}

/**
 * 函数：开始拖拽调整左右占比
 */
function startDrag(e: MouseEvent): void {
  dragging = true
  const startX = e.clientX
  const root = rootRef.value
  const startPercent = ratioPercent.value
  const onMove = (ev: MouseEvent) => {
    if (!root || !dragging) return
    const deltaX = ev.clientX - startX
    const total = root.clientWidth
    const deltaPercent = (deltaX / total) * 100
    ratioPercent.value = Math.min(80, Math.max(20, Math.round(startPercent + deltaPercent)))
  }
  const onUp = () => {
    dragging = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

/**
 * 计算属性：左侧面板样式（按百分比）
 */
const leftPaneStyle = computed<Record<string, string>>(() => {
  return { width: `${ratioPercent.value}%` }
})

/**
 * 计算属性：编辑器主题（vs / vs-dark）
 */
const editorTheme = computed<'vs' | 'vs-dark'>(() => (isDark.value ? 'vs-dark' : 'vs'))

/**
 * 函数：读取文件内容
 */
async function loadContent(): Promise<void> {
  try {
    content.value = await fileManagerService.readFile(normalizedFilePath.value) ?? ''
  } catch {
    content.value = ''
  }
}

/**
 * 函数：保存当前内容到文件
 */
/**
 * 函数：保存当前内容到文件（支持手动保存提示）
 * @param manual 是否由手动触发保存，用于显示成功提示
 */
async function saveNow(manual: boolean = false): Promise<void> {
  if (!import.meta.env.DEV) return
  isSaving.value = true
  try {
    await fileManagerService.writeFile(normalizedFilePath.value, content.value)
    emit('saved', normalizedFilePath.value)
    if (manual) {
      toast.success('保存成功', 2000)
    }
    refreshPreview()
  } catch { }
  finally {
    isSaving.value = false
  }
}

/**
 * 函数：编辑器内容变化处理（支持自动保存）
 */
function handleEditorChange(_val: string): void {
  if (!autoSave.value || !import.meta.env.DEV) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { saveNow() }, 500)
}

/**
 * 函数：跳转到指定行列并置中显示
 * @param line 目标行号
 * @param column 目标列号（可选）
 */
function jumpTo(line: number, column?: number): void {
  editorRef.value?.revealPosition(line, column ?? 1)
}

/**
 * 类型：预览元素定位事件载荷
 */
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
  source?: { file?: string; startLine?: number; startColumn?: number; endLine?: number; endColumn?: number }
}

/**
 * 函数：处理预览元素定位事件并跳转到编辑器位置
 */
function handleElementInspect(payload: InspectPayload): void {
  try {
    const targetPath = payload.filePath ? normalizeToSrc(payload.filePath) : ''
    const selfPath = normalizedFilePath.value
    if (targetPath && targetPath !== selfPath) {
      const cross = findAttrValueRangeInCurrentFile2(payload.text || '', payload.attrs)
      if (cross) {
        editorRef.value?.setSelection(cross.startLine!, cross.startColumn!, cross.endLine!, cross.endColumn!)
        toast.success('已定位到组件配置位置')
        return
      }
      toast.info(`选中元素来自其他文件：${targetPath}`)
      return
    }
    const s = payload.source
    if (s && s.startLine && s.startColumn && s.endLine && s.endColumn) {
      editorRef.value?.setSelection(s.startLine, s.startColumn, s.endLine, s.endColumn)
      toast.success('已根据预览定位元数据选中范围')
      return
    }
    if (payload.line && payload.line > 0) {
      jumpTo(payload.line, payload.column)
      selectWholeTag(payload.line)
      toast.success(`已定位到第 ${payload.line} 行`)
      return
    }
    const guess = guessPositionFromSelector2(payload)
    if (guess) {
      if (guess.startLine && guess.startColumn && guess.endLine && guess.endColumn) {
        editorRef.value?.setSelection(guess.startLine, guess.startColumn, guess.endLine, guess.endColumn)
        toast.success('已根据匹配范围定位并选中')
      } else {
        jumpTo(guess.line)
        selectWholeTag(guess.line)
        toast.success(`已根据选择器粗略定位到第 ${guess.line} 行`)
      }
    } else {
      toast.warning('未能定位代码，请尝试点击更外层元素或包含类名的元素')
    }
  } catch { /* 忽略错误以保证交互流畅 */ }
}

/**
 * 类型：启发式定位结果
 */
interface GuessResult { line: number; startLine?: number; startColumn?: number; endLine?: number; endColumn?: number; byText?: boolean }

/**
 * 函数：根据选择器信息在模板中粗略定位位置（支持文本范围）
 */
function guessPositionFromSelector(payload: InspectPayload): GuessResult | null {
  const src = content.value || ''
  if (!src) return null
  const tplStart = src.indexOf('<template')
  const tplEnd = src.indexOf('</template>')
  const tpl = tplStart >= 0 && tplEnd > tplStart ? src.slice(tplStart, tplEnd) : src
  const cls = (payload.classes || []).filter(Boolean)
  const id = payload.id || ''
  const txt = (payload.text || '').trim()
  const attrs = (payload.attrs || []).filter(a => a && a.name && a.value)
  let lineCandidate: GuessResult | null = null
  const slotOpenIdx = tpl.indexOf('<template #content')
  const slotCloseIdx = tpl.indexOf('</template>', slotOpenIdx >= 0 ? slotOpenIdx : 0)
  const region = slotOpenIdx >= 0 && slotCloseIdx > slotOpenIdx ? tpl.slice(slotOpenIdx, slotCloseIdx) : tpl

  let index = -1
  if (id) {
    const idPattern = new RegExp(`id\\s*=\\s*(['"])${escapeRegExp(id)}\\1`, 'i')
    const m = idPattern.exec(region)
    if (m) index = (slotOpenIdx >= 0 ? slotOpenIdx : 0) + (m.index || 0)
  }
  if (index < 0 && cls.length) {
    const classPattern = /class\s*=\s*(['"])([^'\"]*)\1/ig
    let cur: RegExpExecArray | null
    let bestIndex = -1
    let bestScore = 0
    while ((cur = classPattern.exec(region))) {
      const raw = cur[0]
      const m = /class\s*=\s*(["'])([^"']*)\1/i.exec(raw)
      const classesInTag = m ? (m[2] || '').split(/\s+/).filter(Boolean) : []
      const score = cls.reduce((acc, c) => acc + (classesInTag.includes(c) ? 1 : 0), 0)
      if (score > bestScore) { bestScore = score; bestIndex = (cur.index || 0) }
      if (score === cls.length) { bestIndex = (cur.index || 0); break }
    }
    if (bestScore >= Math.min(2, cls.length)) index = (slotOpenIdx >= 0 ? slotOpenIdx : 0) + (bestIndex || 0)
    if (index < 0) {
      const dclsPattern = /:class\s*=\s*(["'])([\s\S]*?)\1/ig
      let dcur: RegExpExecArray | null
      let dBestIndex = -1
      let dBestScore = 0
      while ((dcur = dclsPattern.exec(region))) {
        const body = dcur[2] || ''
        const words = Array.from(body.matchAll(/[A-Za-z0-9_-]+/g)).map(x => x[0])
        const score = cls.reduce((acc, c) => acc + (words.includes(c) ? 1 : 0), 0)
        if (score > dBestScore) { dBestScore = score; dBestIndex = (dcur.index || 0) }
        if (score === cls.length) { dBestIndex = (dcur.index || 0); break }
      }
      if (dBestScore >= Math.min(2, cls.length)) index = (slotOpenIdx >= 0 ? slotOpenIdx : 0) + (dBestIndex || 0)
    }
  }
  if (index >= 0) {
    const before = tpl.slice(0, index)
    const lineOffset = before.split(/\r?\n/).length
    const globalOffset = tplStart >= 0 ? src.slice(0, tplStart).split(/\r?\n/).length : 0
    lineCandidate = { line: globalOffset + lineOffset }
  }

  // 属性值（props）优先匹配：根据元素属性值直接匹配并选中完整值
  if (attrs.length) {
    let best: { m: RegExpExecArray; valueLen: number } | null = null
    for (const a of attrs) {
      const patternVal = escapeRegExp(a.value).replace(/\s+/g, '\\s+')
      const re = new RegExp(`${escapeRegExp(a.name)}\\s*=\\s*(['\"])(${patternVal})\\1`, 'i')
      const m = re.exec(tpl)
      if (m) {
        const valLen = m[2]?.length || 0
        if (!best || valLen > best.valueLen) best = { m, valueLen: valLen }
      }
    }
    if (best) {
      const m = best.m
      const valStartAbs = m.index + m[0].indexOf(m[2])
      const valEndAbs = valStartAbs + (m[2]?.length || 0)
      const globalOffset = tplStart >= 0 ? src.slice(0, tplStart).split(/\r?\n/).length : 0
      const beforeStart = tpl.slice(0, valStartAbs)
      const startLineOffset = beforeStart.split(/\r?\n/).length
      const startLineText = beforeStart.split(/\r?\n/).pop() || ''
      const startColumn = startLineText.length + 1
      const beforeEnd = tpl.slice(0, valEndAbs)
      const endLineOffset = beforeEnd.split(/\r?\n/).length
      const endLineText = beforeEnd.split(/\r?\n/).pop() || ''
      const endColumn = endLineText.length + 1
      return {
        line: globalOffset + startLineOffset,
        startLine: globalOffset + startLineOffset,
        startColumn,
        endLine: globalOffset + endLineOffset,
        endColumn
      }
    }
  }

  if (lineCandidate) return lineCandidate

  // 文本兜底匹配（当属性值未命中）：仅当属性值完全等于文本时命中
  if (txt && txt.length >= 2) {
    const normalizedTxt = txt.replace(/\s+/g, ' ').toLowerCase()
    const attrRe = /([A-Za-z_:][\w:.-]*)\s*=\s*(['"])([\s\S]*?)\2/g
    let mAttr: RegExpExecArray | null
    let candidate: { index: number; raw: string; quote: string; value: string } | null = null
    while ((mAttr = attrRe.exec(tpl))) {
      const val = mAttr[3] || ''
      const valNorm = val.replace(/\s+/g, ' ').toLowerCase()
      if (valNorm === normalizedTxt) {
        candidate = { index: (mAttr.index || 0), raw: mAttr[0], quote: mAttr[2], value: val }
        break
      }
    }
    if (candidate) {
      const raw = candidate.raw
      const eqPos = raw.indexOf('=')
      let pos = eqPos + 1
      while (raw[pos] === ' ' || raw[pos] === '\t') pos++
      const valueStartRel = pos + 1
      const valueStartAbs = candidate.index + valueStartRel
      const valueEndAbs = valueStartAbs + candidate.value.length
      const globalOffset = tplStart >= 0 ? src.slice(0, tplStart).split(/\r?\n/).length : 0
      const beforeStart = tpl.slice(0, valueStartAbs)
      const startLineOffset = beforeStart.split(/\r?\n/).length
      const startLineText = beforeStart.split(/\r?\n/).pop() || ''
      const startColumn = startLineText.length + 1
      const beforeEnd = tpl.slice(0, valueEndAbs)
      const endLineOffset = beforeEnd.split(/\r?\n/).length
      const endLineText = beforeEnd.split(/\r?\n/).pop() || ''
      const endColumn = endLineText.length + 1
      return {
        line: globalOffset + startLineOffset,
        startLine: globalOffset + startLineOffset,
        startColumn,
        endLine: globalOffset + endLineOffset,
        endColumn,
      }
    }
  }

  // 文本节点匹配：选中完整文本片段（需附近存在类名上下文以降低误命中）
  if (txt && txt.length >= 2) {
    const pattern = escapeRegExp(txt).replace(/\s+/g, '\\s+')
    const re = new RegExp(pattern, 'i')
    const m = re.exec(region)
    if (m) {
      const vicinity = region.slice(Math.max(0, (m.index || 0) - 200), Math.min(region.length, (m.index || 0) + 200))
      const hasClassContext = cls.length === 0 ? true : cls.some(c => new RegExp(`class[^>]*\\b${escapeRegExp(c)}\\b`, 'i').test(vicinity))
      if (!hasClassContext) return null
      const globalOffset = tplStart >= 0 ? src.slice(0, tplStart).split(/\r?\n/).length : 0
      const before = tpl.slice(0, (slotOpenIdx >= 0 ? slotOpenIdx : 0) + (m.index || 0))
      const startLineOffset = before.split(/\r?\n/).length
      const startLineText = before.split(/\r?\n/).pop() || ''
      const startColumn = startLineText.length + 1
      const endBefore = tpl.slice(0, (slotOpenIdx >= 0 ? slotOpenIdx : 0) + (m.index || 0) + m[0].length)
      const endLineOffset = endBefore.split(/\r?\n/).length
      const endLineText = endBefore.split(/\r?\n/).pop() || ''
      const endColumn = endLineText.length + 1
      return {
        line: globalOffset + startLineOffset,
        startLine: globalOffset + startLineOffset,
        startColumn,
        endLine: globalOffset + endLineOffset,
        endColumn
      }
    }
  }
  return null
}

/**
 * 函数：根据选择器信息在模板中粗略定位位置（增强版）
 * 说明：统一使用模板区域与偏移换算工具，提升定位准确性
 */
function guessPositionFromSelector2(payload: InspectPayload): GuessResult | null {
  const src = content.value || ''
  if (!src) return null
  const { tpl, tplStart, startLineOffset } = getTemplateRegion(src)
  const cls = (payload.classes || []).filter(Boolean)
  const id = (payload.id || '').trim()
  const txt = (payload.text || '').trim()
  const attrs = (payload.attrs || []).filter(a => a && a.name && a.value)
  let lineCandidate: GuessResult | null = null

  // 内容区优先：<template #content>
  const slotOpenIdx = tpl.indexOf('<template #content')
  const slotCloseIdx = tpl.indexOf('</template>', slotOpenIdx >= 0 ? slotOpenIdx : 0)
  const regionStart = slotOpenIdx >= 0 ? slotOpenIdx : 0
  const region = slotOpenIdx >= 0 && slotCloseIdx > slotOpenIdx ? tpl.slice(slotOpenIdx, slotCloseIdx) : tpl

  // 1) id 静态精确匹配
  let index = -1
  if (id) {
    const idPattern = new RegExp(`id\\s*=\\s*(['"])${escapeRegExp(id)}\\1`, 'i')
    const m = idPattern.exec(region)
    if (m) index = regionStart + (m.index || 0)
  }

  // 2) class 记分匹配（静态与动态）
  if (index < 0 && cls.length) {
    const classPattern = /class\s*=\s*(['"])([^'\"]*)\1/ig
    let cur: RegExpExecArray | null
    let bestIndex = -1
    let bestScore = 0
    while ((cur = classPattern.exec(region))) {
      const raw = cur[0]
      const m = /class\s*=\s*(["'])([^"']*)\1/i.exec(raw)
      const classesInTag = m ? (m[2] || '').split(/\s+/).filter(Boolean) : []
      const score = cls.reduce((acc, c) => acc + (classesInTag.includes(c) ? 1 : 0), 0)
      if (score > bestScore) { bestScore = score; bestIndex = (cur.index || 0) }
      if (score === cls.length) { bestIndex = (cur.index || 0); break }
    }
    if (bestScore >= Math.min(2, cls.length)) index = regionStart + (bestIndex >= 0 ? bestIndex : -1)
    if (index < 0) {
      const dclsPattern = /:class\s*=\s*(["'])([\s\S]*?)\1/ig
      let dcur: RegExpExecArray | null
      let dBestIndex = -1
      let dBestScore = 0
      while ((dcur = dclsPattern.exec(region))) {
        const body = dcur[2] || ''
        const words = Array.from(body.matchAll(/[A-Za-z0-9_-]+/g)).map(x => x[0])
        const score = cls.reduce((acc, c) => acc + (words.includes(c) ? 1 : 0), 0)
        if (score > dBestScore) { dBestScore = score; dBestIndex = (dcur.index || 0) }
        if (score === cls.length) { dBestIndex = (dcur.index || 0); break }
      }
      if (dBestScore >= Math.min(2, cls.length)) index = regionStart + (dBestIndex >= 0 ? dBestIndex : -1)
    }
  }

  if (index >= 0) {
    const pos = offsetToLineColumn(tpl, index)
    lineCandidate = { line: startLineOffset + pos.lineOffset }
  }

  // 3) 属性值优先：静态 attr="value" 或动态绑定包含 value
  if (attrs.length) {
    let best: { startAbs: number; endAbs: number } | null = null
    // 静态
    for (const a of attrs) {
      const patternVal = escapeRegExp(a.value).replace(/\s+/g, '\\s+')
      const re = new RegExp(`${escapeRegExp(a.name)}\\s*=\\s*(['"])(${patternVal})\\1`, 'i')
      const m = re.exec(tpl)
      if (m) {
        const valStartAbs = m.index + m[0].indexOf(m[2])
        const valEndAbs = valStartAbs + (m[2]?.length || 0)
        if (!best || (valEndAbs - valStartAbs) > (best.endAbs - best.startAbs)) best = { startAbs: valStartAbs, endAbs: valEndAbs }
      }
    }
    // 动态 :attr / v-bind:attr
    if (!best) {
      for (const a of attrs) {
        const reDyn = new RegExp(`(?:v-bind:|:)${escapeRegExp(a.name)}\\s*=\\s*(['"])([\\s\\S]*?)\\1`, 'ig')
        let dcur: RegExpExecArray | null
        while ((dcur = reDyn.exec(tpl))) {
          const body = dcur[2] || ''
          const idx = body.indexOf(a.value)
          if (idx >= 0) {
            const valStartAbs = (dcur.index || 0) + dcur[0].indexOf(dcur[2]) + idx
            const valEndAbs = valStartAbs + a.value.length
            if (!best || (valEndAbs - valStartAbs) > (best.endAbs - best.startAbs)) best = { startAbs: valStartAbs, endAbs: valEndAbs }
          }
        }
      }
    }
    if (best) {
      const sPos = offsetToLineColumn(tpl, best.startAbs)
      const ePos = offsetToLineColumn(tpl, best.endAbs)
      return {
        line: startLineOffset + sPos.lineOffset,
        startLine: startLineOffset + sPos.lineOffset,
        startColumn: sPos.column,
        endLine: startLineOffset + ePos.lineOffset,
        endColumn: ePos.column
      }
    }
  }

  // 4) 文本兜底（带类名上下文以降低误命中）
  if (txt && txt.length >= 2) {
    const pattern = escapeRegExp(txt).replace(/\s+/g, '\\s+')
    const re = new RegExp(pattern, 'i')
    const m = re.exec(region)
    if (m) {
      const vicinity = region.slice(Math.max(0, (m.index || 0) - 200), Math.min(region.length, (m.index || 0) + 200))
      const hasClassContext = cls.length === 0 ? true : cls.some(c => new RegExp(`class[^>]*\\b${escapeRegExp(c)}\\b`, 'i').test(vicinity))
      if (!hasClassContext) return null
      const startAbs = regionStart + (m.index || 0)
      const endAbs = startAbs + m[0].length
      const sPos = offsetToLineColumn(tpl, startAbs)
      const ePos = offsetToLineColumn(tpl, endAbs)
      return {
        line: startLineOffset + sPos.lineOffset,
        startLine: startLineOffset + sPos.lineOffset,
        startColumn: sPos.column,
        endLine: startLineOffset + ePos.lineOffset,
        endColumn: ePos.column
      }
    }
  }

  return lineCandidate
}

/**
 * 函数：在当前文件模板中查找属性值范围（用于跨文件点击时定位到配置）
 */
function findAttrValueRangeInCurrentFile(text: string, attrs?: { name: string; value: string }[]): GuessResult | null {
  const src = content.value || ''
  if (!src) return null
  const tplStart = src.indexOf('<template')
  const tplEnd = src.indexOf('</template>')
  const tpl = tplStart >= 0 && tplEnd > tplStart ? src.slice(tplStart, tplEnd) : src
  const candidates: Array<{ name: string; value: string }> = []
  if (text && text.trim().length > 0) candidates.push({ name: '', value: text.trim() })
  for (const a of (attrs || [])) {
    if (a && a.value && a.value.trim().length > 0) candidates.push({ name: a.name || '', value: a.value.trim() })
  }
  if (candidates.length === 0) return null
  let best: { startAbs: number; endAbs: number } | null = null
  for (const c of candidates) {
    const valEsc = escapeRegExp(c.value).replace(/\s+/g, '\\s+')
    const namePart = c.name ? `${escapeRegExp(c.name)}\\s*=\\s*` : `[A-Za-z_:][\\w:.-]*\\s*=\\s*`
    const re = new RegExp(`${namePart}(['\"])(${valEsc})\\1`, 'i')
    const m = re.exec(tpl)
    if (m) {
      const startAbs = m.index + m[0].indexOf(m[2])
      const endAbs = startAbs + (m[2]?.length || 0)
      if (!best || (m[2]?.length || 0) > (best.endAbs - best.startAbs)) best = { startAbs, endAbs }
    }
  }
  if (!best) return null
  const globalOffset = tplStart >= 0 ? src.slice(0, tplStart).split(/\r?\n/).length : 0
  const beforeStart = tpl.slice(0, best.startAbs)
  const startLineOffset = beforeStart.split(/\r?\n/).length
  const startLineText = beforeStart.split(/\r?\n/).pop() || ''
  const startColumn = startLineText.length + 1
  const beforeEnd = tpl.slice(0, best.endAbs)
  const endLineOffset = beforeEnd.split(/\r?\n/).length
  const endLineText = beforeEnd.split(/\r?\n/).pop() || ''
  const endColumn = endLineText.length + 1
  return {
    line: globalOffset + startLineOffset,
    startLine: globalOffset + startLineOffset,
    startColumn,
    endLine: globalOffset + endLineOffset,
    endColumn,
    byText: true
  }
}

/**
 * 函数：在当前文件模板中查找属性值范围（增强版）
 * 说明：支持静态与动态绑定两类属性值匹配，并统一行列计算
 */
function findAttrValueRangeInCurrentFile2(text: string, attrs?: { name: string; value: string }[]): GuessResult | null {
  const src = content.value || ''
  if (!src) return null
  const { tpl, tplStart, startLineOffset } = getTemplateRegion(src)
  const candidates: Array<{ name: string; value: string }> = []
  if (text && text.trim().length > 0) candidates.push({ name: '', value: text.trim() })
  for (const a of (attrs || [])) {
    if (a && a.value && a.value.trim().length > 0) candidates.push({ name: a.name || '', value: a.value.trim() })
  }
  if (candidates.length === 0) return null

  let best: { startAbs: number; endAbs: number } | null = null

  // 静态 attr="value"
  for (const c of candidates) {
    const valEsc = escapeRegExp(c.value).replace(/\s+/g, '\\s+')
    const namePart = c.name ? `${escapeRegExp(c.name)}\\s*=\\s*` : `[A-Za-z_:][\\w:.-]*\\s*=\\s*`
    const re = new RegExp(`${namePart}(['"])(${valEsc})\\1`, 'i')
    const m = re.exec(tpl)
    if (m) {
      const startAbs = m.index + m[0].indexOf(m[2])
      const endAbs = startAbs + (m[2]?.length || 0)
      if (!best || (endAbs - startAbs) > (best.endAbs - best.startAbs)) best = { startAbs, endAbs }
    }
  }

  // 动态 :attr / v-bind:attr
  if (!best) {
    for (const c of candidates) {
      if (!c.name) continue
      const reDyn = new RegExp(`(?:v-bind:|:)${escapeRegExp(c.name)}\\s*=\\s*(['"])([\\s\\S]*?)\\1`, 'ig')
      let dcur: RegExpExecArray | null
      while ((dcur = reDyn.exec(tpl))) {
        const body = dcur[2] || ''
        const idx = body.indexOf(c.value)
        if (idx >= 0) {
          const startAbs = (dcur.index || 0) + dcur[0].indexOf(dcur[2]) + idx
          const endAbs = startAbs + c.value.length
          if (!best || (endAbs - startAbs) > (best.endAbs - best.startAbs)) best = { startAbs, endAbs }
        }
      }
    }
  }

  if (!best) return null
  const sPos = offsetToLineColumn(tpl, best.startAbs)
  const ePos = offsetToLineColumn(tpl, best.endAbs)
  return {
    line: startLineOffset + sPos.lineOffset,
    startLine: startLineOffset + sPos.lineOffset,
    startColumn: sPos.column,
    endLine: startLineOffset + ePos.lineOffset,
    endColumn: ePos.column,
    byText: true
  }
}

/**
 * 函数：转义正则特殊字符
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 函数：提取 <template> 区域及起始偏移/行偏移
 * 目的：统一模板截取逻辑，避免各函数重复计算与偏差
 */
function getTemplateRegion(src: string): { tpl: string; tplStart: number; tplEnd: number; startLineOffset: number } {
  const tplStart = src.indexOf('<template')
  const tplEnd = src.indexOf('</template>')
  const tpl = tplStart >= 0 && tplEnd > tplStart ? src.slice(tplStart, tplEnd) : src
  const startLineOffset = tplStart >= 0 ? src.slice(0, tplStart).split(/\r?\n/).length : 0
  return { tpl, tplStart, tplEnd, startLineOffset }
}

/**
 * 函数：将绝对偏移换算为行列信息
 * 说明：提供统一的偏移→(line, column) 映射，降低重复与错误
 */
function offsetToLineColumn(text: string, absOffset: number): { lineOffset: number; column: number } {
  const before = text.slice(0, absOffset)
  const lineOffset = before.split(/\r?\n/).length
  const lineText = before.split(/\r?\n/).pop() || ''
  return { lineOffset, column: lineText.length + 1 }
}

/**
 * 函数：选择目标行邻近的整个标签范围
 * @param line 目标行号
 * @param tagName 可选标签名，提升准确性
 */
function selectWholeTag(line: number, tagName?: string): void {
  const src = content.value || ''
  if (!src) return
  const lines = src.split(/\r?\n/)
  const tplStartLine = findLineIndex(lines, /<\s*template[>\s]/i) ?? 1
  const tplEndLine = findLineIndex(lines, /<\s*\/\s*template\s*>/i, tplStartLine) ?? lines.length

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
  let cur = clamp(line, tplStartLine, tplEndLine)

  // 向上寻找起始标签
  let startLine = cur
  let startCol = 1
  const tagRegex = tagName ? new RegExp(`<\\s*${tagName}([>\\s\/])`, 'i') : /<\s*[A-Za-z][\w-]*/
  for (let i = cur; i >= tplStartLine; i--) {
    const idx = lines[i - 1].search(tagRegex)
    if (idx >= 0) { startLine = i; startCol = idx + 1; break }
  }

  // 推断标签名
  let name = tagName || ''
  if (!name) {
    const m = /<\s*([A-Za-z][\w-]*)/.exec(lines[startLine - 1].slice(startCol - 1))
    if (m) name = m[1].toLowerCase()
  }
  if (!name) {
    const endCol = lines[startLine - 1].length + 1
    editorRef.value?.setSelection(startLine, 1, startLine, endCol)
    return
  }

  // 自闭合处理
  const restStart = lines[startLine - 1].slice(startCol - 1)
  if (/\/\s*>/.test(restStart)) {
    const endCol = (startCol - 1) + restStart.indexOf('>') + 1
    editorRef.value?.setSelection(startLine, startCol, startLine, endCol)
    return
  }

  // 计算匹配的结束标签（深度匹配）
  let depth = 0
  let endLine = startLine
  let endCol = lines[startLine - 1].length + 1
  const openRe = new RegExp(`<\\s*${name}(?=[>\\s])`, 'ig')
  const closeRe = new RegExp(`<\\s*\/\\s*${name}\\s*>`, 'ig')
  for (let i = startLine; i <= tplEndLine; i++) {
    const lineText = lines[i - 1]
    // 初始化：第一行从起始列开始匹配
    const segment = i === startLine ? lineText.slice(startCol - 1) : lineText
    // 统计打开数量
    let m: RegExpExecArray | null
    while ((m = openRe.exec(segment))) depth++
    // 统计关闭数量
    while ((m = closeRe.exec(segment))) {
      depth--
      if (depth <= 0) {
        endLine = i
        endCol = (i === startLine ? (startCol - 1) : 0) + (m.index || 0) + (m[0].length)
        editorRef.value?.setSelection(startLine, startCol, endLine, endCol)
        return
      }
    }
  }
  // 未找到闭合标签，选择到模板结束
  editorRef.value?.setSelection(startLine, startCol, tplEndLine, lines[tplEndLine - 1].length + 1)
}

/**
 * 函数：查找匹配行索引（1-based）
 */
function findLineIndex(lines: string[], re: RegExp, from: number = 1): number | null {
  for (let i = from; i <= lines.length; i++) { if (re.test(lines[i - 1])) return i }
  return null
}

/**
 * 函数：全局快捷键处理（Ctrl/Meta + S 触发手动保存）
 * @param e 键盘事件
 */
function handleKeydown(e: KeyboardEvent): void {
  const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'
  if (!isSave) return
  e.preventDefault()
  saveNow(true)
}

// 预览容器缩放逻辑已由 ViewPreview 处理

// 缩放计算已由 ViewPreview 处理

// 异步组件创建逻辑已抽取到 ViewPreview

/**
 * 函数：刷新预览组件
 */
function refreshPreview(): void { previewKey.value++ }

/**
 * 生命周期：挂载与卸载
 */
onMounted(async () => {
  await loadContent()
  await nextTick()
  computeEditorHeight()
  refreshPreview()
  const root = rootRef.value
  if (root) {
    resizeObserver = new ResizeObserver(() => { computeEditorHeight() })
    resizeObserver.observe(root)
  }
  // 预览缩放由 ViewPreview 自适应容器，无需额外监听窗口尺寸
  window.addEventListener('keydown', handleKeydown)
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored) isDark.value = stored === 'dark'
  } catch { }
  try {
    const im = localStorage.getItem(INSPECT_KEY)
    if (im) inspectMode.value = im === 'on'
  } catch { }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  resizeObserver?.disconnect()
  resizeObserver = null
  if (saveTimer) clearTimeout(saveTimer)
})

/**
 * 侦听：左右比例变化时重新计算预览缩放
 */
// 比例变化无需手动缩放计算，ViewPreview 自适应容器

/**
 * 侦听：主题开关变化时持久化到 localStorage
 */
watch(() => isDark.value, (val) => {
  try { localStorage.setItem(THEME_KEY, val ? 'dark' : 'light') } catch { }
})

watch(() => inspectMode.value, (val) => {
  try { localStorage.setItem(INSPECT_KEY, val ? 'on' : 'off') } catch { }
})

</script>

<style scoped>
/* 无额外样式，布局由 Tailwind 控制 */
</style>
