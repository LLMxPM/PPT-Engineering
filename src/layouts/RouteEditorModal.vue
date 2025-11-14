<!--
  文件用途：新增/修改页面（路由）模态框组件（RouteEditorModal.vue）
  主要功能：
  - 将原 RouteSettingsPanel.vue 内的“编辑/新增 模态框”抽取为独立组件
  - 支持顶级路由与子路由表单输入（标题、路径、组件、排序、图标）
  - 集成文件管理服务（开发模式）以列出 src/views 下的组件并支持创建新组件
  - 使用全局 Toast 提示创建/错误等信息
-->
<template>
  <div v-if="visible" class="fixed inset-0 bg-black/40 flex items-center justify-center z-[1100]">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
      <!-- 头部 -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 class="text-base font-semibold text-gray-900">{{ headerTitle }}</h3>
        <button @click="onClose" class="text-gray-500 hover:text-gray-700 transition-colors">
          <X :size="18" />
        </button>
      </div>

      <!-- 内容 -->
      <div class="p-4">
        <div class="space-y-3">
          <!-- 标题 -->
          <div>
            <label class="block text-[12px] font-medium text-gray-700 mb-1">显示标题</label>
            <input v-model="localForm.meta.title" type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
          </div>

          <!-- 路由路径 -->
          <div>
            <label class="block text-[12px] font-medium text-gray-700 mb-1">路由路径</label>
            <input v-model="localForm.route" type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
          </div>

          <!-- 组件路径（开发模式支持联想选择与新建目录/组件） -->
          <div>
            <label class="block text-[12px] font-medium text-gray-700 mb-1">组件路径</label>
            <div v-if="fmAvailable">
              <!-- 合并搜索与选择的联想输入框（Combobox） -->
              <div class="relative flex items-center gap-2">
                <input
                  v-model="componentInput"
                  type="text"
                  placeholder="输入或选择 '@/views/xxx.vue'，支持搜索"
                  @focus="openComponentSuggestions"
                  @input="onComponentInput"
                  @keydown="onComponentKeyDown"
                  @blur="onComponentInputBlur"
                  :disabled="showCreateComponent || creatingComponent"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
                />
                <button @click="showCreateComponent = true"
                  class="px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
                  新建组件
                </button>
                <!-- 下拉建议列表 -->
                <div
                  v-if="showComponentSuggestions"
                  class="absolute left-0 right-0 top-full mt-1 max-h-40 overflow-auto border border-gray-200 rounded-md bg-white shadow-sm text-sm"
                >
                  <div v-if="componentLoading" class="px-3 py-2 text-gray-500">加载组件列表...</div>
                  <template v-else>
                    <button
                      v-for="(opt, idx) in filteredComponentOptions"
                      :key="opt.value"
                      type="button"
                      @mousedown.prevent="selectComponentOption(opt)"
                      class="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      :class="{ 'bg-blue-50': idx === activeSuggestionIndex }"
                    >
                      <div class="flex items-center justify-between">
                        <!-- <span class="text-gray-900">{{ opt.label }}</span> -->
                        <span class="text-gray-900">{{ opt.value }}</span>
                      </div>
                    </button>
                    <div v-if="!filteredComponentOptions.length" class="px-3 py-2 text-gray-500">无匹配结果，支持手动输入</div>
                  </template>
                </div>
              </div>
              <p v-if="componentError" class="mt-1 text-xs text-red-500">{{ componentError }}</p>
              
              <!--  新建组件表单  -->
              <div v-if="showCreateComponent" class="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50">
                <!-- 组件目录（相对于 src/views，可新建） -->
                <label class="block text-[12px] font-medium text-gray-700 mb-1">组件目录（相对于 src/views）</label>
                <div class="relative">
                  <input
                    v-model="newComponentDir"
                    type="text"
                    placeholder="例如：feature 或 product/detail"
                    @focus="openDirSuggestions"
                    @input="onDirInput"
                    @blur="onDirBlur"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                  <!-- 目录建议列表 -->
                  <div v-if="showDirSuggestions" class="absolute left-0 right-0 mt-1 max-h-32 overflow-auto border border-gray-200 rounded-md bg-white shadow-sm text-sm">
                    <button
                      v-for="dir in filteredDirOptions"
                      :key="dir"
                      type="button"
                      @mousedown.prevent="selectDir(dir)"
                      class="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      {{ dir || '(根目录)' }}
                    </button>
                    <div v-if="!filteredDirOptions.length" class="px-3 py-2 text-gray-500">无匹配目录，可直接填写新目录</div>
                  </div>
                </div>
                <!-- 组件文件名 -->
                <label class="block text-[12px] font-medium text-gray-700 mb-1 mt-2">组件文件名</label>
                <input v-model="newComponentName" type="text" placeholder="例如：NewPage.vue"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
                <p class="text-[12px] text-gray-500 mt-1">将创建在 src/views/{{ normalizedDirPreview }}/，并自动选中。</p>
                <div class="flex justify-end gap-2 mt-2">
                  <button @click="showCreateComponent = false"
                    class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                    取消
                  </button>
                  <button @click="createAndSelectNewComponent"
                    class="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors">
                    创建并选择
                  </button>
                </div>
              </div>
            </div>
            <div v-else>
              <input v-model="localForm.component" type="text" placeholder="例如：@/views/Feature.vue"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
              <p class="text-[12px] text-gray-500 mt-1">开发服务不可用，使用手动输入（支持 '@/views/...', 或 'src/views/...' 将自动转换）。</p>
            </div>
          </div>

          <!-- 排序与图标（子路由不显示图标） -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[12px] font-medium text-gray-700 mb-1">排序</label>
              <input v-model.number="localForm.meta.order" type="number"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
            </div>
            <div v-if="type === 'route'">
              <label class="block text-[12px] font-medium text-gray-700 mb-1">图标</label>
              <input v-model="localForm.meta.icon" type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="flex justify-end gap-2 p-4 border-t border-gray-200">
        <button @click="onClose"
          class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
          取消
        </button>
        <button @click="onSave"
          class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { X } from 'lucide-vue-next'
