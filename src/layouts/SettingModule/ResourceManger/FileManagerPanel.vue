<!--
  文件用途：通用资源管理面板（目录树 + 文件列表 + 上传 + 新建子目录 + 删除/重命名：目录下无文件）
  主要功能：
    1. 查看和管理指定根目录及其子目录（新建/删除/重命名子目录；删除与重命名需目录下无文件，允许仅含空子目录；展开/折叠）
    2. 按指定格式过滤显示文件，支持上传到当前目录、删除文件、预览
  使用说明：
    - 通过 props 传入根目录、面板标题、标签文本、上传接受类型、允许的扩展名列表
    - 适用于 public/img/* 下的资源管理；公共 URL 基于 BASE_URL 构建
  技术栈：Vue@3 + TypeScript@5 + Tailwind CSS@3
-->

<template>
  <div class="space-y-3 h-full">
    <div class="grid grid-cols-[240px,1fr] gap-2 h-full min-h-0">
      <div class="border border-gray-200 rounded-md p-2 bg-white h-full min-h-0 overflow-y-auto">
        <div class="space-y-1">
            <div class="flex items-center mb-2 border border-blue-600">
                            <button
                @click="viewMode = 'tile'; loadCurrentItems()"
                :class="`px-2 py-1 text-[12px] w-1/2  ${viewMode === 'tile' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`"
                aria-label="含子目录"
              >含子目录</button>
              <button
                @click="viewMode = 'folder'; loadCurrentItems()"
                :class="`px-2 py-1 text-[12px]  w-1/2  ${viewMode === 'folder' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`"
                aria-label="当前目录"
              >仅当前目录</button>

            </div>
          <DirNodeItem v-for="node in dirTree" :key="node.path" :node="node" />
        </div>
      </div>
      <div class="border border-gray-200 rounded-md p-2 bg-white h-full flex flex-col min-h-0">
        <div class="flex items-center justify-between mb-2">
          <div class="px-2 py-1 rounded bg-gray-100 text-[14px] text-gray-700">文件目录：{{ selectedDir }}</div>
          <div class="flex items-center gap-2">

            <input
              v-if="viewMode === 'tile'"
              v-model="searchQuery"
              type="text"
              placeholder="搜索文件名"
              class="px-2 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button @click="triggerUpload" class="px-2 py-1 w-24 text-[12px] bg-blue-600 text-white hover:bg-blue-700 rounded">上传文件</button>
            <slot name="header-actions"></slot>
          </div>
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto">
          <div v-if="loading" class="text-center text-gray-500 py-8">加载中...</div>
          <div v-else >
            <div v-if="filteredItems.length === 0" class="text-center text-gray-500 py-8">{{ viewMode === 'tile' ? '未找到匹配文件' : '该目录下暂无文件' }}</div>
            <div v-else class="grid grid-cols-3 gap-3">
              <div v-for="item in filteredItems" :key="item.path" class="border border-gray-200 rounded-md overflow-hidden bg-white">
                <slot name="item" :item="item" :deleteItem="deleteItem">
                  <div class="w-full h-36 bg-gray-50 flex items-center justify-center">
                    <img :src="item.publicPath" :alt="item.name" class="max-w-full max-h-full" />
                  </div>
                  <div class="px-3 py-2 text-[12px] text-gray-700 truncate">{{ item.name }}</div>
                  <div class="flex gap-2 px-3 pb-3">
                    <slot name="item-actions" :item="item"></slot>
                    <button @click="deleteItem(item)" class="px-2 py-1 text-[12px] bg-red-500 text-white hover:bg-red-600 rounded">删除</button>
                  </div>
                </slot>
              </div>
            </div>
          </div>
        </div>
  </div>
  </div>
  </div>
  <ConfirmModal
    v-model:visible="confirm.visible"
    :title="confirm.title"
    :message="confirm.message"
    :zIndex="500"
    :widthVw="40"
    :cancelText="confirm.cancelText || '取消'"
    :okText="confirm.okText || '确定'"
    @ok="confirmOk"
    @cancel="confirmCancel"
  />
  <!-- 重命名子目录对话框 -->
  <EditorModal
    v-model:visible="renameModal.visible"
    title="重命名目录"
    :widthVw="40"
    :zIndex="500"
    ok-text="重命名"
    cancel-text="取消"
    @cancel="closeRenameModal"
    @ok="confirmRenameDir"
  >
    <div class="space-y-3">
      <div>
        <label class="block text-[12px] font-medium text-gray-700 mb-1">原目录</label>
        <div class="text-[12px] text-gray-600 truncate">{{ renameModal.sourcePath }}</div>
      </div>
      <div>
        <label for="renameDirName" class="block text-[12px] font-medium text-gray-700 mb-1">新名称</label>
        <input id="renameDirName" v-model="renameDirName" type="text" placeholder="例如：assets 或 images"
               class="w-full px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <div v-if="renameDirError" class="mt-1 text-[11px] text-red-600">{{ renameDirError }}</div>
      </div>
    </div>
  </EditorModal>
  <!-- 新建子目录对话框 -->
  <EditorModal
    v-model:visible="createModal.visible"
    title="新建子目录"
    :widthVw="40"
    :zIndex="500"
    ok-text="创建"
    cancel-text="取消"
    @cancel="closeCreateModal"
    @ok="confirmCreateSubdir"
  >
    <div class="space-y-3">
      <div>
        <label class="block text-[12px] font-medium text-gray-700 mb-1">父目录</label>
        <div class="text-[12px] text-gray-600 truncate">{{ createModal.parentPath }}</div>
      </div>
      <div>
        <label for="newDirName" class="block text-[12px] font-medium text-gray-700 mb-1">子目录名称</label>
        <input id="newDirName" v-model="newDirName" type="text" placeholder="例如：assets 或 images"
               class="w-full px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <div v-if="newDirError" class="mt-1 text-[11px] text-red-600">{{ newDirError }}</div>
      </div>
    </div>
  </EditorModal>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineComponent, h, computed } from 'vue'
import { resolveResourcePath } from '@/core/utils/path'
defineSlots<{
  'item-actions'(props: { item: { name: string; path: string; publicPath: string } }): any
  'item'(props: { item: { name: string; path: string; publicPath: string }, deleteItem: (item: { name: string; path: string; publicPath: string }) => Promise<void> }): any
}>()
import { fileManagerService } from '@/core/services/FileManagerService'
import EditorModal from '@/components/editor/EditorModal.vue'
import ConfirmModal from '@/components/editor/ConfirmModal.vue'

/**
 * props：控制面板行为与呈现
 */
