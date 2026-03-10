<!--
  文件用途：新增/修改页面（路由）模态框组件（RouteEditorModal.vue）
  主要功能：
  - 将原 RouteSettingsPanel.vue 内的“编辑/新增 模态框”抽取为独立组件
  - 支持顶级路由与子路由表单输入（标题、路径、组件、排序、图标）
  - 集成文件管理服务（开发模式）以列出 src/views 下的组件
  - 支持打开视图资源面板弹窗选择并回填组件路径
-->
<template>
  <EditorModal :visible="visible" :title="headerTitle" :widthVw="75" :zIndex="102"
    @update:visible="v => { if (!v) onClose() }" @cancel="onClose" @ok="onSave">
    <div class="p-0">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-6">
        <!-- 左侧：表单配置区 -->
        <div class="md:col-span-3 space-y-4">
          <!-- 标题与路由路径 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[14px] font-medium text-gray-700 mb-1">显示标题</label>
              <input v-model="localForm.meta.title" type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
            </div>
            <div>
              <label class="block text-[14px] font-medium text-gray-700 mb-1">路由路径</label>
              <input v-model="localForm.route" type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
            </div>
          </div>
          <!-- 路由层级选择和排序 -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[14px] font-medium text-gray-700 mb-1">路由层级</label>
              <div class="flex items-center h-[38px] gap-6">
                <label class="inline-flex items-center gap-2 text-[14px] text-gray-700 cursor-pointer">
                  <input type="radio" class="h-4 w-4" value="group" v-model="localType" />
                  <span>分组路由</span>
                </label>
                <label class="inline-flex items-center gap-2 text-[14px] text-gray-700 cursor-pointer">
                  <input type="radio" class="h-4 w-4" value="page" v-model="localType" />
                  <span>独立页面</span>
                </label>
                <label class="inline-flex items-center gap-2 text-[14px] text-gray-700 cursor-pointer">
                  <input type="radio" class="h-4 w-4" value="child" v-model="localType" />
                  <span>子页面</span>
                </label>
              </div>
            </div>
            <div>
              <label class="block text-[14px] font-medium text-gray-700 mb-1">排序</label>
              <input v-model.number="localForm.meta.order" type="number"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
            </div>
          </div>
          <!-- 父路由选择 -->
          <div v-if="localType === 'child'">
            <label class="block text-[14px] font-medium text-gray-700 mb-1">父路由</label>
            <select v-model="localParentRoute"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500">
              <option v-for="opt in parentOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}（{{ opt.value }}）
              </option>
            </select>
            <p v-if="noParentOptions" class="mt-1 text-[12px] text-gray-500">暂无分组路由可作为父路由，请先创建分组路由。</p>
          </div>


          <!-- 组件路径（开发模式支持联想与弹窗选择组件） -->
          <div>
            <label class="block text-[14px] font-medium text-gray-700 mb-1">组件路径</label>
            <p v-if="localType === 'group'" class="text-[12px] text-amber-600 mb-1">提示：分组路由不指向具体页面组件</p>
            <div v-if="localType === 'group'">
              <input type="text" disabled placeholder="无需配置组件"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-[14px] bg-gray-100 text-gray-500" />
            </div>
            <div v-else-if="props.componentLocked">
              <input v-model="localForm.component" type="text" disabled
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-[14px] bg-gray-100 text-gray-500" />
            </div>
            <div v-else-if="fmAvailable">
              <!-- 合并搜索与选择的联想输入框（Combobox） -->
              <div class="relative flex items-center gap-2">
                <input v-model="componentInput" type="text" placeholder="输入或选择 '@/views/xxx.vue'，支持搜索"
                  @focus="openComponentSuggestions" @input="onComponentInput" @keydown="onComponentKeyDown"
                  @blur="onComponentInputBlur"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
                <button @click="openComponentPicker"
                  class="px-3 py-2 text-[12px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex-shrink-0">
                  选择组件
                </button>
                <!-- 下拉建议列表 -->
                <div v-if="showComponentSuggestions"
                  class="absolute left-0 right-0 top-full mt-1 max-h-40 overflow-auto border border-gray-200 rounded-md bg-white shadow-sm text-[14px] z-50">
                  <div v-if="componentLoading" class="px-3 py-2 text-gray-500">加载组件列表...</div>
                  <template v-else>
                    <button v-for="(opt, idx) in filteredComponentOptions" :key="opt.value" type="button"
                      @mousedown.prevent="selectComponentOption(opt)"
                      class="w-full text-left px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      :class="{ 'bg-blue-50': idx === activeSuggestionIndex }">
                      <div class="flex items-center justify-between">
                        <span class="text-gray-900">{{ opt.value }}</span>
                      </div>
                    </button>
                    <div v-if="!filteredComponentOptions.length" class="px-3 py-2 text-gray-500">无匹配结果，支持手动输入</div>
                  </template>
                </div>
              </div>
              <p v-if="componentError" class="mt-1 text-[12px] text-red-500">{{ componentError }}</p>
            </div>
            <div v-else>
              <input v-model="localForm.component" type="text" placeholder="例如：@/views/Feature.vue"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
              <p class="text-[14px] text-gray-500 mt-1">开发服务不可用，使用手动输入（支持 '@/views/...', 或 'src/views/...' 将自动转换）。</p>
            </div>
          </div>
        </div>

        <!-- 右侧：页面组件预览 -->
        <div class="md:col-span-2 flex flex-col">
          <label class="block text-[14px] font-medium text-gray-700 mb-1">页面组件预览</label>
          <div class="border rounded bg-gray-50 flex items-center justify-center w-full grow overflow-hidden"
            style="aspect-ratio: 16 / 9; max-height: 100%;">
            <ViewPreview v-if="localForm.component" :filePath="localForm.component" />
            <div v-else
              class="w-full h-full flex items-center justify-center text-center p-4 text-[12px] text-gray-500">
              请选择或输入有效的视图组件路径
            </div>
          </div>
        </div>
      </div>
    </div>
  </EditorModal>
  <EditorModal :visible="componentPickerVisible" :title="'选择页面组件'" :widthVw="85" :heightVh="95" :zIndex="103"
    :showFooter="false" @update:visible="v => { if (!v) componentPickerVisible = false }"
    @cancel="() => { componentPickerVisible = false }">
    <div class="h-[calc(95vh-100px)]">
      <ViewResourcePanel @select="handleComponentSelected" @close="() => { componentPickerVisible = false }" />
    </div>
  </EditorModal>

