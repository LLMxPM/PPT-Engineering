<!--
  文件用途：路由设置面板（RouteSettingsPanel.vue）
  主要功能：
  - 更紧凑的列表样式，优先显示标题而非完整路由
  - 使用自定义模态框进行新增/编辑页面（路由）
  - 使用自定义确认弹窗与轻量提示，避免浏览器原生 prompt/alert/confirm
  - 子路由不支持图标配置，保存时自动清洗子路由 icon 字段
-->
<template>
  <!--
    改造说明：
    - 移除抽屉与遮罩层，直接将路由设置面板作为静态容器渲染，便于放置在侧边栏的左侧。
    - 保持组件通过 visible 控制显示隐藏，由父容器负责布局位置。
  -->
  <div v-if="visible" class="bg-green-50/50 h-screen w-[360px] flex flex-col border-r border-gray-200">
    <!-- 头部 -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-green-50 h-[60px]">
      <h2 class="text-xl font-semibold text-gray-900 m-0">页面（路由）设置</h2>
      <!-- 根据新需求去除右上角关闭按钮，保留标题 -->
    </div>

    <!-- 顶部轻量提示（替代浏览器 alert） -->
    <div v-if="notice.visible" class="px-4 py-2 bg-green-50 text-green-800 text-sm border-b border-green-100">
      {{ notice.message }}
    </div>
    <!-- 工具栏：添加、保存、取消 -->
    <div class="flex items-center px-4 py-4 gap-2">
      <button @click="openAddRoute"
        class="flex items-center gap-1 px-3 py-1.5 border-0 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 bg-blue-500 text-white hover:bg-blue-600">
        <Plus :size="14" />
        添加页面
      </button>
      <button @click="saveRoutes"
        class="flex items-center gap-1 px-3 py-1.5 border-0 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!hasChanges">
        <Save :size="14" />
        保存并刷新
      </button>
      <button @click="onRequestClose"
        class="flex items-center gap-1 px-3 py-1.5 border-0 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 bg-gray-200 text-gray-700 hover:bg-gray-200">
        取消
      </button>
    </div>
    <!-- 内容区 -->
    <div class="flex-1 overflow-y-auto px-4 pb-5">
      <!-- 加载状态 -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-10 text-center">
        <div class="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p class="mt-4 text-gray-600">加载中...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-10 text-center">
        <p class="text-red-500 mb-4">{{ error }}</p>
        <button @click="loadRoutes"
          class="px-4 py-2 bg-blue-500 text-white border-0 rounded-md cursor-pointer hover:bg-blue-600">
          重试
        </button>
      </div>



      <!-- 路由编辑器 -->
      <div v-else>


        <!-- 路由列表 -->
        <div class="flex flex-col gap-2">
          <div v-for="(route, index) in routes" :key="index"
            class="border border-gray-200 rounded-lg overflow-hidden transition-all duration-150"
            :class="{ 'border-blue-500': expandedRoutes.has(index) }">
            <!-- 路由头部 -->
            <div class="flex items-center gap-2 px-3 py-2 bg-green-50">
              <!-- 仅当存在子路由时显示展开按钮 -->
              <button v-if="route.children && route.children.length > 0"
                class="flex items-center justify-center w-6 h-6 p-0 border-0 bg-transparent text-gray-500 cursor-pointer transition-transform duration-150"
                :class="{ 'rotate-90': expandedRoutes.has(index) }" @click="toggleRouteExpand(index)">
                <ChevronRight :size="14" />
              </button>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <!-- 在标题前显示排序数字 -->
                  <span class="inline-flex items-center justify-center w-5 h-5 rounded bg-green-200 text-green-800 text-[11px] shrink-0">{{ route.meta?.order }}</span>
                  <span class="font-medium text-gray-900 text-sm truncate">{{ route.meta?.title || '未命名' }}</span>
                  <span class="text-[11px] text-gray-500 truncate">{{ route.route }}</span>
                </div>
              </div>

              <div class="flex items-center gap-1">
                <button @click.stop="openEditRoute(index)"
                  class="flex items-center justify-center w-7 h-7 p-0 border-0 bg-transparent text-gray-600 rounded-md cursor-pointer transition-colors duration-150 hover:bg-gray-200 hover:text-gray-800"
                  title="编辑页面路由">
                  <svg v-if="false" />
                  <Pencil :size="14" />
                </button>
                <button @click.stop="openAddChildRoute(index)"
                  class="flex items-center justify-center w-7 h-7 p-0 border-0 bg-transparent text-gray-600 rounded-md cursor-pointer transition-colors duration-150 hover:bg-gray-200 hover:text-gray-800"
                  title="新增子页面（路由）">
                  <Plus :size="14" />
                </button>
                <button @click.stop="requestDeleteRoute(index)"
                  class="flex items-center justify-center w-7 h-7 p-0 border-0 bg-transparent text-red-500 rounded-md cursor-pointer transition-colors duration-150 hover:bg-red-50 hover:text-red-600"
                  title="删除页面路由">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>

            <!-- 路由详情 -->
            <transition enter-active-class="transition-all duration-300 ease-out overflow-hidden"
              leave-active-class="transition-all duration-300 ease-in overflow-hidden"
              enter-from-class="max-h-0 opacity-0" enter-to-class="max-h-[2000px] opacity-100"
              leave-from-class="max-h-[2000px] opacity-100" leave-to-class="max-h-0 opacity-0">
              <div v-if="expandedRoutes.has(index) && route.children && route.children.length > 0" class="px-3 py-2 border-t border-gray-200">
                <!-- 子路由列表（仅展示，编辑通过弹窗） -->
                <div class="space-y-2">
                  <div v-for="(child, childIndex) in route.children" :key="childIndex"
                    class="px-3 py-2 bg-green-50 border border-gray-200 rounded-md">
                    <div class="flex items-center justify-between">
                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <!-- 在子路由标题前显示排序数字 -->
                          <span class="inline-flex items-center justify-center w-5 h-5 rounded bg-green-200 text-green-800 text-[11px] shrink-0">{{ child.meta?.order }}</span>
                          <span class="font-medium text-gray-800 text-[13px] truncate">{{ child.meta?.title || '未命名子路由'
                            }}</span>
                          <span class="text-[11px] text-gray-500 truncate">{{ child.route }}</span>
                        </div>
                      </div>
                      <div class="flex items-center gap-1">
                        <button @click="openEditChildRoute(index, childIndex)"
                          class="flex items-center justify-center w-7 h-7 p-0 border-0 bg-transparent text-gray-600 rounded-md cursor-pointer transition-colors duration-150 hover:bg-gray-200 hover:text-gray-800"
                          title="编辑页面路由">
                          <Pencil :size="13" />
                        </button>
                        <button @click="requestDeleteChildRoute(index, childIndex)"
                          class="flex items-center justify-center w-7 h-7 p-0 border-0 bg-transparent text-red-500 rounded-md cursor-pointer transition-colors duration-150 hover:bg-red-50 hover:text-red-600"
                          title="删除页面路由">
                          <Trash2 :size="13" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>


    <!-- 编辑/新增 模态框（非浏览器弹窗） -->
    <div v-if="editor.visible" class="fixed inset-0 bg-black/40 flex items-center justify-center z-[1100]">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 class="text-base font-semibold text-gray-900">{{ editorHeaderTitle }}</h3>
          <button @click="closeEditor" class="text-gray-500 hover:text-gray-700 transition-colors">
            <X :size="18" />
          </button>
        </div>
        <div class="p-4">
          <div class="space-y-3">
            <div>
              <label class="block text-[12px] font-medium text-gray-700 mb-1">显示标题</label>
              <input v-model="editor.form.meta.title" type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
            </div>
            <div>
              <label class="block text-[12px] font-medium text-gray-700 mb-1">路由路径</label>
              <input v-model="editor.form.route" type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
            </div>
            <div>
              <label class="block text-[12px] font-medium text-gray-700 mb-1">组件路径</label>
              <input v-model="editor.form.component" type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[12px] font-medium text-gray-700 mb-1">排序</label>
                <input v-model.number="editor.form.meta.order" type="number"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
              </div>
              <!-- 顶级路由允许配置图标；子路由不显示图标配置 -->
              <div v-if="editor.type === 'route'">
                <label class="block text-[12px] font-medium text-gray-700 mb-1">图标</label>
                <input v-model="editor.form.meta.icon" type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button @click="closeEditor"
            class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
            取消
          </button>
          <button @click="saveEditor"
            class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
            保存
          </button>
        </div>
      </div>
    </div>

    <!-- 通用确认弹窗（替代浏览器 confirm） -->
    <div v-if="confirm.visible" class="fixed inset-0 bg-black/40 flex items-center justify-center z-[1100]">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 class="text-base font-semibold text-gray-900">{{ confirm.title }}</h3>
          <button @click="confirmCancel" class="text-gray-500 hover:text-gray-700 transition-colors">
            <X :size="18" />
          </button>
        </div>
        <div class="p-4 text-sm text-gray-700">{{ confirm.message }}</div>
        <div class="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button @click="confirmCancel"
            class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
            取消
          </button>
          <button @click="confirmOk"
            class="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors">
            确定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { X, Plus, Save, Trash2, ChevronRight, Pencil } from 'lucide-vue-next'