const props = defineProps<{
  root: string
  accept?: string
  allowedExtensions?: string[]
}>()

/**
 * 计算允许的扩展名列表（默认图片）
 */
function getAllowedExt(): string[] {
  return (props.allowedExtensions && props.allowedExtensions.length > 0)
    ? props.allowedExtensions.map(e => e.toLowerCase())
    : ['png','jpg','jpeg','svg','webp','gif']
}

/**
 * 判断文件名是否满足允许的扩展名
 */
function isAllowed(name: string): boolean {
  const lower = name.toLowerCase()
  const exts = getAllowedExt()
  return exts.some(ext => lower.endsWith('.' + ext))
}

function buildPublicUrl(rel: string): string { return resolveResourcePath(rel) }

type DirNode = { name: string; path: string; isDirectory: boolean; children?: DirNode[] }

const items = ref<{ name: string; path: string; publicPath: string }[]>([])
const allItems = ref<{ name: string; path: string; publicPath: string }[]>([])
const dirTree = ref<DirNode[]>([])
const expanded = ref<Set<string>>(new Set())
const selectedDir = ref<string>(props.root)
const loading = ref<boolean>(false)
const viewMode = ref<'folder' | 'tile'>('tile')
const searchQuery = ref<string>('')

/**
 * 持久化面板状态以便在 Vite 全量重载后自动恢复
 */
function hmrRestoreKey(): string { return `file-manager-panel:${props.root}` }
function persistPanelState(): void {
  try {
    const payload = {
      selectedDir: selectedDir.value,
      viewMode: viewMode.value,
      searchQuery: searchQuery.value,
      expanded: Array.from(expanded.value || []),
      renameModal: renameModal.value,
      renameDirName: renameDirName.value,
      createModal: createModal.value,
      newDirName: newDirName.value
    }
    sessionStorage.setItem(hmrRestoreKey(), JSON.stringify(payload))
  } catch {}
}
function restorePanelStateIfNeeded(): void {
  try {
    const raw = sessionStorage.getItem(hmrRestoreKey())
    if (!raw) return
    sessionStorage.removeItem(hmrRestoreKey())
    const data = JSON.parse(raw || '{}')
    if (typeof data.selectedDir === 'string' && data.selectedDir) selectedDir.value = data.selectedDir
    if (data.viewMode === 'folder' || data.viewMode === 'tile') viewMode.value = data.viewMode
    if (typeof data.searchQuery === 'string') searchQuery.value = data.searchQuery
    if (Array.isArray(data.expanded)) expanded.value = new Set<string>(data.expanded.map((s: any) => String(s)))
    if (data?.renameModal && typeof data.renameModal.sourcePath === 'string') renameModal.value = { visible: !!data.renameModal.visible, sourcePath: String(data.renameModal.sourcePath || '') }
    if (typeof data.renameDirName === 'string') renameDirName.value = data.renameDirName
    if (data?.createModal && typeof data.createModal.parentPath === 'string') createModal.value = { visible: !!data.createModal.visible, parentPath: String(data.createModal.parentPath || '') }
    if (typeof data.newDirName === 'string') newDirName.value = data.newDirName
    loadCurrentItems()
  } catch {}
}

