<!--
  文档用途：页面视图资源管理面板（复用通用资源管理组件）
  主要功能：
    1. 使用通用 FileManagerPanel 管理 src/views 目录下的 .vue 文件
    2. 从 YAML 路由配置生成视图到路由路径与标题的映射
    3. 支持基于路由的页面预览与本地组件预览，以及删除文件
  技术栈：Vue@3 + TypeScript@5 + Tailwind CSS@3
-->

<template>
  <div class="space-y-3 h-full">
    <div class="h-full overflow-y-auto">
      <FileManagerPanel
        ref="resPanel"
        root="src/views"
        :accept="'.vue'"
        :allowed-extensions="['vue']"
      >
        <template #header-actions>
          <button @click="openAddViewModal" class="px-2 py-1 w-24 text-[12px] bg-emerald-600 text-white hover:bg-emerald-700 rounded">新增页面</button>
        </template>
        <template #item="{ item, deleteItem }">
          <div class="w-full">
            <div class="px-3 pt-2">
              <!-- 标题与路径一行，左右分布 -->
              <div class="flex items-center justify-between">
                <div
                  v-if="getRouteInfo(item.path)"
                  class="text-[13px] text-gray-900 font-semibold truncate"
                  :title="getRouteInfo(item.path)?.routeTitle"
                >
                  {{ getRouteInfo(item.path)?.routeTitle }}
                </div>
                <div
                  v-else
                  class="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-red-700 bg-red-100 border border-red-200 rounded "
                  title="未配置路由"
                >
                  未配置路由
                </div>
                                <button
                  @click="selectComponentPath(item.path)"
                  class="  text-[12px] rounded  text-indigo-600 hover:text-indigo-900"
                >复制路径/选择组件</button>

              </div>
              <!-- 文件名称与复制路径按钮一行，名称在左，按钮在右 -->
              <div class="mt-1 flex items-center justify-between">
                <div
                  class="text-[11px] text-gray-400 truncate"
                  :title="item.name"
                >
                  {{ item.name }}
                </div>
                <div
                  class="text-[11px] text-gray-500 truncate ml-2"
                  :title="getRouteInfo(item.path)?.routePath"
                >
                  {{ getRouteInfo(item.path)?.routePath }}
                </div>
              </div>
            </div>
            <div class="px-3 pt-2">
              <div
                class="border rounded bg-gray-50 flex items-center justify-center w-full overflow-hidden"
                style="aspect-ratio: 16 / 9;"
              >
                <ViewPreview :filePath="item.path" />
              </div>
            </div>
            <div class="flex gap-1 px-3 pb-3 pt-2">
              <button
                @click="openPreviewModal({ path: item.path })"
                class="px-1 py-1 text-[12px] rounded bg-blue-600 text-white hover:bg-blue-700"
              >预览</button>
              <button
                @click="openEditModal({ path: item.path })"
                class="px-1 py-1 text-[12px] rounded bg-purple-600 text-white hover:bg-purple-700"
              >编辑</button>
              <button
                @click="downloadView(item)"
                class="px-1 py-1 text-[12px] rounded bg-indigo-600 text-white hover:bg-indigo-700"
              >下载</button>
              <button
                @click="openRouteEditor(item.path)"
                class="px-1 py-1 text-[12px] rounded bg-emerald-600 text-white hover:bg-emerald-700"
              >配置路由</button>
              <button @click="handleDeleteView(item)" class="px-1 py-1 text-[12px] bg-red-500 text-white hover:bg-red-600 rounded">删除</button>
            </div>
          </div>
        </template>
      </FileManagerPanel>

      <EditorModal 
        v-model:visible="isEditModalVisible" 
        title="编辑页面" 
        :widthVw="95" 
        :heightVh="95" 
        :showFooter="false" 
        :zIndex="1100"
      >
        <SplitEditorPreview :filePath="editPath" />
      </EditorModal>

      <div v-if="previewModalVisible" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/30" @click="closePreviewModal"></div>
        <div class="absolute inset-0 p-4 flex items-center justify-center">
          <div class="relative w-full h-full max-w-[95vw] max-h-[95vh] bg-white rounded shadow">
            <button
              @click="closePreviewModal"
              class="absolute top-3 right-3 px-2 h-7 text-[12px] bg-gray-100 text-gray-700 hover:bg-gray-200 rounded"
            >关闭</button>
            <div class="w-full h-full flex items-center justify-center">
              <ViewPreview :filePath="previewPath" />
            </div>
          </div>
        </div>
      </div>

      <RouteEditorModal
        :visible="routeEditorVisible"
        :headerTitle="routeEditorHeader"
        :mode="routeEditorMode"
        v-model:type="routeEditorType"
        v-model:form="routeEditorForm"
        v-model:parent="routeEditorParentRoute"
        :componentLocked="true"
        @close="closeRouteEditor"
        @save="saveRouteEditor"
      />

      <AddViewModal
        :visible="addViewVisible"
        :baseDir="getSelectedDir()"
        @update:visible="v => addViewVisible = v"
        @created="handleViewCreated"
      />
      <ConfirmModal
        v-model:visible="confirm.visible"
        :title="confirm.title"
        :message="confirm.message"
        :zIndex="1100"
        :widthVw="40"
        cancel-text="取消"
        ok-text="确定"
        @ok="confirmOk"
        @cancel="confirmCancel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { fileManagerService } from '@/core/services/FileManagerService'
