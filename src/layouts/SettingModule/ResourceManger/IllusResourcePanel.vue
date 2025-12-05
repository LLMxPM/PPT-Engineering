<!--
  文件用途：插图资源面板（引用通用资源管理组件）
  主要功能：使用 FileManagerPanel 管理 public/img/illus 下的图片目录及文件
  技术栈：Vue@3 + TypeScript@5 + Tailwind CSS@3
-->

<template>
  <FileManagerPanel
    ref="panelRef"
    root="public/img/illus"
    accept="image/*"
  >
    <template #item="{ item, deleteItem }">
      <div class="w-full h-36 bg-gray-50 flex items-center justify-center">
        <img :src="item.publicPath" :alt="item.name" class="max-w-full max-h-full" />
      </div>
      <div class="px-3 py-2 text-[12px] text-gray-700 truncate">{{ item.name }}</div>
      <div class="flex flex-wrap gap-2 px-3 pb-3">
        <button @click="openPreview(item)" title="预览" aria-label="预览" class="px-2 py-1 text-[12px] bg-gray-100 hover:bg-gray-200 rounded inline-flex items-center gap-1">
          <AppIcon name="Eye" size="16" />
        </button>
        <button @click="openRename(item)" title="重命名" aria-label="重命名" class="px-2 py-1 text-[12px] bg-gray-100 hover:bg-gray-200 rounded inline-flex items-center gap-1">
          <AppIcon name="Edit" size="16" />
        </button>
        <button @click="copyImgTag(item)" title="复制<img>标签" aria-label="复制<img>标签" class="px-2 py-1 text-[12px] bg-gray-100 hover:bg-gray-200 rounded inline-flex items-center gap-1">
          <AppIcon name="ClipboardList" size="16" />
        </button>
        <button @click="deleteItem(item)" title="删除" aria-label="删除" class="px-2 py-1 text-[12px] bg-red-500 text-white hover:bg-red-600 rounded inline-flex items-center gap-1">
          <AppIcon name="Trash" size="16" />
        </button>
        
      </div>
    </template>
  </FileManagerPanel>

  <!-- 预览弹窗：展示大图与复制引用代码 -->
  <EditorModal
    v-model:visible="previewModal.visible"
    :title="`预览：${previewModal.item?.name || ''}`"
    :widthVw="95"
    :heightVh="95"
    :zIndex="500"
    :showFooter="false"
    @cancel="closePreview"
  >
    <div class="p-2 space-y-4">
      <div class="w-full h-[calc(100vh-220px)] bg-gray-50 flex items-center justify-center">
        <img :src="previewModal.item?.publicPath" :alt="previewModal.item?.name" class="max-w-full max-h-full" />
      </div>
      <div class="space-y-2">
        <div class="text-[12px] text-gray-700">图片路径：<span class="break-all">{{ previewModal.item ? toRelativeResourcePath(previewModal.item.path) : '' }}</span></div>
        <div class="flex flex-wrap gap-3 items-center">
          <button @click="copyImgTagModal(previewModal.item!)" class="px-2 h-8 text-[12px] bg-blue-600 text-white hover:bg-blue-700 rounded" title="复制 <img> 标签" aria-label="复制 <img> 标签">复制 &lt;img&gt; 标签</button>
          <button @click="copyResolvedPathModal(previewModal.item!)" class="px-2 h-8 text-[12px] bg-blue-600 text-white hover:bg-blue-700 rounded" title="复制路径(函数处理)" aria-label="复制路径(函数处理)">复制路径(函数处理)</button>
          <button @click="copyPublicUrlWithBase(previewModal.item!)" class="px-2 h-8 text-[12px] bg-blue-600 text-white hover:bg-blue-700 rounded" title="复制路径（含 BASE_URL）" aria-label="复制路径（含 BASE_URL）">复制路径（含 BASE_URL）</button>
          <button @click="copyPublicUrlNoBase(previewModal.item!)" class="px-2 h-8 text-[12px] bg-blue-600 text-white hover:bg-blue-700 rounded" title="复制路径（不含 BASE_URL）" aria-label="复制路径（不含 BASE_URL）">复制路径（不含 BASE_URL）</button>
        </div>
      </div>
    </div>
  </EditorModal>

  <!-- 重命名弹窗：编辑文件名并提交 -->
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
        <input id="newName" v-model="renameModal.newName" type="text" placeholder="例如：banner.png"
               class="w-full px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <div v-if="renameModal.error" class="mt-1 text-[11px] text-red-600">{{ renameModal.error }}</div>
      </div>
    </div>
  </EditorModal>
</template>

<script setup lang="ts">
/**
 * 文件用途：插图资源面板（通过通用资源面板管理 public/img/illus 下的图片）
 * 主要功能：弹窗预览、文件重命名、复制图片引用代码（含 resolveResourcePath 提示）
 * 技术栈：Vue@3 + TypeScript@5 + Tailwind CSS@3
 */
import { ref } from 'vue'
import FileManagerPanel from '@/layouts/SettingModule/ResourceManger/FileManagerPanel.vue'
import { fileManagerService } from '@/core/services/FileManagerService'
import { resolveResourcePath } from '@/core/utils/path'
import AppIcon from '@/components/common/AppIcon.vue'
import { toast } from '@/core/composables/useToast'
import EditorModal from '@/components/editor/EditorModal.vue'