import { fileManagerService } from '@/core/services/FileManagerService'
import { parse, stringify } from 'yaml'

interface RouteMeta {
  title: string
  icon?: string
  order: number
}

interface RouteChild {
  route: string
  component: string
  meta: RouteMeta
}

interface RouteConfig {
  route: string
  component: string
  meta: RouteMeta
  children?: RouteChild[]
}

interface RouteConfigFile {
  routes: RouteConfig[]
}

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'update'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const loading = ref(false)
const error = ref('')
const routes = ref<RouteConfig[]>([])
const expandedRoutes = ref<Set<number>>(new Set())
const hasChanges = ref(false)

/** 顶部提示信息（替代 alert） */
const notice = ref<{ visible: boolean; message: string }>({ visible: false, message: '' })

/** 编辑器状态：通过模态框新增/编辑 */
const editor = ref<{
  visible: boolean
  mode: 'add' | 'edit'
  type: 'route' | 'child'
  routeIndex?: number
  childIndex?: number
  form: { route: string; component: string; meta: { title: string; icon?: string; order: number } }
}>({
  visible: false,
  mode: 'add',
  type: 'route',
  form: { route: '', component: '', meta: { title: '', icon: '', order: 0 } }
})

/** 通用确认弹窗（替代 confirm） */
const confirm = ref<{ visible: boolean; title: string; message: string; onOk?: () => void; onCancel?: () => void }>({
  visible: false,
  title: '确认操作',
  message: ''
})

