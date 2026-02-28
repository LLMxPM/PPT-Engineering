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
  <div v-if="visible" class="bg-blue-50/50 h-screen w-[360px] flex flex-col border-r border-gray-200">
    <!-- 头部 -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-blue-50 h-[60px]">
      <h2 class="text-[20px] font-semibold text-gray-900 m-0">页面（路由）设置</h2>
      <div class="flex items-center gap-2">
        <button @click="openAddRoute"
          class="flex items-center justify-center w-8 h-8 p-0 border-0 bg-transparent text-gray-700 rounded-md cursor-pointer hover:bg-blue-100"
          title="添加页面">
          <Plus :size="16" />
        </button>
        <button @click="saveRoutes" :disabled="!hasChanges"
          class="flex items-center justify-center w-8 h-8 p-0 border-0 bg-transparent text-gray-700 rounded-md cursor-pointer hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="保存并刷新">
          <Save :size="16" />
        </button>
        <button @click="onRequestClose"
          class="flex items-center justify-center w-8 h-8 p-0 border-0 bg-transparent text-gray-700 rounded-md cursor-pointer hover:bg-blue-100"
          title="取消">
          <X :size="16" />
        </button>
      </div>
    </div>

    <!-- 顶部轻量提示改为全局 Toast（移除本地提示区域） -->
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
        <button @click="loadRoutes"
          class="px-4 py-2 bg-blue-500 text-white border-0 rounded-md cursor-pointer hover:bg-blue-600">
          重试
        </button>
      </div>



      <!-- 路由编辑器 -->
      <div v-else>


        <!-- 路由列表 -->
        <div class="flex flex-col gap-2">
          <!-- 注意：使用 route.route 作为 key，保证排序后仍有稳定的 DOM 映射 -->
          <div v-for="(route, index) in routes" :key="route.route"
            class="border border-gray-200 rounded-lg overflow-hidden transition-all duration-150"
            :class="{ 'border-blue-500': expandedRoutes.has(route.route) }">
            <!-- 路由头部 -->
            <div class="flex items-center gap-2 px-3 py-2 bg-blue-50">
              <!-- 仅当存在子路由时显示展开按钮 -->
              <button v-if="route.children && route.children.length > 0"
                class="flex items-center justify-center w-6 h-6 p-0 border-0 bg-transparent text-gray-500 cursor-pointer transition-transform duration-150"
                :class="{ 'rotate-90': expandedRoutes.has(route.route) }" @click="toggleRouteExpand(route.route)">
                <ChevronRight :size="14" />
              </button>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <!-- 在标题前显示排序数字 -->
                  <span
                    class="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-200 text-blue-800 text-[11px] shrink-0">{{
                      route.meta?.order }}</span>
                  <span class="font-medium text-gray-900 text-[14px] truncate">{{ route.meta?.title || '未命名' }}</span>
                  <!-- <span class="text-[11px] text-gray-500 truncate">{{ route.route }}</span> -->
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
              <div v-if="expandedRoutes.has(route.route) && route.children && route.children.length > 0"
                class="px-3 py-2 border-t border-gray-200">
                <!-- 子路由列表（仅展示，编辑通过弹窗） -->
                <div class="space-y-2">
                  <div v-for="(child, childIndex) in route.children" :key="childIndex"
                    class="px-3 py-2 bg-blue-50 border border-gray-200 rounded-md">
                    <div class="flex items-center justify-between">
                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <!-- 在子路由标题前显示排序数字 -->
                          <span
                            class="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-200 text-blue-800 text-[11px] shrink-0">{{
                              child.meta?.order }}</span>
                          <span class="font-medium text-gray-800 text-[13px] truncate">{{ child.meta?.title || '未命名子路由'
                          }}</span>
                          <!-- <span class="text-[11px] text-gray-500 truncate">{{ child.route }}</span> -->
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


    <!-- 编辑/新增 模态框（抽取为独立组件） -->
    <RouteEditorModal :visible="editor.visible" :headerTitle="editorHeaderTitle" :mode="editor.mode"
      v-model:type="editor.type" v-model:form="editor.form" v-model:parent="editor.parentRoute" @close="closeEditor"
      @save="saveEditor" />

    <ConfirmModal v-model:visible="confirm.visible" :title="confirm.title" :message="confirm.message" :widthVw="40"
      :zIndex="1100" cancel-text="取消" ok-text="确定" @ok="confirmOk" @cancel="confirmCancel" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { X, Plus, Save, Trash2, ChevronRight, Pencil } from 'lucide-vue-next'
