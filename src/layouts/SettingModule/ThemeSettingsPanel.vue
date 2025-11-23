<!--
  文件用途：主题配置面板（ThemeSettingsPanel.vue）
  主要功能：
  - 静态侧边面板展示与编辑 public/config/themes.config.yaml
  - 支持选择默认主题、增删主题、编辑主题的基础信息与部分配色
  - 使用自定义确认弹窗与轻量提示，避免浏览器原生 prompt/alert/confirm
  规则遵循：
  - Vue@3 + TypeScript@5 + Vite@5，样式使用 Tailwind CSS@3
  - 禁止使用 !important 与渐变色；单文件不超过 1000 行
-->

<template>
  <!-- 非全屏下作为静态容器渲染，由父布局控制显示与位置 -->
  <div v-if="visible" class="bg-blue-50/50 h-screen w-[360px] flex flex-col border-r border-gray-200">
    <!-- 头部 -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-blue-50 h-[60px]">
      <h2 class="text-[20px] font-semibold text-gray-900 m-0">主题配置</h2>
      <div class="flex items-center gap-2">
        <button @click="openAddTheme" class="flex items-center justify-center w-8 h-8 p-0 border-0 bg-transparent text-gray-700 rounded-md cursor-pointer hover:bg-blue-100" title="添加主题">
          <Plus :size="16" />
        </button>
        <button @click="saveThemes" :disabled="!hasChanges" class="flex items-center justify-center w-8 h-8 p-0 border-0 bg-transparent text-gray-700 rounded-md cursor-pointer hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed" title="保存并刷新">
          <Save :size="16" />
        </button>
        <button @click="onRequestClose" class="flex items-center justify-center w-8 h-8 p-0 border-0 bg-transparent text-gray-700 rounded-md cursor-pointer hover:bg-blue-100" title="取消">
          <X :size="16" />
        </button>
      </div>
    </div>

    <!-- 工具栏移至标题栏右侧 -->

    <!-- 内容区 -->
    <div class="flex-1 overflow-y-auto p-4 pb-5">
      <!-- 加载状态 -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-10 text-center">
        <div class="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p class="mt-4 text-gray-600">加载中...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-10 text-center">
        <p class="text-red-500 mb-4">{{ error }}</p>
        <button @click="loadThemes"
          class="px-4 py-2 bg-blue-500 text-white border-0 rounded-md cursor-pointer hover:bg-blue-600">重试</button>
      </div>

      <!-- 主题编辑器 -->
      <div v-else>
        <!-- 默认主题选择 -->
        <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[16px] font-semibold text-gray-900">默认主题</span>
          </div>
          <select class="w-full px-2 py-1.5 text-[16px] border border-gray-300 rounded-md bg-white text-gray-700" v-model="config.default.theme"
            @change="markAsChanged">
            <option v-for="key in themeKeys" :key="key" :value="key">{{ config.themes[key]?.name || key }}</option>
          </select>
        </div>

        <!-- 主题列表 -->
        <div class="flex flex-col gap-2">
          <div v-for="themeEntry in themeEntries" :key="themeEntry.key"
            class="border border-gray-200 rounded-lg overflow-hidden transition-all duration-150"
            :class="{ 'border-blue-500': expandedThemes.has(themeEntry.key) }">
            <!-- 主题头部 -->
            <div class="flex items-center gap-2 px-3 py-2 bg-blue-50">
              <button
                class="flex items-center justify-center w-6 h-6 p-0 border-0 bg-transparent text-gray-500 cursor-pointer transition-transform duration-150"
                :class="{ 'rotate-90': expandedThemes.has(themeEntry.key) }" @click="toggleThemeExpand(themeEntry.key)">
                <ChevronRight :size="14" />
              </button>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900 text-[16px] truncate">{{ themeEntry.value.name || themeEntry.key }}</span>
                  <span class="text-[11px] text-gray-500 truncate">{{ themeEntry.key }}</span>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <button @click.stop="openEditTheme(themeEntry.key)"
                  class="flex items-center justify-center w-7 h-7 p-0 border-0 bg-transparent text-gray-600 rounded-md cursor-pointer transition-colors duration-150 hover:bg-gray-200 hover:text-gray-800"
                  title="编辑主题">
                  <Pencil :size="14" />
                </button>
                <button @click.stop="requestDeleteTheme(themeEntry.key)"
                  class="flex items-center justify-center w-7 h-7 p-0 border-0 bg-transparent text-red-500 rounded-md cursor-pointer transition-colors duration-150 hover:bg-red-50 hover:text-red-600"
                  title="删除主题">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>

            <!-- 主题预览详情 -->
            <transition enter-active-class="transition-all duration-300 ease-out overflow-hidden"
              leave-active-class="transition-all duration-300 ease-in overflow-hidden"
              enter-from-class="max-h-0 opacity-0" enter-to-class="max-h-[2000px] opacity-100"
              leave-from-class="max-h-[2000px] opacity-100" leave-to-class="max-h-0 opacity-0">
              <div v-if="expandedThemes.has(themeEntry.key)" class="px-3 py-3 border-t border-gray-200" :style="{ backgroundColor: themeEntry.value.palette.background.default }">
                <div class="flex flex-col gap-2">
                  <div class="text-[20px] " :style="{ color: themeEntry.value.palette.text.primary, fontFamily: themeEntry.value.typography.headingfont }">{{ themeEntry.value.description || '无描述' }}</div>
                  <div class="flex items-center gap-3">
                    <div class="w-1/2 h-16 p-2 border rounded-md flex items-center justify-center overflow-hidden" :style="{ backgroundColor: themeEntry.value.palette.background.default,borderColor: themeEntry.value.palette.border.subtle  }">
                      <img v-if="themeEntry.value.logo" :src="resolveResourcePath(themeEntry.value.logo)" alt="logo" class="max-w-full max-h-full" />
                      <span v-else class="text-[11px] text-gray-400">无Logo</span>
                    </div>
                    <div class="w-1/2 h-16 p-2 border rounded-md flex items-center justify-center overflow-hidden" :style="{ backgroundColor: themeEntry.value.palette.background.invert,borderColor: themeEntry.value.palette.border.subtle  }">
                      <img v-if="themeEntry.value.invertLogo" :src="resolveResourcePath(themeEntry.value.invertLogo)" alt="invertLogo" class="max-w-full max-h-full" />
                      <span v-else class="text-[11px]" :style="{ color: themeEntry.value.palette.text.invert }">无反色Logo</span>
                    </div>
                  </div>


                  <!-- 强调色：文字与色块分行，每行三个 -->
                  <div class="flex flex-col gap-1">
                    <div class="grid grid-cols-6 gap-1">
                      <span
                        v-for="(c, i) in themeEntry.value.palette.accent"
                        :key="i"
                        class=" h-16 rounded flex items-center justify-center text-white text-center text-[12px] p-1"
                        :style="{ backgroundColor: c}"
                      >
                        强调色accent{{ i + 1 }}
                      </span>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div class="p-2 border border-gray-200 rounded" :style="{ backgroundColor: themeEntry.value.palette.background.default, color: themeEntry.value.palette.text.primary, fontFamily: themeEntry.value.typography.bodyfont, borderColor: themeEntry.value.palette.border.default }">
                      <div class="text-[11px]">背景 default</div>
                      <div class="text-[14px]">Aa Bb 123</div>
                    </div>
                    <div class="p-2 border border-gray-200 rounded" :style="{ backgroundColor: themeEntry.value.palette.background.invert, color: themeEntry.value.palette.text.invert, fontFamily: themeEntry.value.typography.headingfont , borderColor: themeEntry.value.palette.border.default}">
                      <div class="text-[11px]">背景 invert</div>
                      <div class="text-[14px]">Aa Bb 123</div>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div class="p-2 border border-gray-200 rounded" :style="{ backgroundColor: themeEntry.value.palette.background.default, color: themeEntry.value.palette.text.primary, fontFamily: themeEntry.value.typography.headingfont , borderColor: themeEntry.value.palette.border.default}">
                      <div class="text-[11px]">Heading 字体示例</div>
                      <div class="text-[14px] font-semibold">标题 ABC 123</div>
                    </div>
                    <div class="p-2 border border-gray-200 rounded" :style="{ backgroundColor: themeEntry.value.palette.background.default, color: themeEntry.value.palette.text.secondary, fontFamily: themeEntry.value.typography.bodyfont , borderColor: themeEntry.value.palette.border.default}">
                      <div class="text-[11px]">Body 字体示例</div>
                      <div class="text-[12px]">正文文本示例 ABC 123</div>
                    </div>
                    <div class="p-2 border border-gray-200 rounded col-span-2" :style="{ backgroundColor: themeEntry.value.palette.background.default, color: themeEntry.value.palette.text.secondary, fontFamily: themeEntry.value.typography.codefont , borderColor: themeEntry.value.palette.border.default}">
                      <div class="text-[11px]">Code 字体示例</div>
                      <code class="text-[14px] block">const x = 123;</code>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div class="p-2 rounded border" :style="{ color: themeEntry.value.palette.text.primary, fontFamily: themeEntry.value.typography.bodyfont, borderColor: themeEntry.value.palette.border.default }">
                      <div class="text-[11px]">边框 default</div>
                    </div>
                    <div class="p-2 rounded border" :style="{color: themeEntry.value.palette.text.secondary, fontFamily: themeEntry.value.typography.bodyfont, borderColor: themeEntry.value.palette.border.subtle }">
                      <div class="text-[11px]">边框 subtle</div>
                    </div>
                    <div class="p-1 rounded col-span-2 flex items-center gap-3">
                      <span class="text-[11px]" :style="{ color: themeEntry.value.palette.text.primary, fontFamily: themeEntry.value.typography.bodyfont }">链接状态</span>
                      <span class="text-[11px]" :style="{ color: themeEntry.value.palette.link.default, fontFamily: themeEntry.value.typography.bodyfont }">default</span>
                      <span class="text-[11px]" :style="{ color: themeEntry.value.palette.link.hover, fontFamily: themeEntry.value.typography.bodyfont }">hover</span>
                      <span class="text-[11px]" :style="{ color: themeEntry.value.palette.link.visited, fontFamily: themeEntry.value.typography.bodyfont }">visited</span>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal
      v-model:visible="confirm.visible"
      :title="confirm.title"
      :message="confirm.message"
      :widthVw="40"
      :zIndex="1100"
      cancel-text="取消"
      ok-text="确定"
      @ok="confirmOk"
      @cancel="confirmCancel"
    />
  </div>
  <ThemeEditorModal
    v-if="editorVisible"
    v-model:visible="editorVisible"
    :title="editingKey ? `编辑主题：${editingKey}` : '编辑主题'"
    :theme="editingTheme"
    :themeKey="editingKey"
    @submit="handleEditorSubmit"
  />