/** 编辑器标题 */
const editorHeaderTitle = ref('编辑')

const configPath = 'public/config/routes.config.yaml'

// 加载路由配置
async function loadRoutes() {
  loading.value = true
  error.value = ''

  try {
    const content = await fileManagerService.readFile(configPath)
    const config = parse(content) as RouteConfigFile
    routes.value = config.routes || []
  } catch (err: any) {
    error.value = err.message || '加载路由配置失败'
  } finally {
    loading.value = false
  }
}

// 保存路由配置
// 功能：保存后直接关闭并刷新页面
async function saveRoutes() {
  loading.value = true
  error.value = ''

  try {
    // 保存前对配置进行清洗：子路由不包含 icon 字段
    const sanitizedRoutes: RouteConfig[] = routes.value.map((r) => {
      const children = r.children?.map((c) => ({
        route: c.route,
        component: c.component,
        meta: { title: c.meta.title, order: c.meta.order }
      }))
      return {
        route: r.route,
        component: r.component,
        meta: { title: r.meta.title, icon: r.meta.icon, order: r.meta.order },
        children
      }
    })
    const config: RouteConfigFile = { routes: sanitizedRoutes }
    const content = stringify(config)
    await fileManagerService.writeFile(configPath, content)
    hasChanges.value = false
    // 向外部通知更新
    emit('update')
    // 保存成功后直接关闭并刷新页面
    emit('close')
    // 刷新页面以重新加载路由配置
    window.location.reload()
  } catch (err: any) {
    error.value = err.message || '保存路由配置失败'
    showNotice('保存失败：' + error.value)
  } finally {
    loading.value = false
  }
}