import { fileManagerService } from '@/core/services/FileManagerService'
import { getRoutes, saveRoutes as saveRoutesSvc, sortRoutesInPlace } from '@/core/services/RouteConfigService'
import { useToast } from '@/core/composables/useToast'
import RouteEditorModal from '@/layouts/SettingModule/RouteEditorModal.vue'
import ConfirmModal from '@/components/editor/ConfirmModal.vue'

interface RouteMeta {
  title: string
  order: number
}

interface RouteChild {
  route: string
  component: string
  meta: RouteMeta
}

interface RouteConfig {
  route: string
  component?: string
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
// 展开状态集合：使用路由路径（route）作为键，避免排序导致索引错乱
const expandedRoutes = ref<Set<string>>(new Set())
const hasChanges = ref(false)
const { showToast } = useToast()

/**
 * 标记路由配置为已更改
 * 作用：控制顶部“保存并刷新”按钮的禁用状态，并提醒用户当前更改尚未保存
 */
const markAsChanged = () => {
  hasChanges.value = true
}

// 顶部提示改为全局 Toast：移除本地 notice 状态

/** 编辑器状态：通过模态框新增/编辑 */
const editor = ref<{
  visible: boolean
  mode: 'add' | 'edit'
  type: 'group' | 'page' | 'child'
  routeIndex?: number
  childIndex?: number
  parentRoute?: string
  form: { route: string; component: string; meta: { title: string; order: number } }
}>({
  visible: false,
  mode: 'add',
  type: 'group',
  parentRoute: '',
  form: { route: '', component: '', meta: { title: '', order: 0 } }
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
/**
 * sessionStorage 键名：用于在刷新后恢复编辑器（模态框）状态与表单
 */
const EDITOR_STORAGE_KEY = 'route-editor-session-state'

/**
 * 组件选择相关状态
 * - fmAvailable: 文件管理服务是否可用（仅开发环境）
 * - componentLoading: 组件列表加载中状态
 * - componentError: 组件列表加载错误信息
 * - componentOptions: 可选择的组件列表（值为 '@/views/...' 别名路径）
 * - componentSearchKeyword: 组件搜索关键字
 * - showCreateComponent: 是否显示创建新组件的表单
 * - newComponentName: 新组件文件名（例如：NewPage.vue）
 */
// 组件选择与新建逻辑已迁移至子组件 RouteEditorModal

// 组件选项过滤逻辑已迁移至子组件

// 加载路由配置
async function loadRoutes() {
  loading.value = true
  error.value = ''

  try {
    const list = await getRoutes()
    routes.value = list || []
    sortRoutesInPlace(routes.value)
  } catch (err: any) {
    error.value = err.message || '加载路由配置失败'
  } finally {
    loading.value = false
  }
}

// 组件列表加载逻辑迁移至子组件

// 组件文件递归列出逻辑迁移至子组件

/**
 * 转换路径为 '@/' 别名形式
 * @param path 原始路径，例如 'src/views/Feature.vue'
 * @returns 别名路径，例如 '@/views/Feature.vue'
 */
function toAliasPath(path: string): string {
  return path.replace(/^src\//, '@/')
}

/**
 * 规范化用户输入的组件路径
 * - 支持 'src/views/xxx.vue'、'views/xxx.vue'、'@/views/xxx.vue'
 * - 其他情况原样返回
 */
function normalizeComponentPathInput(input: string): string {
  const val = (input || '').trim()
  if (!val) return val
  if (val.startsWith('@/views/')) return val
  if (val.startsWith('src/views/')) return toAliasPath(val)
  if (val.startsWith('views/')) return '@/'.concat(val)
  return val
}

// 新建页面 SFC 模板构建逻辑迁移至子组件

// 保存路由配置
// 功能：保存后直接关闭并刷新页面
async function saveRoutes() {
  loading.value = true
  error.value = ''

  try {
    await saveRoutesSvc(routes.value)
    hasChanges.value = false
    // 向外部通知更新
    emit('update')
    // 保存成功后直接关闭并刷新页面
    emit('close')
    // 刷新前清理编辑器暂存状态
    clearEditorPersistedState()
    // 刷新页面以重新加载路由配置
    window.location.reload()
  } catch (err: any) {
    error.value = err.message || '保存路由配置失败'
    showNotice('保存失败：' + error.value)
  } finally {
    loading.value = false
  }
}

// 顶部提示改为全局 Toast
function showNotice(message: string) {
  showToast({ type: 'info', message })
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
      order: routes.value.length
    }
  }
  routes.value.push(newRoute)
  // 新增后进行排序
  sortRoutesInPlace(routes.value)
  markAsChanged()
}

// 通过弹窗新增顶级路由
function openAddRoute() {
  editor.value.visible = true
  editor.value.mode = 'add'
  editor.value.type = 'group'
  editor.value.parentRoute = ''
  editorHeaderTitle.value = '新增页面（路由）'
  editor.value.form = {
    route: '',
    component: '',
    meta: { title: '', order: routes.value.length }
  }
  // 组件选择与加载由子组件处理
  // 打开后立即持久化，避免刷新时丢失状态
  persistEditorState()
}

// 通过弹窗编辑顶级路由
function openEditRoute(index: number) {
  const r = routes.value[index]
  if (!r) return
  editor.value.visible = true
  editor.value.mode = 'edit'
  // 独立页面有 component，分组路由没有
  editor.value.type = (!r.children || r.children.length === 0) && r.component ? 'page' : 'group'
  editor.value.routeIndex = index
  editor.value.childIndex = undefined
  editor.value.parentRoute = ''
  editorHeaderTitle.value = '编辑页面路由'
  editor.value.form = {
    route: r.route,
    component: r.component || '',
    meta: { title: r.meta?.title || '', order: r.meta?.order || 0 }
  }
  // 组件选择与加载由子组件处理
  // 打开后立即持久化，避免刷新时丢失状态
  persistEditorState()
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
  editor.value.parentRoute = parent.route
  editorHeaderTitle.value = '新增子页面'
  // 默认 order 取当前子路由长度
  const nextOrder = (parent.children?.length || 0)
  editor.value.form = {
    route: '',
    component: '',
    meta: { title: '', order: nextOrder }
  }
  // 组件选择与加载由子组件处理
  // 打开后立即持久化，避免刷新时丢失状态
  persistEditorState()
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
  editor.value.parentRoute = routes.value[parentIndex]?.route || ''
  editorHeaderTitle.value = '编辑子页面路由'
  editor.value.form = {
    route: child.route,
    component: child.component,
    meta: { title: child.meta?.title || '', order: child.meta?.order || 0 }
  }
  // 组件选择与加载由子组件处理
  // 打开后立即持久化，避免刷新时丢失状态
  persistEditorState()
}

function closeEditor() {
  editor.value.visible = false
  // 关闭后清理持久化状态
  clearEditorPersistedState()
}

function saveEditor() {
  const { mode, type, routeIndex, childIndex, form, parentRoute } = editor.value

  const targetParentIndex = routes.value.findIndex((r) => r.route === (parentRoute || ''))

  if (mode === 'add') {
    if (type === 'group' || type === 'page') {
      if (targetParentIndex >= 0) {
        // 用户将顶级路由移动为子路由
      } else {
        const newRoute: RouteConfig = {
          route: form.route || 'new-route',
          ...(type === 'page' && form.component ? { component: normalizeComponentPathInput(form.component) } : {}),
          meta: { title: form.meta.title || '新路由', order: form.meta.order ?? routes.value.length }
        }
        routes.value.push(newRoute)
      }
    } else if (type === 'child') {
      if (targetParentIndex >= 0) {
        const parent = routes.value[targetParentIndex]
        parent.children = Array.isArray(parent.children) ? parent.children : []
        const newChild: RouteChild = {
          route: form.route || 'new-child',
          component: normalizeComponentPathInput(form.component || '@/views/NewChild.vue'),
          meta: { title: form.meta.title || '新子路由', order: form.meta.order ?? parent.children.length }
        }
        parent.children.push(newChild)
      } else {
        const newRouteFallback: RouteConfig = {
          route: form.route || 'new-route',
          ...(form.component ? { component: normalizeComponentPathInput(form.component) } : {}),
          meta: { title: form.meta.title || '新路由', order: form.meta.order ?? routes.value.length }
        }
        routes.value.push(newRouteFallback)
      }
    }
  } else if (mode === 'edit') {
    if (typeof routeIndex === 'number' && typeof childIndex !== 'number') {
      const target = routes.value[routeIndex]
      if (!target) return
      if (type === 'group' || type === 'page') {
        // 编辑顶级路由
        target.route = form.route
        const hasChildren = Array.isArray(target.children) && target.children.length > 0
        if (type === 'group' || hasChildren) {
          // 有子路由的父路由或分组路由不需要 component
          delete (target as any).component
        } else if (type === 'page' && form.component) {
          target.component = normalizeComponentPathInput(form.component)
        }
        target.meta.title = form.meta.title
        target.meta.order = form.meta.order
      } else if (type === 'child' && targetParentIndex >= 0) {
        const movedChild: RouteChild = {
          route: form.route,
          component: normalizeComponentPathInput(form.component),
          meta: { title: form.meta.title, order: form.meta.order }
        }
        routes.value.splice(routeIndex, 1)
        const parent = routes.value[targetParentIndex]
        parent.children = Array.isArray(parent.children) ? parent.children : []
        parent.children.push(movedChild)
      }
    } else if (typeof routeIndex === 'number' && typeof childIndex === 'number') {
      const parent = routes.value[routeIndex]
      if (!parent || !Array.isArray(parent.children)) return
      const child = parent.children[childIndex]
      if (!child) return
      if (type === 'child') {
        child.route = form.route
        child.component = normalizeComponentPathInput(form.component)
        child.meta.title = form.meta.title
        child.meta.order = form.meta.order
        if (targetParentIndex >= 0 && parent.route !== routes.value[targetParentIndex].route) {
          parent.children.splice(childIndex, 1)
          const targetParent = routes.value[targetParentIndex]
          targetParent.children = Array.isArray(targetParent.children) ? targetParent.children : []
          targetParent.children.push(child)
        }
      } else if (type === 'group' || type === 'page') {
        const newTop: RouteConfig = {
          route: form.route,
          ...(type === 'page' && form.component ? { component: normalizeComponentPathInput(form.component) } : {}),
          meta: { title: form.meta.title, order: form.meta.order }
        }
        parent.children.splice(childIndex, 1)
        routes.value.push(newTop)
      }
    }
  }

  // 编辑/新增后进行排序，保证展示顺序正确
  sortRoutesInPlace(routes.value)
  markAsChanged()
  showNotice('更改已暂存，需要保存才能生效')
  closeEditor()
}

// 新建组件逻辑迁移至 RouteEditorModal

// 删除前请求确认（顶级路由）
function requestDeleteRoute(index: number) {
  openConfirm({
    title: '删除路由',
    message: '确定要删除这个路由吗,子页面路由也会被删除？',
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
  const id = routes.value[index]?.route
  routes.value.splice(index, 1)
  if (id) expandedRoutes.value.delete(id)
  // 删除后进行排序，避免顺序混乱
  sortRoutesInPlace(routes.value)
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
      const parentId = parent.route
      if (parentId) expandedRoutes.value.delete(parentId)
    }
    // 子路由删除后对该父级的子路由重新排序
    parent.children.sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0))
    markAsChanged()
  }
}