const renameModal = ref<{ visible: boolean; sourcePath: string }>({ visible: false, sourcePath: '' })
const renameDirName = ref<string>('')
const renameDirError = ref<string>('')
const createModal = ref<{ visible: boolean; parentPath: string }>({ visible: false, parentPath: '' })
const newDirName = ref<string>('')
const newDirError = ref<string>('')
const confirm = ref<{ visible: boolean; title: string; message: string; okText?: string; cancelText?: string; onOk?: () => void; onCancel?: () => void }>({ visible: false, title: '确认操作', message: '' })

/**
 * 确保根目录存在
 */
async function ensureRoot(): Promise<void> {
  try { await fileManagerService.createDir(props.root) } catch {}
}

/**
 * 递归构建目录树（仅目录项）
 */
async function buildDirTree(dir: string): Promise<DirNode[]> {
  const list: any[] = await fileManagerService.listFiles(dir)
  const nodes: DirNode[] = []
  for (const e of list) {
    if (!e.isDirectory) continue
    const node: DirNode = { name: e.name, path: e.path, isDirectory: true }
    node.children = await buildDirTree(e.path)
    nodes.push(node)
  }
  return nodes
}

/**
 * 加载当前目录下的允许文件
 */
async function loadItems(): Promise<void> {
  loading.value = true
  try {
    const files: any[] = await fileManagerService.listFiles(selectedDir.value)
    items.value = (files || [])
      .filter(f => !f.isDirectory && isAllowed(f.name))
      .map(f => ({
        name: f.name,
        path: f.path,
        publicPath: buildPublicUrl(relativeImgPath(selectedDir.value, f.name))
      }))
  } finally { loading.value = false }
}

/**
 * 递归收集当前选中目录及其子目录下的允许文件（平铺模式）
 */
async function loadAllItems(): Promise<void> {
  loading.value = true
  try {
    allItems.value = await collectFilesRecursive(selectedDir.value)
  } finally { loading.value = false }
}

/**
 * 递归遍历指定目录，聚合允许的文件列表
 */
async function collectFilesRecursive(dir: string): Promise<{ name: string; path: string; publicPath: string }[]> {
  const out: { name: string; path: string; publicPath: string }[] = []
  try {
    const list: any[] = await fileManagerService.listFiles(dir)
    for (const e of (list || [])) {
      if (e.isDirectory) {
        const child = await collectFilesRecursive(e.path)
        out.push(...child)
      } else if (isAllowed(e.name)) {
        out.push({ name: e.name, path: e.path, publicPath: buildPublicUrl(relativeImgPath(dir, e.name)) })
      }
    }
  } catch {}
  return out
}

/**
 * 根据当前模式加载文件列表
 */
async function loadCurrentItems(): Promise<void> {
  if (viewMode.value === 'tile') {
    await loadAllItems()
  } else {
    await loadItems()
  }
}

/**
 * 基于 public/img 生成相对路径
 */
function relativeImgPath(dir: string, name: string): string {
  const prefix = 'public/'
  const rel = dir.startsWith(prefix) ? dir.slice(prefix.length) : dir
  const base = rel === 'img' ? 'img/' : rel.replace(/^img\/?/, 'img/') + (rel.endsWith('/') ? '' : '/')
  return (base + name).replace(/\/+/g, '/')
}

/**
 * 切换目录展开并加载文件
 */
function toggleDir(node: DirNode): void {
  if (!node.isDirectory) return
  selectedDir.value = node.path
  loadCurrentItems()
}

/**
 * 选择目录并加载文件（根据当前模式）
 */
function selectDir(path: string): void { selectedDir.value = path; loadCurrentItems() }

/**
 * 计算父目录
 */