</template>

<script setup lang="ts">
/**
 * ThemeSettingsPanel.vue
 * 文档用途：静态“主题配置”面板组件，编辑 public/config/themes.config.yaml。
 * 提供：默认主题选择、主题增删、基础信息与部分配色/字体编辑；保存后刷新页面。
 */
import { ref, computed, onMounted, watch } from 'vue'
import { X, Plus, Save, Trash2, ChevronRight, Pencil } from 'lucide-vue-next'
import { fileManagerService } from '@/core/services/FileManagerService'
import { parse, stringify } from 'yaml'
import { useToast } from '@/core/composables/useToast'
import ThemeEditorModal from '@/layouts/SettingModule/ThemeEditorModal.vue'
import { resolveResourcePath } from '@/core/utils/path'
import ConfirmModal from '@/components/editor/ConfirmModal.vue'

/** 组件属性 */
interface Props { visible: boolean }
/** 组件事件 */
interface Emits { (e: 'close'): void; (e: 'update'): void }
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

/** 主题类型定义 */
interface ThemePalette {
  text: { primary?: string; secondary?: string; invert?: string }
  background: { default?: string; invert?: string }
  border: { default?: string; subtle?: string }
  link: { default?: string; hover?: string; visited?: string }
  accent: string[]
}
interface ThemeTypography {
  headingfont?: string
  bodyfont?: string
  codefont?: string
  baseFontSize?: string
}
interface ThemeDef {
  name?: string
  description?: string
  logo?: string
  invertLogo?: string
  palette: ThemePalette
  typography: ThemeTypography
}
interface ThemesConfigFile { themes: Record<string, ThemeDef>; default: { theme: string } }