// 切换路由展开状态（仅当存在子路由时允许展开）
// 参数：routeId - 顶级路由的路径标识（route 字段）
// 逻辑：
// - 若当前路由无子路由，则不执行展开/收起操作
// - 有子路由时在 expandedRoutes 集合中添加/移除索引以控制展开状态
function toggleRouteExpand(routeId: string) {
  const r = routes.value.find((x) => x.route === routeId)
  if (!r || !r.children || r.children.length === 0) return
  if (expandedRoutes.value.has(routeId)) {
    expandedRoutes.value.delete(routeId)
  } else {
    expandedRoutes.value.add(routeId)
  }
}

// 标记为已更改（已在顶部定义 markAsChanged）

// 关闭面板：根据新需求，取消不需要确认，直接关闭
function onRequestClose() {
  emit('close')
  // 面板关闭时清理持久化状态
  clearEditorPersistedState()
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
  // 组件挂载后尝试恢复编辑器状态
  restoreEditorState()
})

/* 已移至公共服务：sortRoutesInPlace */

/**
 * 将当前编辑器状态与标题持久化到 sessionStorage
 * 目的：遇到 Vite 因新增文件触发的页面刷新时，能恢复弹窗和表单内容
 */
function persistEditorState() {
  try {
    const payload = {
      editor: editor.value,
      headerTitle: editorHeaderTitle.value
    }
    sessionStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    // 忽略持久化异常，保持体验
    console.warn('持久化编辑器状态失败:', e)
  }
}