</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { fileManagerService } from '@/core/services/FileManagerService'
import EditorModal from '@/components/editor/EditorModal.vue'
import { listParentRouteOptions } from '@/core/services/RouteConfigService'
import ViewResourcePanel from '@/layouts/SettingModule/ResourceManger/ViewResourcePanel.vue'
import ViewPreview from '@/components/editor/ViewPreview.vue'

/**
 * Props 与 Emits 定义
 */
interface RouteMeta { title: string; order: number }
interface RouteForm { route: string; component?: string; meta: RouteMeta }

const props = defineProps<{
  visible: boolean
  headerTitle: string
  mode: 'add' | 'edit'
  type: 'group' | 'page' | 'child'
  form: RouteForm
  componentLocked?: boolean
  parent?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save'): void
  (e: 'update:form', form: RouteForm): void
  (e: 'update:type', t: 'group' | 'page' | 'child'): void
  (e: 'update:parent', parent: string): void
}>()

/**
 * 本地表单副本：用于内部编辑，提交时同步到父组件
 */
const localForm = ref<RouteForm>({ route: '', component: '', meta: { title: '', order: 0 } })
/** 路由层级本地状态 */
const localType = ref<'group' | 'page' | 'child'>('group')
/** 父路由选择本地状态（值为顶级路由的 route 字段） */
const localParentRoute = ref<string>('')

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

// 同步父 -> 子：type 与 parent
watch(
  () => props.type,
  (t) => {
    syncingFromProps = true
    localType.value = t
    nextTick(() => { syncingFromProps = false })
  },
  { immediate: true }
)

watch(
  () => props.parent,
  (p) => {
    syncingFromProps = true
    localParentRoute.value = p || ''
    nextTick(() => { syncingFromProps = false })
  },
  { immediate: true }
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

// 子 -> 父：type 与 parent
watch(
  () => localType.value,
  (t) => {
    if (syncingFromProps) return
    emit('update:type', t)
  }
)

watch(
  () => localParentRoute.value,
  (p) => {
    if (syncingFromProps) return
    emit('update:parent', p)
  }
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
// 组件选择弹窗状态
const componentPickerVisible = ref(false)


/** 顶级路由选项（作为子路由的父级选择） */
const parentOptions = ref<{ label: string; value: string }[]>([])

/** 预览逻辑已抽取至 ViewPreview 组件 */

/**
 * 同步本地组件输入框与表单的 component 字段
 * - 作用：当父组件恢复状态（刷新后）或外部更新表单时，输入框能显示最新的组件路径
 */
watch(
  () => localForm.value.component,
  (val) => { componentInput.value = val || '' },
  { immediate: true }
)

// 预览组件由 ViewPreview 直接根据 localForm.component 渲染

// 已移除 toast（不再使用新建组件功能）

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

// 去除目录建议与预览逻辑（不再支持在此新建组件）

/** 父路由选项是否为空 */
const noParentOptions = computed(() => parentOptions.value.length === 0)

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

// 去除子目录递归列出逻辑（不再支持在此新建组件）

/**
 * 转换路径为 '@/' 别名形式
 * @param path 原始路径，例如 'src/views/Feature.vue'
 * @returns 别名路径，例如 '@/views/Feature.vue'
 */
function toAliasPath(path: string): string {
  return path.replace(/^src\//, '@/')
}

// 去除目录输入归一化逻辑（不再支持在此新建组件）

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

// 异步视图组件创建逻辑已抽取到 ViewPreview

// 缩放逻辑由 ViewPreview 处理

/**
 * 加载父路由选项（来自 YAML 配置的顶级 routes）
 */
async function loadParentRouteOptions(): Promise<void> {
  try {
    parentOptions.value = await listParentRouteOptions()
  } catch {
    parentOptions.value = []
  }
}

// 构建新页面模板逻辑已移除

/** 打开组件选择弹窗 */
function openComponentPicker(): void {
  componentPickerVisible.value = true
}

/** 处理从资源面板选择的组件路径并回填 */
function handleComponentSelected(aliasPath: string): void {
  const normalized = normalizeComponentPath(aliasPath)
  componentInput.value = normalized
  localForm.value.component = normalized
  componentPickerVisible.value = false
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

// 目录建议交互逻辑已移除

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
  fileManagerService
    .isAvailable()
    .then((ok) => {
      fmAvailable.value = ok
      if (ok) loadViewComponentOptions()
    })
    .catch(() => {
      fmAvailable.value = false
    })
  loadParentRouteOptions()
})

// 组件卸载时清理事件
onUnmounted(() => { })
</script>

<style scoped>
/* 组件内部样式与布局遵循 Tailwind，不使用 !important 与渐变色 */
</style>
