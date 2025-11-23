<!--
  文件用途：本地图标资源面板（图标文件与注册管理）
  主要功能：
  - 使用 ResourceManagerPanel 管理 public/img/icon 目录及文件
  - 读取/写入 public/config/icons.config.yaml，检查文件注册与注册条目文件存在
  - 支持静态图标的新增（文件上传并注册）、删除（文件+注册）、改名（图标名或文件名）
  技术栈：Vue@3 + TypeScript@5 + Tailwind CSS@3
-->

<template>
  <div class="flex flex-col space-y-3 h-full">
    <div class="flex items-center justify-between">
      <div class="px-2 py-1 rounded bg-gray-100 text-[14px] text-gray-700">文件目录：public/img/icon</div>
      <div class="flex items-center gap-2">
        <div class="text-[12px] text-gray-500">图标总数 {{ icons.length }} / 文件缺失 {{ registeredOnly.length }}</div>
        <input ref="uploadInput" type="file" accept="image/*" @change="onSelectUpload" class="hidden" />
        <input v-model="searchQuery" type="text" placeholder="搜索（文件名/注册名）"
          class="px-2 py-1 h-7 text-[12px] border border-gray-300 rounded bg-white text-gray-700" />
        <button @click="registerAllUnregistered"
          class="px-2 py-1 text-[12px] bg-blue-600 text-white hover:bg-blue-700 rounded">全部注册</button>
        <button @click="triggerUpload"
          class="px-2 py-1 text-[12px] bg-blue-600 text-white hover:bg-blue-700 rounded">上传图标</button>
      </div>
    </div>

    <div v-if="loading" class="text-center text-gray-500 py-8">加载中...</div>
    <div v-else class="flex-1 h-[calc(100%-30px)] overflow-auto">
      <div v-if="icons.length === 0" class="text-center text-gray-500 py-8">暂无图标文件</div>
      <div v-else class="grid grid-cols-5 gap-3 ">
        <div v-for="item in filteredIcons" :key="item.path"
          class="w-full bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          <div class="relative  w-full h-14 bg-gray-50 flex items-center justify-center">
            <img :src="item.publicPath" :alt="item.name" class="p-2 w-full  h-14 object-contain" />
          </div>
          <div class="px-2 py-2 space-y-1">
            <div class="text-[12px]  text-gray-900 w-full flex items-center justify-between gap-1">
              <span class="truncate">{{ nameBySrc(fileSrc(item.name)) || '-' }}</span>
              <span class="px-1 py-0.5 w-12 text-center rounded text-[10px] border"
                :class="isRegisteredFile(item.name) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'">
                {{ isRegisteredFile(item.name) ? '已注册' : '未注册' }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-1">
                <button v-if="!isRegisteredFile(item.name)" @click="registerFile(item)"
                  class="h-5 text-[12px] rounded border border-blue-200 text-blue-600 hover:bg-blue-50" title="注册">
                  <Plus :size="14" />
                </button>
                <button v-if="isRegisteredFile(item.name)" @click="copyIconName(nameBySrc(fileSrc(item.name)) || '')"
                  class="h-5 text-[12px] rounded border border-gray-200 text-gray-700 hover:bg-gray-100" title="复制名称">
                  <Copy :size="14" />
                </button>
                <button v-if="isRegisteredFile(item.name)" @click="copyIconUsage(nameBySrc(fileSrc(item.name)) || '')"
                  class="h-5 text-[12px] rounded border border-gray-200 text-gray-700 hover:bg-gray-100" title="复制用法">
                  <Files :size="14" />
                </button>
                <button @click="openEditModal(item)"
                  class="h-5 text-[12px] rounded border border-gray-200 text-gray-700 hover:bg-gray-100" title="编辑">
                  <Pencil :size="14" />
                </button>
                <button @click="deleteIconFile(item)"
                  class="h-5 text-[12px] rounded border border-red-200 text-red-600 hover:bg-red-50" title="删除">
                  <Trash2 :size="14" />
                </button>

              </div>
              <div class="px-1 text-[10px] w-full truncate text-end text-gray-500">{{ item.name }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="registeredOnly.length > 0" class="mt-4">
        <div class="px-2 py-1 rounded bg-yellow-50 text-[12px] text-yellow-700 border border-yellow-200">已注册但缺少文件</div>
        <div class="grid grid-cols-4 gap-3 mt-2">
          <div v-for="r in filteredRegisteredOnly" :key="r.fileName"
            class="w-full bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
            <div class="relative w-full h-16 bg-gray-50 flex items-center justify-center">
              <span class="text-[12px] text-gray-400">缺少文件：{{ r.fileName }}</span>
            </div>
            <div class="px-2 py-2 space-y-1">
              <div class="text-[12px] text-gray-700 w-full flex items-center justify-between gap-1">
                <span class="truncate">{{ r.name }}</span>
                <span
                  class="px-1 py-0.5 text-[10px] rounded bg-amber-50 text-amber-700 border border-amber-200">文件缺失</span>
              </div>
              <div class="flex items-center gap-1">
                <button @click="uploadMissing(r.fileName)"
                  class="h-5 text-[12px] rounded border border-blue-200 text-blue-600 hover:bg-blue-50" title="上传文件">
                  <Plus :size="16" />
                </button>
                <button @click="deleteRegisteredEntry(r.fileName)"
                  class="h-5 text-[12px] rounded border border-red-200 text-red-600 hover:bg-red-50" title="删除注册">
                  <Trash2 :size="16" />
                </button>
                <button @click="openEditModalByName(r.fileName)"
                  class="h-5 text-[12px] rounded border border-gray-200 text-gray-700 hover:bg-gray-100" title="改名">
                  <Pencil :size="16" />
                </button>
                <button @click="copyIconName(r.name)"
                  class="h-5 text-[12px] rounded border border-gray-200 text-gray-700 hover:bg-gray-100" title="复制名称">
                  <Copy :size="16" />
                </button>
                <button @click="copyIconUsage(r.name)"
                  class="h-5 text-[12px] rounded border border-gray-200 text-gray-700 hover:bg-gray-100" title="复制用法">
                  <Files :size="16" />
                </button>
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
      cancel-text="取消"
      ok-text="确定"
      @ok="confirmOk"
      @cancel="confirmCancel"
    />
  </div>

  <!-- 编辑弹窗：注册名 + 文件名 -->
  <EditorModal
    v-model:visible="renameModal.visible"
    title="编辑图标"
    :widthVw="40"
    :zIndex="500"
    ok-text="保存"
    cancel-text="取消"
    @cancel="closeEditModal"
    @ok="confirmEditModal"
  >
    <div class="space-y-3">
      <div>
        <label class="block text-[12px] font-medium text-gray-700 mb-1">注册名</label>
        <input v-model="renameModal.regNameInput" :disabled="!renameModal.isRegistered" type="text"
          placeholder="例如：logo"
          class="w-full px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <div v-if="renameModal.errorReg" class="mt-1 text-[11px] text-red-600">{{ renameModal.errorReg }}</div>
      </div>
      <div>
        <label class="block text-[12px] font-medium text-gray-700 mb-1">文件名</label>
        <input v-model="renameModal.fileNameInput" type="text" placeholder="例如：logo.svg"
          class="w-full px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <div v-if="renameModal.errorFile" class="mt-1 text-[11px] text-red-600">{{ renameModal.errorFile }}</div>
      </div>
    </div>
  </EditorModal>
</template>

<script setup lang="ts">
/**
 * IconResourcePanel.vue
 * 文档用途：管理本地 public/img/icon 目录下的图标文件与注册信息
 */
import { ref, onMounted, computed } from 'vue'
import { parse, stringify } from 'yaml'
import { fileManagerService } from '@/core/services/FileManagerService'
import { useToast } from '@/core/composables/useToast'
import { Plus, Pencil, Trash2, X, Copy, Files } from 'lucide-vue-next'
import { resolveResourcePath } from '@/core/utils/path'
import EditorModal from '@/components/editor/EditorModal.vue'
import ConfirmModal from '@/components/editor/ConfirmModal.vue'

interface StaticIconItem { name: string; src: string }
interface IconsConfigFile {
  static_icons: StaticIconItem[]
  lucide_icons: string[]
  config: { default_size: number; default_stroke_width: number; fallback_behavior: string; placeholder_text: string }
}

type IconFileItem = { name: string; path: string; publicPath: string }

const { showToast } = useToast()
const iconsConfig = ref<IconsConfigFile>({ static_icons: [], lucide_icons: [], config: { default_size: 20, default_stroke_width: 2, fallback_behavior: 'hide', placeholder_text: '?' } })
const filesSet = ref<Set<string>>(new Set())
const icons = ref<IconFileItem[]>([])
const loading = ref<boolean>(false)
const uploadInput = ref<HTMLInputElement | null>(null)
const searchQuery = ref<string>('')

const renameModal = ref<{ visible: boolean; item: IconFileItem | null; fileNameInput: string; regNameInput: string; isRegistered: boolean; errorFile: string; errorReg: string }>({ visible: false, item: null, fileNameInput: '', regNameInput: '', isRegistered: false, errorFile: '', errorReg: '' })
const registeredOnly = ref<{ fileName: string; name: string }[]>([])
const confirm = ref<{ visible: boolean; title: string; message: string; onOk?: () => void; onCancel?: () => void }>({ visible: false, title: '确认操作', message: '' })

function buildPublicUrl(rel: string): string { return resolveResourcePath(rel) }
function isAllowed(name: string): boolean { return /\.(png|jpe?g|svg|webp|gif)$/i.test(name) }
function fileSrc(filename: string): string { return `/img/icon/${filename}` }
function nameBySrc(src: string): string | undefined { return iconsConfig.value.static_icons.find(i => i.src === src)?.name }
function isRegisteredFile(filename: string): boolean { return !!nameBySrc(fileSrc(filename)) }
function ensureUniqueIconName(base: string): string {
  const existing = new Set(iconsConfig.value.static_icons.map(i => i.name))
  let name = base
  if (!existing.has(name)) return name
  let idx = 1
  while (existing.has(`${name}-${idx}`)) idx++
  return `${name}-${idx}`
}
function ensureUniqueFileName(name: string): string {
  const set = new Set(icons.value.map(i => i.name))
  if (!set.has(name)) return name
  const dot = name.lastIndexOf('.')
  const base = dot >= 0 ? name.slice(0, dot) : name
  const ext = dot >= 0 ? name.slice(dot) : ''
  let idx = 1
  let candidate = ''
  do { candidate = `${base}-${idx}${ext}`; idx++ } while (set.has(candidate))
  return candidate
}
async function loadState(): Promise<void> {
  loading.value = true
  try {
    const content = await fileManagerService.readFile('public/config/icons.config.yaml')
    const cfg = parse(content) as any
    const normalized: IconsConfigFile = {
      lucide_icons: Array.isArray(cfg?.lucide_icons) ? cfg.lucide_icons.filter((x: any) => typeof x === 'string') : [],
      static_icons: Array.isArray(cfg?.static_icons)
        ? cfg.static_icons.filter((x: any) => x && typeof x.name === 'string' && typeof x.src === 'string').map((x: any) => ({ name: x.name, src: x.src }))
        : [],
      config: {
        default_size: cfg?.config?.default_size ?? 20,
        default_stroke_width: cfg?.config?.default_stroke_width ?? 2,
        fallback_behavior: cfg?.config?.fallback_behavior ?? 'hide',
        placeholder_text: cfg?.config?.placeholder_text ?? '?'
      }
    }
    iconsConfig.value = normalized
  } catch { }
  try {
    const files = await fileManagerService.listFiles('public/img/icon')
    const list = (files || []).filter(f => !f.isDirectory && isAllowed(f.name))
    icons.value = list.map(f => ({ name: f.name, path: f.path, publicPath: buildPublicUrl(`img/icon/${f.name}`) }))
    filesSet.value = new Set(list.map(f => f.name))
  } catch { icons.value = []; filesSet.value = new Set() }
  rebuildRegisteredOnly()
  loading.value = false
}
/**
 * 计算属性：搜索过滤后的文件与注册缺失列表
 */
const filteredIcons = computed(() => {
  const q = (searchQuery.value || '').trim().toLowerCase()
  if (!q) return icons.value
  return icons.value.filter(it => {
    const file = it.name.toLowerCase()
    const reg = (nameBySrc(fileSrc(it.name)) || '').toLowerCase()
    return file.includes(q) || (!!reg && reg.includes(q))
  })
})
const filteredRegisteredOnly = computed(() => {
  const q = (searchQuery.value || '').trim().toLowerCase()
  if (!q) return registeredOnly.value
  return registeredOnly.value.filter(r => r.fileName.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))
})
async function saveYaml(): Promise<void> {
  const content = stringify({ lucide_icons: iconsConfig.value.lucide_icons, static_icons: iconsConfig.value.static_icons, config: iconsConfig.value.config })
  await fileManagerService.writeFile('public/config/icons.config.yaml', content)
}
function triggerUpload(): void { if (uploadInput.value) uploadInput.value.click() }
function onSelectUpload(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  void uploadFile(file)
  input.value = ''
}
async function uploadFile(file: File | Blob & { name?: string }): Promise<void> {
  const origName = (file as File).name || 'icon'
  if (!isAllowed(origName)) { showToast({ type: 'info', message: '仅支持图片文件' }); return }
  const finalName = ensureUniqueFileName(origName)
  try {
    await fileManagerService.uploadFile(`public/img/icon/${finalName}`, file as any)
    // 上传成功后自动注册为静态图标
    const base = finalName.replace(/\.[^.]+$/, '')
    const name = ensureUniqueIconName(base)
    const src = fileSrc(finalName)
    iconsConfig.value.static_icons.push({ name, src })
    await saveYaml()
    await loadState()
    showToast({ type: 'success', message: '上传并注册成功' })
  } catch { }
}
/**
 * 批量注册未注册的图标文件
 */
async function registerAllUnregistered(): Promise<void> {
  const pending = icons.value.filter(it => !isRegisteredFile(it.name))
  if (pending.length === 0) { showToast({ type: 'info', message: '没有未注册的文件' }); return }
  for (const it of pending) {
    const base = it.name.replace(/\.[^.]+$/, '')
    const name = ensureUniqueIconName(base)
    const src = fileSrc(it.name)
    iconsConfig.value.static_icons.push({ name, src })
  }
  await saveYaml()
  await loadState()
  showToast({ type: 'success', message: `已注册 ${pending.length} 个图标` })
}
async function deleteIconFile(item: { name: string; path: string }): Promise<void> {
  openConfirm({
    title: '删除图标',
    message: `确定删除 ${item.name} 吗？`,
    onOk: async () => {
      try {
        await fileManagerService.deleteFile(item.path)
        const src = fileSrc(item.name)
        const before = iconsConfig.value.static_icons.length
        iconsConfig.value.static_icons = iconsConfig.value.static_icons.filter(i => i.src !== src)
        if (iconsConfig.value.static_icons.length !== before) await saveYaml()
        await loadState()
      } catch { }
    }
  })
}
async function registerFile(item: { name: string }): Promise<void> {
  const base = item.name.replace(/\.[^.]+$/, '')
  const name = ensureUniqueIconName(base)
  const src = fileSrc(item.name)
  iconsConfig.value.static_icons.push({ name, src })
  await saveYaml()
  showToast({ type: 'success', message: `已注册：${name}` })
  await loadState()
}
function rebuildRegisteredOnly(): void {
  const present = new Set(filesSet.value)
  const arr: { fileName: string; name: string }[] = []
  for (const entry of iconsConfig.value.static_icons) {
    const fileName = (entry.src.split('/').pop() || '').trim()
    if (fileName && !present.has(fileName)) arr.push({ fileName, name: entry.name })
  }
  registeredOnly.value = arr
}
async function uploadMissing(targetFileName: string): Promise<void> {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    if (!isAllowed(file.name)) { showToast({ type: 'info', message: '仅支持图片文件' }); return }
    try {
      await fileManagerService.uploadFile(`public/img/icon/${targetFileName}`, file)
      await loadState()
    } catch { }
  }
  input.click()
}
async function deleteRegisteredEntry(fileName: string): Promise<void> {
  const src = fileSrc(fileName)
  const before = iconsConfig.value.static_icons.length
  iconsConfig.value.static_icons = iconsConfig.value.static_icons.filter(i => i.src !== src)
  if (iconsConfig.value.static_icons.length !== before) await saveYaml()
  await loadState()
}
/**
 * 复制图标名称到剪贴板
 */