/** 本地状态 */
const loading = ref(false)
const error = ref('')
const hasChanges = ref(false)
const expandedThemes = ref<Set<string>>(new Set())
const { showToast } = useToast()
const noticeShown = ref(false)

/** 配置对象 */
const config = ref<ThemesConfigFile>({ themes: {}, default: { theme: '' } })

/** 主题键列表 */
const themeKeys = computed(() => Object.keys(config.value.themes || {}))
/** 主题条目列表（便于 v-for 渲染） */
const themeEntries = computed(() => themeKeys.value.map((key) => ({ key, value: config.value.themes[key] })))

/** 标记更改 */
function markAsChanged(): void {
  hasChanges.value = true
  if (!noticeShown.value) {
    showToast({ type: 'info', message: '更改已暂存，需要保存才能生效' })
    noticeShown.value = true
  }
}

// accent 列表不提供新增/删除，仅支持编辑现有颜色项

/** 切换主题详情展开 */
function toggleThemeExpand(themeKey: string): void {
  if (expandedThemes.value.has(themeKey)) expandedThemes.value.delete(themeKey)
  else expandedThemes.value.add(themeKey)
}

/** 编辑弹窗状态与打开 */
const editorVisible = ref(false)
const editingKey = ref('')
const editingTheme = ref<ThemeDef>({ name: '', description: '', logo: '', invertLogo: '', palette: { text: { primary: '', secondary: '', invert: '' }, background: { default: '', invert: '' }, border: { default: '', subtle: '' }, link: { default: '', hover: '', visited: '' }, accent: [] }, typography: { headingfont: '', bodyfont: '', codefont: '', baseFontSize: '' } })