function parentDir(path: string): string { const idx = path.lastIndexOf('/'); return idx <= 0 ? path : path.slice(0, idx) }

/**
 * 获取路径的基础名称（最后一级目录名）
 */
function basename(path: string): string {
  const clean = path.replace(/\/+$/, '').replace(/\\+/g, '/');
  const idx = clean.lastIndexOf('/');
  return idx >= 0 ? clean.slice(idx + 1) : clean
}

/**
 * 判断目录树中是否存在任意文件（递归）
 */
async function hasAnyFileRecursive(dirPath: string): Promise<boolean> {
  try {
    const list: any[] = await fileManagerService.listFiles(dirPath)
    if ((list || []).some(e => !e.isDirectory)) return true
    for (const e of (list || [])) {
      if (e.isDirectory) {
        if (await hasAnyFileRecursive(e.path)) return true
      }
    }
    return false
  } catch { return true }
}

/**
 * 仅复制空子目录结构到目标（递归，无文件复制）
 */
async function cloneEmptySubdirs(src: string, dest: string): Promise<void> {
  const list: any[] = await fileManagerService.listFiles(src)
  for (const e of (list || [])) {
    if (!e.isDirectory) continue
    const target = (dest.replace(/\/+$/, '') + '/' + e.name).replace(/\\+/g, '/').replace(/\/+/g, '/')
    await fileManagerService.createDir(target)
    await cloneEmptySubdirs(e.path, target)
  }
}

async function createSubdir(parentPath: string, name: string): Promise<void> {
  const safe = name
    .replace(/[\\/]/g, '-')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
  if (!safe) { newDirError.value = '目录名称不合法'; return }
  try {
    const siblings: any[] = await fileManagerService.listFiles(parentPath)
    if ((siblings || []).some(e => e.isDirectory && e.name === safe)) { newDirError.value = '同级目录已存在'; return }
    const target = (parentPath.replace(/\/+$/, '') + '/' + safe).replace(/\\+/g, '/').replace(/\/+/g, '/')
    await fileManagerService.createDir(target)
    await refreshTree()
    expanded.value.add(parentPath)
    expanded.value.add(target)
    selectDir(target)
  } catch { newDirError.value = '创建失败' }
}

function openRenameModal(sourcePath: string): void {
  renameModal.value = { visible: true, sourcePath }
  renameDirName.value = basename(sourcePath)
  renameDirError.value = ''
}

function openCreateModal(parentPath: string): void {
  createModal.value = { visible: true, parentPath }
  newDirName.value = ''
  newDirError.value = ''
}

function closeRenameModal(): void { renameModal.value.visible = false }

function closeCreateModal(): void { createModal.value.visible = false }

async function confirmRenameDir(): Promise<void> {
  const src = renameModal.value.sourcePath
  const parent = parentDir(src)
  const name = renameDirName.value.trim()
  if (!name) { renameDirError.value = '请输入新目录名称'; return }
  const safe = name.replace(/[\\/]/g, '-').replace(/[\u0000-\u001F\u007F]/g, '').trim()
  if (!safe) { renameDirError.value = '目录名称不合法'; return }
  try {
    const hasFiles = await hasAnyFileRecursive(src)
    if (hasFiles) { renameDirError.value = '目录下存在文件，无法重命名'; return }
    const siblings: any[] = await fileManagerService.listFiles(parent)
    if ((siblings || []).some(e => e.isDirectory && e.name === safe)) { renameDirError.value = '同级目录已存在'; return }
    const target = (parent.replace(/\/+$/, '') + '/' + safe).replace(/\\+/g, '/').replace(/\/+/g, '/')
    await fileManagerService.createDir(target)
    await cloneEmptySubdirs(src, target)
    await fileManagerService.deleteDir(src, true)
    await refreshTree()
    expanded.value.add(parent)
    expanded.value.add(target)
    selectDir(target)
    closeRenameModal()
  } catch {
    const target = (parent.replace(/\/+$/, '') + '/' + safe).replace(/\\+/g, '/').replace(/\/+/g, '/')
    const srcExists = await existsDir(src)
    const destExists = await existsDir(target)
    if (destExists && !srcExists) {
      await refreshTree()
      expanded.value.add(parent)
      expanded.value.add(target)
      selectDir(target)
      closeRenameModal()
      renameDirError.value = ''
    } else {
      renameDirError.value = '重命名失败'
    }
  }
}

