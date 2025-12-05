<template>
  <div ref="containerRef" class="w-full h-full" :style="{ minHeight: height + 'px' }"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import * as monaco from 'monaco-editor'
import { configureMonacoYaml } from 'monaco-yaml'

/**
 * 文件用途：开发环境使用的 Monaco 代码编辑器组件，提供双向绑定、主题与语言配置。
 * 说明：生产环境建议不引入该组件以减小打包体积；本组件依赖入口的 worker 注册逻辑。
 */

defineOptions({ name: 'DevMonacoEditor' })

/**
 * 组件属性
 */
interface Props {
  /** 当前代码内容（v-model） */
  modelValue: string
  /** 语法高亮语言（如 'json' | 'typescript' | 'html' | 'css' 等） */
  language?: string
  /** 主题（'vs' | 'vs-dark'） */
  theme?: 'vs' | 'vs-dark'
  /** 只读开关 */
  readOnly?: boolean
  /** 是否显示行号 */
  lineNumbers?: 'on' | 'off'
  /** 是否显示 minimap */
  minimap?: boolean
  /** 最小高度（px） */
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  language: 'typescript',
  theme: 'vs-dark',
  readOnly: false,
  lineNumbers: 'on',
  minimap: true,
  height: 600
})

const emit = defineEmits<{
  /** 内容变更事件（v-model） */
  (e: 'update:modelValue', val: string): void
  /** 额外变更事件（包含源事件） */
  (e: 'change', val: string): void
}>()

const containerRef = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let model: monaco.editor.ITextModel | null = null
let suppressNextUpdate = false
let resizeObserver: ResizeObserver | null = null
let yamlConfigured = false

/**
 * 初始化编辑器实例
 */
function initEditor() {
  if (!containerRef.value) return

  const lang = props.language === 'vue' ? 'html' : props.language
  model = monaco.editor.createModel(props.modelValue, lang)

  editor = monaco.editor.create(containerRef.value, {
    model,
    theme: props.theme,
    readOnly: props.readOnly,
    lineNumbers: props.lineNumbers,
    automaticLayout: true,
    minimap: { enabled: props.minimap },
    fontSize: 14,
    scrollBeyondLastLine: false,
    wordWrap: 'on'
  })

  // 监听内容变更，触发双向绑定
  editor.onDidChangeModelContent(() => {
    if (!model) return
    const val = model.getValue()
    suppressNextUpdate = true
    emit('update:modelValue', val)
    emit('change', val)
  })

  // 自适应容器尺寸
  resizeObserver = new ResizeObserver(() => {
    editor?.layout()
  })
  resizeObserver.observe(containerRef.value)
}

/**
 * 销毁编辑器与模型
 */
function disposeEditor() {
  resizeObserver?.disconnect()
  resizeObserver = null
  editor?.dispose()
  editor = null
  model?.dispose()
  model = null
}

/**
 * 外部值变化时同步到编辑器
 */
function syncValueToEditor(newVal: string) {
  if (suppressNextUpdate) {
    suppressNextUpdate = false
    return
  }
  if (model && newVal !== model.getValue()) {
    model.setValue(newVal)
  }
}

/**
 * 切换语言或主题
 */
function applyEditorOptions() {
  if (model) monaco.editor.setModelLanguage(model, props.language === 'vue' ? 'html' : props.language)
  if (editor) monaco.editor.setTheme(props.theme)
  editor?.updateOptions({ readOnly: props.readOnly, lineNumbers: props.lineNumbers, minimap: { enabled: props.minimap } })
}

/**
 * 公开方法：定位到指定行列并置中显示
 * @param line 行号（从1开始）
 * @param column 列号（默认1）
 */
function revealPosition(line: number, column: number = 1) {
  if (!editor) return
  editor.revealPositionInCenter({ lineNumber: line, column })
  editor.setPosition({ lineNumber: line, column })
  editor.focus()
}

/**
 * 公开方法：选中指定范围
 * @param startLine 起始行
 * @param startColumn 起始列
 * @param endLine 结束行
 * @param endColumn 结束列
 */
function setSelection(startLine: number, startColumn: number, endLine: number, endColumn: number) {
  if (!editor) return
  editor.setSelection({ startLineNumber: startLine, startColumn, endLineNumber: endLine, endColumn })
  editor.revealRangeInCenter({ startLineNumber: startLine, startColumn, endLineNumber: endLine, endColumn })
  editor.focus()
}

defineExpose({ revealPosition, setSelection })

onMounted(async () => {
  if (!import.meta.env.DEV) return
  await nextTick()
  if (!yamlConfigured) {
    try {
      configureMonacoYaml(monaco, { enableSchemaRequest: true })
      yamlConfigured = true
    } catch (e) {
      // ignore config errors in dev
    }
  }
  initEditor()
})

onBeforeUnmount(() => {
  disposeEditor()
})

watch(() => props.modelValue, (v) => syncValueToEditor(v))
watch(() => [props.language, props.theme, props.readOnly, props.lineNumbers, props.minimap], () => applyEditorOptions())
</script>

<style scoped>
/* Tailwind 控制布局，尽量不写额外样式 */
</style>