function openEditTheme(themeKey: string): void {
  editingKey.value = themeKey
  editingTheme.value = JSON.parse(JSON.stringify(config.value.themes[themeKey]))
  editorVisible.value = true
}

/** 请求删除主题 */
const confirm = ref<{ visible: boolean; title: string; message: string; onOk?: () => void; onCancel?: () => void }>({
  visible: false,
  title: '确认操作',
  message: ''
})
function openConfirm(options: { title?: string; message: string; onOk?: () => void; onCancel?: () => void }): void {
  confirm.value.title = options.title || '确认操作'
  confirm.value.message = options.message
  confirm.value.onOk = options.onOk
  confirm.value.onCancel = options.onCancel
  confirm.value.visible = true
}
function confirmOk(): void { const cb = confirm.value.onOk; confirm.value.visible = false; confirm.value.onOk = undefined; cb && cb() }
function confirmCancel(): void { const cb = confirm.value.onCancel; confirm.value.visible = false; confirm.value.onCancel = undefined; cb && cb() }

/**
 * 加载主题配置
 * 读取 public/config/themes.config.yaml 并解析到本地状态
 */
async function loadThemes(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const content = await fileManagerService.readFile('public/config/themes.config.yaml')
    const cfg = parse(content) as ThemesConfigFile
    // 结构兜底：保证 palette/typography 存在，避免 v-model 报错
    const normalized: ThemesConfigFile = { themes: {}, default: cfg?.default || { theme: '' } }
    for (const [key, val] of Object.entries(cfg?.themes || {})) {
      normalized.themes[key] = {
        name: val?.name || '',
        description: val?.description || '',
        logo: val?.logo || '',
        invertLogo: val?.invertLogo || '',
        palette: {
          text: { primary: val?.palette?.text?.primary || '', secondary: val?.palette?.text?.secondary || '', invert: val?.palette?.text?.invert || '' },
          background: { default: val?.palette?.background?.default || '', invert: val?.palette?.background?.invert || '' },
          border: { default: val?.palette?.border?.default || '', subtle: val?.palette?.border?.subtle || '' },
          link: { default: val?.palette?.link?.default || '', hover: val?.palette?.link?.hover || '', visited: val?.palette?.link?.visited || '' },
          accent: Array.isArray(val?.palette?.accent) ? val!.palette!.accent! : []
        },
        typography: {
          headingfont: val?.typography?.headingfont || '',
          bodyfont: val?.typography?.bodyfont || '',
          codefont: val?.typography?.codefont || '',
          baseFontSize: val?.typography?.baseFontSize || ''
        }
      }
    }
    config.value = normalized
    noticeShown.value = false
  } catch (err: any) {
    error.value = err?.message || '加载主题配置失败'
  } finally {
    loading.value = false
  }
}

/**
 * 保存主题配置
 * 写回 public/config/themes.config.yaml，随后关闭并刷新
 */