/**
 * 从 sessionStorage 恢复编辑器状态与标题
 * - 如存在且标记为可见，则自动打开模态框并填充表单
 */
function restoreEditorState() {
  try {
    const raw = sessionStorage.getItem(EDITOR_STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (data && data.editor) {
      const restored = data.editor
      // 逐字段赋值以维持响应式引用
      editor.value.visible = !!restored.visible
      editor.value.mode = restored.mode || 'add'
      editor.value.type = restored.type || 'group'
      editor.value.routeIndex = restored.routeIndex
      editor.value.childIndex = restored.childIndex
      editor.value.parentRoute = restored.parentRoute || ''
      editor.value.form = {
        route: restored.form?.route || '',
        component: restored.form?.component || '',
        meta: {
          title: restored.form?.meta?.title || '',
          order: typeof restored.form?.meta?.order === 'number' ? restored.form.meta.order : 0
        }
      }
    }
    if (data && typeof data.headerTitle === 'string') {
      editorHeaderTitle.value = data.headerTitle
    }
  } catch (e) {
    console.warn('恢复编辑器状态失败:', e)
  }
}

/**
 * 清理持久化的编辑器状态
 * - 在关闭模态框或面板、保存并刷新前调用
 */
function clearEditorPersistedState() {
  try {
    sessionStorage.removeItem(EDITOR_STORAGE_KEY)
  } catch (e) {
    // 忽略清理异常
  }
}

/**
 * 侦听编辑器与标题变化，实时持久化
 * - 深度侦听 editor，确保表单输入随时保存
 * - 仅在 editor 可见时保存，避免无用写入
 */
watch(editor, (val) => {
  if (val.visible) {
    persistEditorState()
  }
}, { deep: true })

watch(editorHeaderTitle, () => {
  if (editor.value.visible) {
    persistEditorState()
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