import { fileManagerService } from '@/core/services/FileManagerService'
import { useToast } from '@/core/composables/useToast'

/**
 * Props 与 Emits 定义
 */
interface RouteMeta { title: string; icon?: string; order: number }
interface RouteForm { route: string; component: string; meta: RouteMeta }

const props = defineProps<{
  visible: boolean
  headerTitle: string
  mode: 'add' | 'edit'
  type: 'route' | 'child'
  form: RouteForm
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save'): void
  (e: 'update:form', form: RouteForm): void
}>()

/**
 * 本地表单副本：用于内部编辑，提交时同步到父组件
 */
const localForm = ref<RouteForm>({ route: '', component: '', meta: { title: '', icon: '', order: 0 } })

// 同步父 -> 子
let syncingFromProps = false
watch(
  () => props.form,
  (f) => {
    // 标记当前为“父->子”的同步过程，避免引发“子->父”的回传，从而造成循环更新
    syncingFromProps = true
    localForm.value = JSON.parse(JSON.stringify(f))
    nextTick(() => {
      syncingFromProps = false
    })
  },
  { immediate: true, deep: true }
)

// 同步子 -> 父（v-model:form）
watch(
  () => localForm.value,
  (f) => {
    // 若当前是父更新触发的本地同步，则跳过向父回传以避免递归
    if (syncingFromProps) return
    emit('update:form', f)
  },
  { deep: true }
)

/* 移动到 componentInput 定义之后，避免初始化前访问导致的 TDZ 错误 */

/** 文件管理与组件列表相关状态 */
const fmAvailable = ref(false)
const componentLoading = ref(false)
const componentError = ref('')
const componentOptions = ref<{ label: string; value: string }[]>([])
// 联想输入框（组件路径）相关状态
const componentInput = ref('')
const showComponentSuggestions = ref(false)
const activeSuggestionIndex = ref(0)
const componentSearchText = ref('')
// 新建组件相关
const showCreateComponent = ref(false)
const newComponentName = ref('NewPage.vue')
const newComponentDir = ref('')
const dirOptions = ref<string[]>([])
const showDirSuggestions = ref(false)
// 创建过程状态：用于在新建组件时禁用组件路径输入框
const creatingComponent = ref(false)