async function confirmCreateSubdir(): Promise<void> {
  const name = newDirName.value.trim()
  if (!name) { newDirError.value = '请输入子目录名称'; return }
  newDirError.value = ''
  await createSubdir(createModal.value.parentPath, name)
  if (!newDirError.value) closeCreateModal()
}

/**
 * 判断是否为根目录
 */
function isRoot(path: string): boolean { return path === props.root }

/**
 * 删除目录（禁止删除根目录）
 */
async function deleteDir(dirPath: string): Promise<void> {
  if (isRoot(dirPath)) { alert('根目录不可删除'); return }
  try {
    const hasFiles = await hasAnyFileRecursive(dirPath)
    if (hasFiles) {
      openConfirm({
        title: '删除目录',
        message: '目录下存在文件，无法删除',
        okText: '知道了'
      })
      return
    }
  } catch { alert('目录状态检查失败'); return }
  openConfirm({
    title: '删除目录',
    message: `确定删除该目录（仅删除空子目录结构） ${dirPath} 吗？`,
    onOk: async () => {
      try {
        await fileManagerService.deleteDir(dirPath, true)
        expanded.value.delete(dirPath)
        const parent = parentDir(dirPath)
        selectedDir.value = parent
        await refreshTree()
        await loadItems()
      } catch {
        const stillExists = await existsDir(dirPath)
        if (!stillExists) {
          expanded.value.delete(dirPath)
          const parent = parentDir(dirPath)
          selectedDir.value = parent
          await refreshTree()
          await loadItems()
        } else {
          openConfirm({ title: '删除目录', message: '删除失败', okText: '知道了' })
        }
      }
    }
  })
}

/**
 * 判断目录是否存在（通过父目录列表）
 */
async function existsDir(path: string): Promise<boolean> {
  try {
    const parent = parentDir(path)
    const name = basename(path)
    const list: any[] = await fileManagerService.listFiles(parent)
    return (list || []).some(e => e.isDirectory && e.name === name)
  } catch { return false }
}

/**
 * 删除当前选中目录
 */
function deleteCurrentDir(): void { deleteDir(selectedDir.value) }

/**
 * 刷新目录树与文件列表
 */
async function refreshTree(): Promise<void> {
  const children = await buildDirTree(props.root)
  dirTree.value = [{ name: basename(props.root), path: props.root, isDirectory: true, children }]
  expanded.value.add(props.root)
  await loadCurrentItems()
}