// 顶部提示
function showNotice(message: string) {
  notice.value = { visible: true, message }
  window.setTimeout(() => {
    notice.value.visible = false
  }, 2000)
}

// 打开确认弹窗
function openConfirm(options: { title?: string; message: string; onOk?: () => void; onCancel?: () => void }) {
  confirm.value.title = options.title || '确认操作'
  confirm.value.message = options.message
  confirm.value.onOk = options.onOk
  confirm.value.onCancel = options.onCancel
  confirm.value.visible = true
}

function confirmOk() {
  const cb = confirm.value.onOk
  confirm.value.visible = false
  confirm.value.onOk = undefined
  cb && cb()
}

function confirmCancel() {
  const cb = confirm.value.onCancel
  confirm.value.visible = false
  confirm.value.onCancel = undefined
  cb && cb()
}

// 添加路由
function addRoute() {
  const newRoute: RouteConfig = {
    route: 'new-route',
    component: '@/views/NewRoute.vue',
    meta: {
      title: '新路由',
      icon: 'FileText',
      order: routes.value.length
    }
  }
  routes.value.push(newRoute)
  markAsChanged()
}

// 通过弹窗新增顶级路由
function openAddRoute() {
  editor.value.visible = true
  editor.value.mode = 'add'
  editor.value.type = 'route'
  editorHeaderTitle.value = '新增页面（路由）'
  editor.value.form = {
    route: '',
    component: '',
    meta: { title: '', icon: '', order: routes.value.length }
  }
}

// 通过弹窗编辑顶级路由
function openEditRoute(index: number) {
  const r = routes.value[index]
  if (!r) return
  editor.value.visible = true
  editor.value.mode = 'edit'
  editor.value.type = 'route'
  editor.value.routeIndex = index
  editor.value.childIndex = undefined
  editorHeaderTitle.value = '编辑路由'
  editor.value.form = {
    route: r.route,
    component: r.component,
    meta: { title: r.meta?.title || '', icon: r.meta?.icon || '', order: r.meta?.order || 0 }
  }
}

// 通过弹窗新增子路由（子路由不配置图标）
function openAddChildRoute(parentIndex: number) {
  const parent = routes.value[parentIndex]
  if (!parent) return
  editor.value.visible = true
  editor.value.mode = 'add'
  editor.value.type = 'child'
  editor.value.routeIndex = parentIndex
  editor.value.childIndex = undefined
  editorHeaderTitle.value = '新增子页面'
  // 默认 order 取当前子路由长度
  const nextOrder = (parent.children?.length || 0)
  editor.value.form = {
    route: '',
    component: '',
    meta: { title: '', order: nextOrder }
  }
}

// 通过弹窗编辑子路由（子路由不显示图标）
function openEditChildRoute(parentIndex: number, childIndex: number) {
  const child = routes.value[parentIndex]?.children?.[childIndex]
  if (!child) return
  editor.value.visible = true
  editor.value.mode = 'edit'
  editor.value.type = 'child'
  editor.value.routeIndex = parentIndex
  editor.value.childIndex = childIndex
  editorHeaderTitle.value = '编辑子路由'
  editor.value.form = {
    route: child.route,
    component: child.component,
    meta: { title: child.meta?.title || '', order: child.meta?.order || 0 }
  }
}

function closeEditor() {
  editor.value.visible = false
}