/**
 * 同步本地组件输入框与表单的 component 字段
 * - 作用：当父组件恢复状态（刷新后）或外部更新表单时，输入框能显示最新的组件路径
 */
watch(
  () => localForm.value.component,
  (val) => { componentInput.value = val || '' },
  { immediate: true }
)

/** toast */
const { showToast } = useToast()

/**
 * 计算属性：根据搜索关键字过滤组件选项
 */
const filteredComponentOptions = computed(() => {
  const kw = componentSearchText.value.trim().toLowerCase()
  if (!kw) return componentOptions.value
  return componentOptions.value.filter((opt) =>
    opt.label.toLowerCase().includes(kw) || opt.value.toLowerCase().includes(kw)
  )
})

/**
 * 目录建议过滤
 * 根据用户输入过滤 src/views 下的目录列表
 */
const filteredDirOptions = computed(() => {
  const kw = newComponentDir.value.trim().toLowerCase()
  if (!kw) return dirOptions.value
  return dirOptions.value.filter((d) => d.toLowerCase().includes(kw))
})

/**
 * 预览归一化后的目录（显示在提示文案中）
 */
const normalizedDirPreview = computed(() => normalizeDirInput(newComponentDir.value))

/**
 * 递归列出指定目录下所有 .vue 文件
 * @param dir 目录，形如 'src/views'
 * @returns 所有文件的相对路径数组（形如 'src/views/xxx.vue'）
 */
async function listVueFilesRecursively(dir: string): Promise<string[]> {
  const result: string[] = []
  try {
    const items = await fileManagerService.listFiles(dir)
    const subdirPromises: Promise<string[]>[] = []
    for (const it of items) {
      if (it.isDirectory) {
        subdirPromises.push(listVueFilesRecursively(it.path))
      } else if (it.name.endsWith('.vue')) {
        result.push(it.path)
      }
    }
    const subLists = await Promise.all(subdirPromises)
    for (const lst of subLists) {
      result.push(...lst)
    }
  } catch (e) {
    console.warn('列出组件文件时发生错误: ', e)
  }
  return result
}

/**
 * 递归列出指定目录下所有子目录
 * @param dir 目录，形如 'src/views'
 * @returns 所有子目录的相对路径数组（相对于 'src/views'，如 '', 'feature', 'feature/sub'）
 */