async function copyIconName(name: string): Promise<void> {
  const n = (name || '').trim()
  if (!n) { showToast({ type: 'info', message: '无可复制名称' }); return }
  try { await navigator.clipboard.writeText(n); showToast({ type: 'success', message: '已复制名称' }) } catch { showToast({ type: 'info', message: '复制失败' }) }
}
/**
 * 复制组件用法到剪贴板
 */
async function copyIconUsage(name: string): Promise<void> {
  const n = (name || '').trim()
  if (!n) { showToast({ type: 'info', message: '无可复制用法' }); return }
  const snippet = `<Icon name="${n}"  color="primary" />`
  try { await navigator.clipboard.writeText(snippet); showToast({ type: 'success', message: '已复制<Icon>标签，记得引入组件' }) } catch { showToast({ type: 'info', message: '复制失败' }) }
}
function openEditModal(item: IconFileItem): void {
  const reg = nameBySrc(fileSrc(item.name))
  renameModal.value.visible = true
  renameModal.value.item = item
  renameModal.value.fileNameInput = item.name
  renameModal.value.regNameInput = reg || ''
  renameModal.value.isRegistered = !!reg
  renameModal.value.errorFile = ''
  renameModal.value.errorReg = ''
}
function openEditModalByName(fileName: string): void {
  const pseudo: IconFileItem = { name: fileName, path: '', publicPath: buildPublicUrl(`img/icon/${fileName}`) }
  const reg = nameBySrc(fileSrc(fileName))
  renameModal.value.visible = true
  renameModal.value.item = pseudo
  renameModal.value.fileNameInput = fileName
  renameModal.value.regNameInput = reg || ''
  renameModal.value.isRegistered = !!reg
  renameModal.value.errorFile = ''
  renameModal.value.errorReg = ''
}
function closeEditModal(): void { renameModal.value.visible = false }
async function confirmEditModal(): Promise<void> {
  const modal = renameModal.value
  if (!modal.item) { closeEditModal(); return }
  const item = modal.item
  const newFile = (modal.fileNameInput || '').trim()
  const oldFile = item.name
  const fileChanged = newFile && newFile !== oldFile
  const regChanged = modal.isRegistered && (modal.regNameInput || '').trim() !== (nameBySrc(fileSrc(oldFile)) || '')

  modal.errorFile = ''
  modal.errorReg = ''

  if (fileChanged && !/\.(png|jpe?g|svg|webp|gif)$/i.test(newFile)) { modal.errorFile = '文件扩展名不合法'; return }
  if (modal.isRegistered && !(modal.regNameInput || '').trim()) { modal.errorReg = '注册名不能为空'; return }

  try {
    const hasFile = filesSet.value.has(oldFile)
    if (fileChanged) {
      if (hasFile) {
        const res = await fetch(item.publicPath)
        const blob = await res.blob()
        await fileManagerService.uploadFile(`public/img/icon/${newFile}`, blob)
        if (item.path) await fileManagerService.deleteFile(item.path)
      }
    }

    if (modal.isRegistered) {
      const oldSrc = fileSrc(oldFile)
      const entry = iconsConfig.value.static_icons.find(i => i.src === oldSrc)
      if (entry) {
        const desired = (modal.regNameInput || '').trim()
        const exists = new Set(iconsConfig.value.static_icons.map(i => i.name))
        entry.name = exists.has(desired) && desired !== entry.name ? ensureUniqueIconName(desired) : desired
        if (fileChanged) entry.src = fileSrc(newFile)
      }
    }

    if (modal.isRegistered) await saveYaml()
    showToast({ type: 'success', message: '已保存编辑' })
  } catch (err: any) {
    showToast({ type: 'info', message: `保存失败：${err?.message || ''}` })
  }

  closeEditModal()
  await loadState()
}
onMounted(loadState)

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