import FileManagerPanel from './FileManagerPanel.vue'
import RouteEditorModal from '../RouteEditorModal.vue'
import AddViewModal from './AddViewModal.vue'
import { buildViewRouteInfoMap as svcBuildMap, normalizeViewComponentPath as svcNormalize, findEntryByComponent, upsertRouteEntry, deleteTopRoute, deleteChildRoute } from '@/core/services/RouteConfigService'
import ConfirmModal from '@/components/editor/ConfirmModal.vue'
import ViewPreview from '@/components/editor/ViewPreview.vue'
import SplitEditorPreview from '@/components/editor/SplitEditorPreview.vue'
import EditorModal from '@/components/editor/EditorModal.vue'

interface Emits { (e: 'close'): void; (e: 'select', component: string): void }
const emit = defineEmits<Emits>()

const previewModalVisible = ref<boolean>(false)
const previewPath = ref<string>('')
const isEditModalVisible = ref<boolean>(false)
const editPath = ref<string>('')
const routeInfoMap = ref<Record<string, { routePath: string; routeTitle: string }>>({})

const routeEditorVisible = ref<boolean>(false)
const routeEditorHeader = ref<string>('配置路由')
const routeEditorMode = ref<'add' | 'edit'>('add')
const routeEditorType = ref<'route' | 'child'>('route')
const routeEditorForm = ref<{ route: string; component: string; meta: { title: string; icon?: string; order: number } }>({ route: '', component: '', meta: { title: '', icon: '', order: 0 } })
const routeEditorParentRoute = ref<string>('')
const addViewVisible = ref<boolean>(false)
const resPanel = ref<any>(null)
const confirm = ref<{ visible: boolean; title: string; message: string; onOk?: () => void; onCancel?: () => void }>({ visible: false, title: '确认操作', message: '' })

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080

/**
 * 将 '@/views/xxx.vue' 规范化为实际文件路径 'src/views/xxx.vue'
 */
function normalizeViewComponentPath(component: string): string {
  return svcNormalize(component)
}

/**
 * 持久化面板内部状态以便在 Vite 全量重载后自动恢复
 */