async function listDirectoriesRecursively(dir: string): Promise<string[]> {
  const result: string[] = []
  try {
    const items = await fileManagerService.listFiles(dir)
    for (const it of items) {
      if (it.isDirectory) {
        const rel = it.path.replace(/^src\/views\/?/, '')
        result.push(rel)
        const subDirs = await listDirectoriesRecursively(it.path)
        result.push(...subDirs.map((sd) => sd))
      }
    }
  } catch (e) {
    console.warn('列出目录时发生错误: ', e)
  }
  if (!result.includes('')) result.unshift('')
  return Array.from(new Set(result)).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

/**
 * 转换路径为 '@/' 别名形式
 * @param path 原始路径，例如 'src/views/Feature.vue'
 * @returns 别名路径，例如 '@/views/Feature.vue'
 */
function toAliasPath(path: string): string {
  return path.replace(/^src\//, '@/')
}

/**
 * 归一化目录输入
 * - 去除首尾斜杠
 * - 替换反斜杠为正斜杠
 * - 去除多余的 'src/views' 前缀
 */
function normalizeDirInput(input: string): string {
  let dir = (input || '').trim().replace(/\\/g, '/')
  dir = dir.replace(/^src\/views\/?/, '')
  dir = dir.replace(/^\/+|\/+$/g, '')
  return dir
}

/**
 * 将任意组件路径输入归一化到 '@/' 别名形式
 * - 支持 'src/views/xxx.vue' 转换为 '@/views/xxx.vue'
 * - 支持直接输入 'feature/Page.vue' 自动补全 '@/views/...'
 */
function normalizeComponentPath(input: string): string {
  const s = (input || '').trim()
  if (!s) return ''
  if (s.startsWith('@/')) return s
  if (s.startsWith('src/')) return toAliasPath(s)
  if (/^[A-Za-z0-9_\-\/]+\.vue$/.test(s) || s.includes('/')) {
    return `@/views/${s.replace(/^\/+/, '')}`
  }
  return s
}

/**
 * 构建新的 Vue 页面 SFC 内容
 * - 使用 DefaultContentPage 作为容器，符合静态 PPT 风格
 * @param fileName 新页面文件名，如 "NewPage.vue"
 */
function buildNewViewSFCContent(fileName: string): string {
  const baseName = fileName.replace(/\.vue$/, '')
  const tplOpen = '<' + 'template>'
  const tplClose = '</' + 'template>'
  const scriptOpen = '<' + 'script setup lang="ts">'
  const scriptClose = '</' + 'script>'
  const styleOpen = '<' + 'style scoped>'
  const styleClose = '</' + 'style>'
  const lines = [
    '<!--',
    '  文件用途：新页面组件（' + fileName + '）',
    '  主要功能：',
    '  - 使用 DefaultContentPage 组件构建 PPT 风格静态页面',
    '  - 内容区域高度约为 950px（去除标题和页脚）',
    '-->',
    tplOpen,
    '  <DefaultContentPage>',
    '    <div class="w-full h-[950px] flex items-center justify-center bg-white">',
    '      <!-- 将此处替换为你的页面内容（静态展示） -->',
    '      <div class="text-center">',
    '        <h1 class="text-3xl font-bold text-gray-900">新页面：' + baseName + '</h1>',
    '        <p class="mt-2 text-gray-600">请根据页面创建指南进行排版和内容填充</p>',
    '      </div>',
    '    </div>',
    '  </DefaultContentPage>',
    tplClose,
    '',
    scriptOpen,
    '/**',
    ' * 页面组件：' + fileName,
    ' * - 说明：静态内容展示，使用 DefaultContentPage 容器',
    ' */',
    'import DefaultContentPage from "@/components/layout/pagecontainer/DefaultContentPage.vue"',
    scriptClose,
    '',
    styleOpen,
    '/* 根据需要添加页面特定样式（禁止使用 !important 和渐变色） */',
    styleClose
  ]
  return lines.join('\n')
}

/**
 * 创建新组件文件到 src/views 目录，并将其设置为当前表单的组件路径
 */
async function createAndSelectNewComponent() {
  creatingComponent.value = true
  try {
    const rawName = newComponentName.value.trim()
    if (!rawName) {
      showToast({ type: 'warning', message: '请填写组件文件名' })
      return
    }
    let fileName = rawName
    if (!fileName.endsWith('.vue')) {
      fileName = `${fileName}.vue`
    }
    if (!/^[\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z0-9_-]*\.vue$/.test(fileName)) {
      showToast({ type: 'error', message: '文件名不合法，请使用中文或字母开头，允许中文、数字、-、_，后缀为 .vue' })
      return
    }
    const dirRel = normalizeDirInput(newComponentDir.value)
    const filePath = `src/views/${dirRel ? dirRel + '/' : ''}${fileName}`
    const aliasPath = toAliasPath(filePath)

    const template = buildNewViewSFCContent(fileName)
    await fileManagerService.writeFile(filePath, template)

    await loadViewComponentOptions()
    localForm.value.component = aliasPath
    componentInput.value = aliasPath
    showCreateComponent.value = false
    showToast({ type: 'success', message: '组件已创建并选中' })
  } catch (err: any) {
    const msg = err?.message || '创建组件失败'
    showToast({ type: 'error', message: msg })
  } finally {
    creatingComponent.value = false
  }
}

/**
 * 加载 views 组件选项
 */
async function loadViewComponentOptions() {
  componentLoading.value = true
  componentError.value = ''
  try {
    const paths = await listVueFilesRecursively('src/views')
    const opts = paths
      .map((p) => ({ label: p.replace(/^src\/views\//, ''), value: toAliasPath(p) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
    componentOptions.value = opts
    // 同步加载目录选项
    dirOptions.value = await listDirectoriesRecursively('src/views')
  } catch (err: any) {
    componentError.value = err?.message || '加载组件列表失败'
  } finally {
    componentLoading.value = false
  }
}

/**
 * 打开组件建议列表
 */
function openComponentSuggestions() {
  // 当处于新建组件流程或创建过程时，禁用建议框
  if (showCreateComponent.value || creatingComponent.value) return
  showComponentSuggestions.value = true
  activeSuggestionIndex.value = 0
}

/**
 * 组件输入变化：更新搜索关键字并同步到表单
 */
function onComponentInput() {
  componentSearchText.value = componentInput.value
  localForm.value.component = componentInput.value
}

/**
 * 组件输入按键处理
 * - ArrowUp / ArrowDown 切换高亮项
 * - Enter 选择或归一化手动输入
 * - Escape 关闭建议
 */
function onComponentKeyDown(e: KeyboardEvent) {
  if (!showComponentSuggestions.value) return
  const list = filteredComponentOptions.value
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeSuggestionIndex.value = Math.min(activeSuggestionIndex.value + 1, Math.max(list.length - 1, 0))
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeSuggestionIndex.value = Math.max(activeSuggestionIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const opt = list[activeSuggestionIndex.value]
    if (opt) selectComponentOption(opt)
    else {
      const normalized = normalizeComponentPath(componentInput.value)
      componentInput.value = normalized
      localForm.value.component = normalized
      showComponentSuggestions.value = false
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    showComponentSuggestions.value = false
  }
}

/**
 * 组件输入失焦：进行路径归一化并关闭建议
 */
function onComponentInputBlur() {
  setTimeout(() => {
    showComponentSuggestions.value = false
  }, 120)
  const normalized = normalizeComponentPath(componentInput.value)
  componentInput.value = normalized
  localForm.value.component = normalized
}

/**
 * 选择组件建议
 */
function selectComponentOption(opt: { label: string; value: string }) {
  componentInput.value = opt.value
  localForm.value.component = opt.value
  showComponentSuggestions.value = false
}

/**
 * 打开目录建议列表
 */
function openDirSuggestions() {
  showDirSuggestions.value = true
}

/**
 * 目录输入变化：触发计算属性过滤
 */
function onDirInput() {
  // 无需额外逻辑，依赖 filteredDirOptions
}

/**
 * 目录输入失焦：延迟关闭建议列表以支持点击选择
 */
function onDirBlur() {
  setTimeout(() => {
    showDirSuggestions.value = false
  }, 120)
}

/**
 * 选择目录建议
 */
function selectDir(dir: string) {
  newComponentDir.value = dir
  showDirSuggestions.value = false
}

/**
 * 关闭与保存事件
 */
function onClose() {
  emit('close')
}

function onSave() {
  emit('save')
}

/**
 * 键盘快捷键处理
 * - Enter: 保存
 * - Esc: 关闭
 */
function handleKeyDown(e: KeyboardEvent) {
  if (!props.visible) return
  if (e.key === 'Escape') {
    e.preventDefault()
    onClose()
  } else if (e.key === 'Enter') {
    // 避免在输入框回车触发默认行为
    e.preventDefault()
    onSave()
  }
}

/**
 * 初始化：检测文件管理服务是否可用
 */
onMounted(() => {
  // 注册键盘快捷键
  window.addEventListener('keydown', handleKeyDown)
  fileManagerService
    .isAvailable()
    .then((ok) => {
      fmAvailable.value = ok
      if (ok) loadViewComponentOptions()
    })
    .catch(() => {
      fmAvailable.value = false
    })
})

// 组件卸载时清理事件
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
/* 组件内部样式与布局遵循 Tailwind，不使用 !important 与渐变色 */
</style>