type Item = { name: string; path: string; publicPath: string }

const panelRef = ref<{ refreshTree: () => Promise<void>; loadItems: () => Promise<void> } | null>(null)

/**
 * 预览弹窗状态
 */
const previewModal = ref<{ visible: boolean; item: Item | null }>({ visible: false, item: null })
// Toast 提示由全局容器显示，无需本地提示状态

/**
 * 重命名弹窗状态
 */
const renameModal = ref<{ visible: boolean; item: Item | null; newName: string; error: string }>({ visible: false, item: null, newName: '', error: '' })

/**
 * 打开预览弹窗
 */
function openPreview(item: Item): void { previewModal.value = { visible: true, item } }

/**
 * 关闭预览弹窗
 */
function closePreview(): void { previewModal.value.visible = false }

/**
 * 打开重命名弹窗
 */
function openRename(item: Item): void {
  renameModal.value = { visible: true, item, newName: item.name, error: '' }
}

/**
 * 关闭重命名弹窗
 */
function closeRename(): void { renameModal.value.visible = false }

/**
 * 计算父目录路径
 */
function parentDir(path: string): string {
  const idx = path.lastIndexOf('/')
  return idx <= 0 ? path : path.slice(0, idx)
}

/**
 * 获取文件扩展名（含点）
 */
function extname(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx) : ''
}

/**
 * 允许的图片扩展名校验
 */
function isAllowedImageName(name: string): boolean {
  const lower = name.toLowerCase()
  const exts = ['png','jpg','jpeg','svg','webp','gif']
  return exts.some(ext => lower.endsWith('.' + ext))
}

/**
 * 在目录内确保文件名唯一：若冲突，追加 -1、-2...
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
  // 若未填扩展名，沿用原扩展名
  if (!name.includes('.')) name = `${name}${extname(item.name)}`
  if (!isAllowedImageName(name)) { renameModal.value.error = '文件扩展名必须为图片类型（png/jpg/jpeg/svg/webp/gif）'; return }
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
 * 由绝对路径生成相对资源路径（用于 resolveResourcePath）
 */
function toRelativeResourcePath(absPath: string): string {
  const clean = absPath.replace(/\\+/g, '/').replace(/\/+/, '/')
  return clean.startsWith('public/') ? clean.slice('public/'.length) : clean
}

/**
 * 复制到剪贴板（附提示）
 */
async function copyText(text: string, hintFor: 'img' | 'expr' | 'url-with-base' | 'url-no-base'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    const msg = hintFor === 'img'
      ? '已复制 <img> 标签'
      : hintFor === 'expr'
        ? '已复制 resolveResourcePath 表达式'
        : hintFor === 'url-with-base'
          ? '已复制公共路径（含 BASE_URL）'
          : '已复制公共路径（不含 BASE_URL）'
    toast.success(msg)
  } catch {
    toast.error('复制失败，请手动选择复制')
  }
}

/**
 * 非预览卡片上的复制提示状态
 */
// 卡片内复制引导通过 toast 提示

/**
 * 复制文本（卡片内使用），并显示“已复制引用代码”提示
 */
async function copyTextInline(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('已复制<img>标签')
  } catch {
    toast.error('复制失败，请手动选择复制')
  }
}

/**
 * 构造 <img> 标签代码并复制（包含导入提示注释）
 */
function copyImgTag(item: Item): void {
  const rel = toRelativeResourcePath(item.path)
  const code = [
    `<!-- 需要先导入：import { resolveResourcePath } from '@/core/utils/path' -->`,
    `<img :src=\"resolveResourcePath('${rel}')\" alt=\"${item.name}\" />`
  ].join('\n')
  copyTextInline(code)
}

/**
 * 复制 resolveResourcePath 表达式
 */
function copyResolvedPath(item: Item): void {
  const rel = toRelativeResourcePath(item.path)
  copyText(`resolveResourcePath('${rel}')`, 'expr')
}

/**
 * 复制公共 URL
 */
function copyPublicUrlWithBase(item: Item): void { copyText(item.publicPath, 'url-with-base') }

function copyPublicUrlNoBase(item: Item): void {
  const rel = toRelativeResourcePath(item.path)
  const noBase = `/${rel}`
  copyText(noBase, 'url-no-base')
}

/**
 * 在预览弹窗中复制 <img> 标签
 */
function copyImgTagModal(item: Item): void {
  const rel = toRelativeResourcePath(item.path)
  const code = [
    `<!-- 需要先导入：import { resolveResourcePath } from '@/core/utils/path' -->`,
    `<img :src=\"resolveResourcePath('${rel}')\" alt=\"${item.name}\" />`
  ].join('\n')
  copyText(code, 'img')
}

/**
 * 在预览弹窗中复制 resolveResourcePath 表达式
 */
function copyResolvedPathModal(item: Item): void {
  const rel = toRelativeResourcePath(item.path)
  copyText(`resolveResourcePath('${rel}')`, 'expr')
}
</script>

<style scoped>
/* 无额外样式 */
</style>