const HMR_RESTORE_KEY = 'view-resource-panel:last'
function persistPanelState(): void {
  try {
    const payload = {
      preview: { visible: !!previewModalVisible.value, path: previewPath.value },
      routeEditor: {
        visible: !!routeEditorVisible.value,
        mode: routeEditorMode.value,
        type: routeEditorType.value,
        form: routeEditorForm.value,
        parent: routeEditorParentRoute.value,
        header: routeEditorHeader.value
      }
    }
    sessionStorage.setItem(HMR_RESTORE_KEY, JSON.stringify(payload))
  } catch {}
}
function restorePanelStateIfNeeded(): void {
  try {
    const raw = sessionStorage.getItem(HMR_RESTORE_KEY)
    if (!raw) return
    sessionStorage.removeItem(HMR_RESTORE_KEY)
    const data = JSON.parse(raw || '{}')
    if (data?.preview?.visible && data?.preview?.path) {
      previewPath.value = String(data.preview.path || '')
      previewModalVisible.value = true
    }
    if (data?.routeEditor?.visible) {
      routeEditorHeader.value = String(data.routeEditor.header || routeEditorHeader.value)
      routeEditorMode.value = data.routeEditor.mode === 'edit' ? 'edit' : 'add'
      routeEditorType.value = data.routeEditor.type === 'child' ? 'child' : 'route'
      routeEditorForm.value = {
        route: String(data.routeEditor?.form?.route || ''),
        component: String(data.routeEditor?.form?.component || ''),
        meta: {
          title: String(data.routeEditor?.form?.meta?.title || ''),
          icon: String(data.routeEditor?.form?.meta?.icon || ''),
          order: Number(data.routeEditor?.form?.meta?.order ?? 0)
        }
      }
      routeEditorParentRoute.value = String(data.routeEditor?.parent || '')
      routeEditorVisible.value = true
    }
  } catch {}
}

/**
 * 构建视图到路由信息映射（路径与标题）
 */
async function buildViewRouteInfoMap(): Promise<Record<string, { routePath: string; routeTitle: string }>> {
  return await svcBuildMap()
}

/**
 * 获取指定文件路径的路由信息
 */
function getRouteInfo(filePath: string): { routePath: string; routeTitle: string } | undefined {
  const key = filePath.replace(/\\/g, '/')
  return routeInfoMap.value[key]
}

/** 列表项预览缩放逻辑已交由 ViewPreview 组件内部处理 */

/**
 * 打开路由编辑模态框
 * - 根据文件路径定位 YAML 中的路由项，支持新增或编辑
 */
async function openRouteEditor(filePath: string): Promise<void> {
  const alias = toAliasPathForFile(filePath)
  const found = await findEntryByComponent(alias)
  if (found && found.type === 'route') {
    const r: any = found.entry
    routeEditorMode.value = 'edit'
    routeEditorType.value = 'route'
    routeEditorHeader.value = '编辑路由'
    routeEditorParentRoute.value = ''
    routeEditorForm.value = {
      route: String(r.route || ''),
      component: String(r.component || alias),
      meta: { title: String(r?.meta?.title || ''), icon: r?.meta?.icon || '', order: Number(r?.meta?.order ?? 0) }
    }
  } else if (found && found.type === 'child') {
    const c: any = found.entry
    routeEditorMode.value = 'edit'
    routeEditorType.value = 'child'
    routeEditorHeader.value = '编辑子路由'
    routeEditorParentRoute.value = String(found.parentRoute || '')
    routeEditorForm.value = {
      route: String(c.route || ''),
      component: String(c.component || alias),
      meta: { title: String(c?.meta?.title || ''), order: Number(c?.meta?.order ?? 0) }
    }
  } else {
    routeEditorMode.value = 'add'
    routeEditorType.value = 'route'
    routeEditorHeader.value = '新增路由'
    routeEditorParentRoute.value = ''
    routeEditorForm.value = { route: '', component: toAliasPathForFile(filePath), meta: { title: '', icon: '', order: 0 } }
  }
  routeEditorVisible.value = true
}

/**
 * 将文件路径转为 '@/' 组件别名路径
 */