function saveEditor() {
  const { mode, type, routeIndex, childIndex, form } = editor.value

  if (type === 'route') {
    if (mode === 'add') {
      const newRoute: RouteConfig = {
        route: form.route || 'new-route',
        component: form.component || '@/views/NewRoute.vue',
        meta: {
          title: form.meta.title || '新路由',
          icon: form.meta.icon,
          order: form.meta.order ?? routes.value.length
        }
      }
      routes.value.push(newRoute)
    } else if (mode === 'edit' && typeof routeIndex === 'number') {
      const target = routes.value[routeIndex]
      if (target) {
        target.route = form.route
        target.component = form.component
        target.meta.title = form.meta.title
        target.meta.icon = form.meta.icon
        target.meta.order = form.meta.order
      }
    }
  } else if (type === 'child') {
    const parent = typeof routeIndex === 'number' ? routes.value[routeIndex] : undefined
    if (!parent) return
    if (!parent.children) parent.children = []
    if (mode === 'add') {
      const newChild: RouteChild = {
        route: form.route || 'new-child',
        component: form.component || '@/views/NewChild.vue',
        meta: {
          title: form.meta.title || '新子路由',
          order: form.meta.order ?? parent.children.length
        }
      }
      parent.children.push(newChild)
    } else if (mode === 'edit' && typeof childIndex === 'number') {
      const child = parent.children[childIndex]
      if (child) {
        child.route = form.route
        child.component = form.component
        child.meta.title = form.meta.title
        child.meta.order = form.meta.order
      }
    }
  }

  markAsChanged()
  showNotice('更改已暂存，需要保存才能生效')
  closeEditor()
}

// 删除前请求确认（顶级路由）
function requestDeleteRoute(index: number) {
  openConfirm({
    title: '删除路由',
    message: '确定要删除这个路由吗？',
    onOk: () => deleteRoute(index)
  })
}

// 删除前请求确认（子路由）
function requestDeleteChildRoute(parentIndex: number, childIndex: number) {
  openConfirm({
    title: '删除子路由',
    message: '确定要删除这个子路由吗？',
    onOk: () => deleteChildRoute(parentIndex, childIndex)
  })
}

// 删除路由
function deleteRoute(index: number) {
  routes.value.splice(index, 1)
  expandedRoutes.value.delete(index)
  markAsChanged()
}

// 添加子路由
function addChildRoute(parentIndex: number) {
  const parent = routes.value[parentIndex]
  if (!parent.children) {
    parent.children = []
  }

  const newChild: RouteChild = {
    route: 'new-child',
    component: '@/views/NewChild.vue',
    meta: {
      title: '新子路由',
      order: parent.children.length
    }
  }

  parent.children.push(newChild)
  markAsChanged()
}

// 删除子路由
function deleteChildRoute(parentIndex: number, childIndex: number) {
  const parent = routes.value[parentIndex]
  if (parent.children) {
    parent.children.splice(childIndex, 1)
    // 当子路由被删除到 0 个时，自动收起该路由
    if (parent.children.length === 0) {
      expandedRoutes.value.delete(parentIndex)
    }
    markAsChanged()
  }
}

// 切换路由展开状态（仅当存在子路由时允许展开）
// 参数：index - 顶级路由索引
// 逻辑：
// - 若当前路由无子路由，则不执行展开/收起操作
// - 有子路由时在 expandedRoutes 集合中添加/移除索引以控制展开状态
function toggleRouteExpand(index: number) {
  const r = routes.value[index]
  if (!r || !r.children || r.children.length === 0) return
  if (expandedRoutes.value.has(index)) {
    expandedRoutes.value.delete(index)
  } else {
    expandedRoutes.value.add(index)
  }
}

// 标记为已更改
function markAsChanged() {
  hasChanges.value = true
}

// 关闭面板：根据新需求，取消不需要确认，直接关闭
function onRequestClose() {
  emit('close')
}

// 监听 visible 变化，自动加载路由
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadRoutes()
  }
})

onMounted(() => {
  if (props.visible) {
    loadRoutes()
  }
})
</script>

<style scoped>
/* 保留滚动条样式，移除抽屉相关动画 */

/* 自定义滚动条 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