async function saveThemes(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const content = stringify({ themes: config.value.themes, default: config.value.default })
    await fileManagerService.writeFile('public/config/themes.config.yaml', content)
    hasChanges.value = false
    noticeShown.value = false
    emit('update')
    emit('close')
    window.location.reload()
  } catch (err: any) {
    error.value = err?.message || '保存主题配置失败'
    showToast({ type: 'info', message: '保存失败：' + error.value })
  } finally {
    loading.value = false
  }
}

/** 添加主题（通过弹窗） */
function defaultTheme(): ThemeDef {
  return {
    name: '新主题',
    description: '',
    logo: '',
    invertLogo: '',
    palette: {
      text: { primary: '#000000', secondary: '#333333', invert: '#ffffff' },
      background: { default: '#ffffff', invert: '#000000' },
      border: { default: '#e5e7eb', subtle: '#d1d5db' },
      link: { default: '#3b82f6', hover: '#2563eb', visited: '#7c3aed' },
      accent: ['#3b82f6']
    },
    typography: { headingfont: 'Noto Sans SC', bodyfont: 'Noto Sans SC', codefont: 'Fira Code', baseFontSize: '16px' }
  }
}

function openAddTheme(): void {
  const base = 'newTheme'
  let key = base
  let idx = 1
  const keys = new Set(themeKeys.value)
  while (keys.has(key)) { key = `${base}-${idx++}` }
  editingKey.value = key
  editingTheme.value = defaultTheme()
  editorVisible.value = true
}

/**
 * 删除主题
 * 若删除的是默认主题，则将默认主题重置为剩余首个主题键
 */
function deleteTheme(themeKey: string): void {
  const keys = themeKeys.value
  const idx = keys.indexOf(themeKey)
  if (idx >= 0) {
    delete config.value.themes[themeKey]
    expandedThemes.value.delete(themeKey)
    // 默认主题处理
    if (config.value.default.theme === themeKey) {
      const restKeys = Object.keys(config.value.themes)
      config.value.default.theme = restKeys[0] || ''
    }
    markAsChanged()
  }
}

/** 请求删除主题（确认弹窗） */
function requestDeleteTheme(themeKey: string): void {
  openConfirm({
    title: '删除主题',
    message: `确定要删除主题 ${themeKey} 吗？`,
    onOk: () => deleteTheme(themeKey)
  })
}

/** 关闭面板 */
function onRequestClose(): void { emit('close') }

/** 初始化与监听 */

watch(() => props.visible, (v) => { if (v) { loadThemes() } })
onMounted(() => { if (props.visible) { loadThemes() } })

/** 编辑弹窗提交 */
function ensureUniqueThemeKey(base: string): string {
  const keys = new Set(Object.keys(config.value.themes || {}))
  let key = (base || '').trim() || 'newTheme'
  if (!keys.has(key)) return key
  let idx = 1
  while (keys.has(`${key}-${idx}`)) idx++
  const unique = `${key}-${idx}`
  return unique
}

function handleEditorSubmit(payload: { key: string; theme: ThemeDef }): void {
  const oldKey = editingKey.value
  let newKey = payload.key
  if (!oldKey) return
  if (!newKey) newKey = oldKey
  let normalizedNewKey = newKey
  const isKeyChanged = newKey !== oldKey
  if (isKeyChanged) normalizedNewKey = ensureUniqueThemeKey(newKey)
  if (!isKeyChanged) {
    config.value.themes[oldKey] = payload.theme
    expandedThemes.value.add(oldKey)
  } else {
    if (config.value.themes[oldKey]) delete config.value.themes[oldKey]
    config.value.themes[normalizedNewKey] = payload.theme
    expandedThemes.value.add(normalizedNewKey)
    expandedThemes.value.delete(oldKey)
    if (config.value.default.theme === oldKey) {
      config.value.default.theme = normalizedNewKey
    }
    editingKey.value = normalizedNewKey
    showToast({ type: 'success', message: `主题键已更新为 ${normalizedNewKey}` })
  }
  editorVisible.value = false
  markAsChanged()
}
</script>

<style scoped>
/* 保留滚动条样式，移除抽屉相关动画 */

/* 自定义滚动条 */
.overflow-y-auto::-webkit-scrollbar { width: 6px; }
.overflow-y-auto::-webkit-scrollbar-track { background: #f1f5f9; }
.overflow-y-auto::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
.overflow-y-auto::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>