function toAliasPathForFile(filePath: string): string {
  const norm = filePath.replace(/\\/g, '/').replace(/^src\//, '')
  return `@/${norm}`
}

/**
 * 关闭路由编辑模态框
 */
function closeRouteEditor(): void {
  routeEditorVisible.value = false
}

/**
 * 保存路由编辑到 YAML 文件并刷新映射
 */
async function saveRouteEditor(): Promise<void> {
  try {
    const form = routeEditorForm.value
    await upsertRouteEntry({
      type: routeEditorType.value,
      parentRoute: routeEditorParentRoute.value,
      route: form.route,
      component: form.component,
      meta: { title: form.meta.title, icon: form.meta.icon, order: form.meta.order }
    })
    routeInfoMap.value = await buildViewRouteInfoMap()
    routeEditorVisible.value = false
  } catch {}
}

/**
 * 根据视图文件路径创建异步组件并用于本地预览
 * @param filePath 视图文件的实际路径，如 'src/views/xxx.vue'
 * @returns 可用于 <component :is="..."> 的异步组件
 */
/** 异步视图组件创建逻辑已抽取到 ViewPreview 组件 */

/**
 * 打开预览弹窗（使用固定比例缩放容器）
 * @param v 视图列表项
 */
function openPreviewModal(v: { path: string }): void {
  previewPath.value = v.path
  previewModalVisible.value = true
}

/**
 * 打开编辑弹窗（使用 SplitEditorPreview 编辑并预览）
 * @param v 视图列表项
 */
function openEditModal(v: { path: string }): void {
  editPath.value = v.path
  isEditModalVisible.value = true
}

/**
 * 关闭预览弹窗
 */
function closePreviewModal(): void {
  previewModalVisible.value = false
  previewPath.value = ''
}

/**
 * 关闭编辑弹窗
 */
function closeEditModal(): void {
  isEditModalVisible.value = false
  editPath.value = ''
}

/**
 * 选择并复制组件路径
 * - 将 'src/views/xxx.vue' 转换为 '@/views/xxx.vue'
 * - 复制到剪贴板并向父组件回传
 */
  function selectComponentPath(filePath: string): void {
    const alias = toAliasPathForFile(filePath)
    try { (navigator as any)?.clipboard?.writeText?.(alias).catch(() => {}) } catch {}
    emit('select', alias)
  }

  /**
   * 下载视图文件到本地
   * @param item 当前资源项（包含名称与实际文件路径）
   */
  async function downloadView(item: { name: string; path: string }): Promise<void> {
    try {
      const filePath = item.path
      const content = await fileManagerService.readFile(filePath)
      const blob = new Blob([content ?? ''], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const nameFromPath = filePath.replace(/\\/g, '/').split('/').pop() || 'view.vue'
      a.href = url
      a.download = item.name || nameFromPath
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {}
  }

function openAddViewModal(): void { addViewVisible.value = true }

async function handleViewCreated(_p: { filePath: string }): Promise<void> {
  try {
    routeInfoMap.value = await buildViewRouteInfoMap()
    if (resPanel.value?.refreshTree) await resPanel.value.refreshTree()
  } catch {}
}

function getSelectedDir(): string {
  try {
    if (resPanel.value?.getSelectedDir) return String(resPanel.value.getSelectedDir())
  } catch {}
  return 'src/views'
}

/**
 * 初始化：构建路由信息映射
 */
onMounted(async () => {
  routeInfoMap.value = await buildViewRouteInfoMap()
})

onUnmounted(() => {})

/**
 * 监听 HMR 与页面刷新，保存并在重载后恢复面板状态
 */
onMounted(() => {
  restorePanelStateIfNeeded()
  const beforeUnload = () => persistPanelState()
  window.addEventListener('beforeunload', beforeUnload)
  if ((import.meta as any).hot) {
    ;(import.meta as any).hot.on?.('vite:beforeUpdate', persistPanelState)
    ;(import.meta as any).hot.on?.('vite:full-reload', persistPanelState)
  }
  onUnmounted(() => {
    window.removeEventListener('beforeunload', beforeUnload)
    if ( (import.meta as any).hot) {
      ;(import.meta as any).hot.off?.('vite:beforeUpdate', persistPanelState)
      ;(import.meta as any).hot.off?.('vite:full-reload', persistPanelState)
    }
  })
})

/**
 * 删除视图文件并同步删除关联路由
 * - 顶级路由：若存在子路由，提示将一并删除子路由及其页面视图文件
 * - 子路由：删除对应子路由及页面视图文件
 * - 未配置路由：仅删除页面视图文件
 */
async function handleDeleteView(item: { name: string; path: string }): Promise<void> {
  const filePath = item.path
  const alias = toAliasPathForFile(filePath)
  const found = await findEntryByComponent(alias)

  if (found && found.type === 'route') {
    const top = found.entry
    const children = Array.isArray(top.children) ? top.children : []
    const childCount = children.length
    const confirmMsg = childCount > 0
      ? `检测到该路由包含 ${childCount} 个子路由，删除将一起删除所有子路由及页面视图文件。是否继续？`
      : `确定删除该页面视图及其路由吗？`
    openConfirm({
      title: '删除路由与视图',
      message: confirmMsg,
      onOk: async () => {
        try { await deleteTopRoute(String(top.route || '')) } catch {}
        const files: string[] = [svcNormalize(String(top.component || alias)), ...children.map(c => svcNormalize(String(c.component || '')))]
        await Promise.allSettled(files.map(fp => safeDeleteFile(fp)))
        try {
          routeInfoMap.value = await buildViewRouteInfoMap()
          if (resPanel.value?.refreshTree) await resPanel.value.refreshTree()
          else if (resPanel.value?.loadItems) await resPanel.value.loadItems()
        } catch {}
      }
    })
  } else if (found && found.type === 'child') {
    const child = found.entry
    openConfirm({
      title: '删除子路由与视图',
      message: '确定删除该子路由及其页面视图文件吗？',
      onOk: async () => {
        try { await deleteChildRoute(String(found.parentRoute || ''), String(child.route || '')) } catch {}
        const childFile = svcNormalize(String(child.component || alias))
        await safeDeleteFile(childFile)
        try {
          routeInfoMap.value = await buildViewRouteInfoMap()
          if (resPanel.value?.refreshTree) await resPanel.value.refreshTree()
          else if (resPanel.value?.loadItems) await resPanel.value.loadItems()
        } catch {}
      }
    })
  } else {
    openConfirm({
      title: '删除视图文件',
      message: '该页面未配置路由，确认仅删除页面视图文件吗？',
      onOk: async () => {
        await safeDeleteFile(filePath)
        try {
          routeInfoMap.value = await buildViewRouteInfoMap()
          if (resPanel.value?.refreshTree) await resPanel.value.refreshTree()
          else if (resPanel.value?.loadItems) await resPanel.value.loadItems()
        } catch {}
      }
    })
  }
}

/**
 * 安全删除文件（忽略不存在或删除失败的异常）
 */
async function safeDeleteFile(fp: string): Promise<void> {
  try { await fileManagerService.deleteFile(fp) } catch {}
}

/** 打开确认弹窗 */
function openConfirm(options: { title?: string; message: string; onOk?: () => void; onCancel?: () => void }): void {
  confirm.value.title = options.title || '确认操作'
  confirm.value.message = options.message
  confirm.value.onOk = options.onOk
  confirm.value.onCancel = options.onCancel
  confirm.value.visible = true
}
/** 确认回调 */
function confirmOk(): void { const cb = confirm.value.onOk; confirm.value.visible = false; confirm.value.onOk = undefined; cb && cb() }
/** 取消回调 */
function confirmCancel(): void { const cb = confirm.value.onCancel; confirm.value.visible = false; confirm.value.onCancel = undefined; cb && cb() }
</script>

<style scoped>
/* 无额外样式 */
</style>