const DirNodeItem = defineComponent({
  name: 'DirNodeItem',
  props: { node: { type: Object as () => DirNode, required: true } },
  setup(props) {
    return () => {
      const n = props.node
      const isSelected = selectedDir.value === n.path

      const delBtn = !isRoot(n.path)
        ? h(
            'button',
            {
              class: 'px-0.5 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100',
              title: '删除空目录',
              'aria-label': '删除空目录',
              onClick: (e: MouseEvent) => { e.stopPropagation(); deleteDir(n.path) }
            },
            [
              h(
                'svg',
                { class: 'w-3.5 h-3.5', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                [
                  h('path', { d: 'M3 6h18' }),
                  h('path', { d: 'M8 6V4h8v2' }),
                  h('path', { d: 'M19 6l-1 14H6L5 6' }),
                  h('path', { d: 'M10 11v6' }),
                  h('path', { d: 'M14 11v6' })
                ]
              )
            ]
          )
        : null

      const renameBtn = !isRoot(n.path)
        ? h(
            'button',
            {
              class: 'px-0.5 py-0.5 rounded bg-gray-50 text-gray-700 hover:bg-gray-100',
              title: '重命名目录',
              'aria-label': '重命名目录',
              onClick: (e: MouseEvent) => { e.stopPropagation(); openRenameModal(n.path) }
            },
            [
              h(
                'svg',
                { class: 'w-3.5 h-3.5', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
                [
                  h('path', { d: 'M12 20h9' }),
                  h('path', { d: 'M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z' })
                ]
              )
            ]
          )
        : null

      const addBtn = h(
        'button',
        {
          class: 'px-0.5 py-0.5 rounded bg-gray-50 text-gray-700 hover:bg-gray-100',
          title: '新建子目录',
          'aria-label': '新建子目录',
          onClick: (e: MouseEvent) => { e.stopPropagation(); openCreateModal(n.path) }
        },
        [
          h(
            'svg',
            { class: 'w-3.5 h-3.5', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
            [
              h('path', { d: 'M12 5v14' }),
              h('path', { d: 'M5 12h14' })
            ]
          )
        ]
      )

      const header = h(
        'div',
        { class: `px-2 py-1 rounded flex items-center gap-1 ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-100'}` },
        [
          h('span', { class: 'text-[14px] text-gray-800 flex-1 cursor-pointer truncate', title: n.name, onClick: () => toggleDir(n) }, n.name),
          n.isDirectory ? addBtn : null,
          n.isDirectory ? renameBtn : null,
          n.isDirectory ? delBtn : null
        ]
      )

      const children = h(
        'div',
        { class: 'ml-4 space-y-1' },
        (n.children || [])
          .filter(c => c.isDirectory)
          .map(c => h(DirNodeItem as any, { node: c, key: c.path }))
      )

      return h('div', { key: n.path }, [header, children])
    }
  }
})

/**
 * 触发上传（受 accept 限制）
 */
function triggerUpload(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = props.accept || 'image/*'
  input.onchange = () => { const file = input.files?.[0]; if (file) uploadFile(file) }
  input.click()
}

/**
 * 保证文件名不重复
 */
function ensureUniqueName(name: string): string {
  const set = new Set(items.value.map(i => i.name))
  if (!set.has(name)) return name
  const dot = name.lastIndexOf('.')
  const base = dot >= 0 ? name.slice(0, dot) : name
  const ext = dot >= 0 ? name.slice(dot) : ''
  let idx = 1
  let candidate = ''
  do { candidate = `${base}-${idx}${ext}`; idx++ } while (set.has(candidate))
  return candidate
}

/**
 * 上传文件到当前目录
 */
async function uploadFile(file: File): Promise<void> {
  try {
    const sameNameExists = items.value.some(i => i.name === file.name)
    if (sameNameExists) {
      openConfirm({
        title: '同名文件',
        message: `目录下已存在同名文件 ${file.name}，请选择操作`,
        okText: '覆盖原文件',
        cancelText: '添加为新文件',
        onOk: async () => {
          try {
            await fileManagerService.uploadFile(`${selectedDir.value}/${file.name}`, file)
            await refreshTree()
          } catch {}
        },
        onCancel: async () => {
          try {
            const finalName = ensureUniqueName(file.name)
            await fileManagerService.uploadFile(`${selectedDir.value}/${finalName}`, file)
            await refreshTree()
          } catch {}
        }
      })
      return
    }
    const finalName = ensureUniqueName(file.name)
    await fileManagerService.uploadFile(`${selectedDir.value}/${finalName}`, file)
    await refreshTree()
  } catch {}
}

/**
 * 删除文件
 */
async function deleteItem(item: { name: string; path: string }): Promise<void> {
  openConfirm({
    title: '删除文件',
    message: `确定删除 ${item.name} 吗？`,
    onOk: async () => { try { await fileManagerService.deleteFile(item.path); await loadCurrentItems() } catch {} }
  })
}

onMounted(async () => { restorePanelStateIfNeeded(); await ensureRoot(); await refreshTree() })

onMounted(() => {
  const beforeUnload = () => persistPanelState()
  window.addEventListener('beforeunload', beforeUnload)
  if ((import.meta as any).hot) {
    ;(import.meta as any).hot.on?.('vite:beforeUpdate', persistPanelState)
    ;(import.meta as any).hot.on?.('vite:full-reload', persistPanelState)
  }
  onUnmounted(() => {
    window.removeEventListener('beforeunload', beforeUnload)
    if ((import.meta as any).hot) {
      ;(import.meta as any).hot.off?.('vite:beforeUpdate', persistPanelState)
      ;(import.meta as any).hot.off?.('vite:full-reload', persistPanelState)
    }
  })
})

// 对外暴露刷新方法与选中目录，便于父组件在执行重命名等操作后主动刷新与获取当前目录
function getSelectedDir(): string { return selectedDir.value }
defineExpose({ refreshTree, loadItems, getSelectedDir })
/**
 * 当前展示文件集合（根据模式选择）
 */
const currentItems = computed(() => viewMode.value === 'tile' ? allItems.value : items.value)
/**
 * 搜索过滤后的展示文件列表
 */
const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return currentItems.value
  return currentItems.value.filter(i => i.name.toLowerCase().includes(q))
})

/** 打开确认弹窗 */
function openConfirm(options: { title?: string; message: string; okText?: string; cancelText?: string; onOk?: () => void; onCancel?: () => void }): void {
  confirm.value.title = options.title || '确认操作'
  confirm.value.message = options.message
  confirm.value.okText = options.okText
  confirm.value.cancelText = options.cancelText
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
