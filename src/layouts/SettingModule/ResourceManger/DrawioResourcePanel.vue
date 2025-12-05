<!--
  文件用途：drawio 资源面板（引用通用资源管理组件）
  主要功能：使用 FileManagerPanel 管理 public/img/drawio 下的图片目录及文件
  技术栈：Vue@3 + TypeScript@5 + Tailwind CSS@3
-->

<template>
  <FileManagerPanel
    ref="panelRef"
    root="public/img/drawio"
    accept=".drawio"
    :allowedExtensions="['drawio']"
  >
    <template #item="{ item, deleteItem }">
      <div class="w-full h-36 bg-gray-50 flex items-center justify-center">
        <DrawioChart :src="toRelativeResourcePath(item.path)" :width="'100%'" :height="144" :showBorder="false" />
      </div>
      <div class="px-3 py-2 text-[12px] text-gray-700 truncate">{{ item.name }}</div>
      <div class="flex gap-2 px-3 pb-3">
        <button @click="openRename(item)" title="重命名" aria-label="重命名" class="px-2 py-1 text-[12px] bg-gray-100 hover:bg-gray-200 rounded inline-flex items-center gap-1">
          <AppIcon name="Edit" size="16" />
        </button>
        <button @click="copyChartUsage(item)" title="复制组件用法" aria-label="复制组件用法" class="px-2 py-1 text-[12px] bg-gray-100 hover:bg-gray-200 rounded inline-flex items-center gap-1">
          <AppIcon name="ClipboardList" size="16" />
        </button>
        <button @click="deleteItem(item)" title="删除" aria-label="删除" class="px-2 py-1 text-[12px] bg-red-500 text-white hover:bg-red-600 rounded inline-flex items-center gap-1">
          <AppIcon name="Trash" size="16" />
        </button>
      </div>
    </template>
  </FileManagerPanel>

  <EditorModal
    v-model:visible="renameModal.visible"
    title="重命名文件"
    :widthVw="40"
    :zIndex="500"
    @cancel="closeRename"
    @ok="confirmRename"
  >
    <div class="space-y-3">
      <div>
        <label for="newName" class="block text-[12px] font-medium text-gray-700 mb-1">新文件名</label>
        <input id="newName" v-model="renameModal.newName" type="text" placeholder="例如：diagram.drawio"
               class="w-full px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <div v-if="renameModal.error" class="mt-1 text-[11px] text-red-600">{{ renameModal.error }}</div>
      </div>
    </div>
  </EditorModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileManagerPanel from '@/layouts/SettingModule/ResourceManger/FileManagerPanel.vue'
import DrawioChart from '@/components/layout/contentcommon/DrawioChart.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { fileManagerService } from '@/core/services/FileManagerService'
import { toast } from '@/core/composables/useToast'
import EditorModal from '@/components/editor/EditorModal.vue'

type Item = { name: string; path: string; publicPath: string }

const panelRef = ref<{ refreshTree: () => Promise<void>; loadItems: () => Promise<void> } | null>(null)



/**
 * 重命名弹窗状态
 */
const renameModal = ref<{ visible: boolean; item: Item | null; newName: string; error: string }>({ visible: false, item: null, newName: '', error: '' })
function openRename(item: Item): void { renameModal.value = { visible: true, item, newName: item.name, error: '' } }
function closeRename(): void { renameModal.value.visible = false }

/**
 * 计算父目录路径
 */
function parentDir(path: string): string {
  const idx = path.lastIndexOf('/')
  return idx <= 0 ? path : path.slice(0, idx)
}

/**
 * 获取扩展名（含点）
 */
function extname(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx) : ''
}

/**
 * 校验 .drawio 扩展名
 */
function isAllowedDrawioName(name: string): boolean {
  return name.toLowerCase().endsWith('.drawio')
}

/**
 * 在目录内确保文件名唯一
 */
async function ensureUniqueInDir(dirPath: string, name: string): Promise<string> {
  const files = await fileManagerService.listFiles(dirPath)
  const set = new Set(files.filter(f => !f.isDirectory).map(f => f.name))
  if (!set.has(name)) return name
  const dot = name.lastIndexOf('.')
  const base = dot >= 0 ? name.slice(0, dot) : name
  const ext = dot >= 0 ? name.slice(dot) : ''
  let i = 1
  let candidate = ''
  do { candidate = `${base}-${i}${ext}`; i++ } while (set.has(candidate))
  return candidate
}

/**
 * 确认重命名：复制到新文件并删除旧文件
 */
async function confirmRename(): Promise<void> {
  const item = renameModal.value.item
  if (!item) return
  let name = renameModal.value.newName.trim()
  if (!name) { renameModal.value.error = '请输入新文件名'; return }
  if (!name.includes('.')) name = `${name}${extname(item.name)}`
  if (!isAllowedDrawioName(name)) { renameModal.value.error = '文件扩展名必须为 .drawio'; return }
  const dir = parentDir(item.path)
  const finalName = await ensureUniqueInDir(dir, name)
  const target = `${dir}/${finalName}`
  try {
    const resp = await fetch(item.publicPath)
    const blob = await resp.blob()
    await fileManagerService.uploadFile(target, blob)
    await fileManagerService.deleteFile(item.path)
    await panelRef.value?.refreshTree()
    closeRename()
  } catch (e) {
    renameModal.value.error = '重命名失败，请稍后重试'
  }
}

/**
 * 生成相对资源路径（用于组件 src）
 */
function toRelativeResourcePath(absPath: string): string {
  const clean = absPath.replace(/\\+/g, '/').replace(/\/+/, '/')
  return clean.startsWith('public/') ? clean.slice('public/'.length) : clean
}

/**
 * 复制到剪贴板并提示
 */
async function copyText(text: string, successMsg: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMsg)
  } catch {
    toast.error('复制失败，请手动选择复制')
  }
}

/**
 * 构造 DrawioChart 用法并复制（卡片内）
 */
function copyChartUsage(item: Item): void {
  const rel = toRelativeResourcePath(item.path)
  const code = [
    `<!-- 需要先导入：import DrawioChart from '@/components/layout/contentcommon/DrawioChart.vue' -->`,
    `<DrawioChart src="${rel}" width="500px" height="400px" />`
  ].join('\n')
  copyText(code, '已复制<DrawioChart>组件标签，记得引入组件')
}

/**
 * 构造 DrawioChart 用法并复制（预览弹窗）
 */
function copyChartUsageModal(item: Item): void {
  const rel = toRelativeResourcePath(item.path)
  const code = [
    `<!-- 需要先导入：import DrawioChart from '@/components/layout/contentcommon/DrawioChart.vue' -->`,
    `<DrawioChart src="${rel}" width="500px" height="400px" />`
  ].join('\n')
  copyText(code, '已复制<DrawioChart>组件标签，记得引入组件')
}
</script>

<style scoped>
/* 无额外样式 */
</style>