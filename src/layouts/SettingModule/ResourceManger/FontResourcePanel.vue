<!--
  文件用途：字体资源面板（管理 public/fonts 下的字体）
  主要功能：列出 woff2 字体、预览、删除、注册状态检查
  技术栈：Vue@3 + TypeScript@5 + Tailwind CSS@3
-->

<template>
  <div class="flex flex-col space-y-3 h-full">
    <div class="flex items-center justify-between">
      <div class="px-2 py-1 rounded bg-gray-100 text-[14px] text-gray-700">文件目录：public/fonts</div>
      <div class="flex items-center gap-2">
        <div class="text-[12px] text-gray-500">字体总数 {{ fonts.length }} / 文件缺失 {{ registeredOnly.length }}</div>
        <input ref="uploadInput" type="file" accept=".woff2" @change="onSelectUpload" class="hidden" />
        <button @click="triggerUpload" class="px-2 py-1 w-24 text-[12px] bg-blue-600 text-white hover:bg-blue-700 rounded">上传WOFF2</button>
      </div>
    </div>
    <div v-if="fontLoading" class="text-center text-gray-500 py-8">加载中...</div>
    <div v-else class="flex-1 min-h-0 overflow-auto">
      <div v-if="fonts.length === 0" class="text-center text-gray-500 py-8">暂无字体文件</div>
      <div v-else class="grid grid-cols-2 gap-3">
        <div v-for="f in fonts" :key="f.path" class="border border-gray-200 rounded-md p-3 bg-white">
          <div class="flex items-center justify-between mb-2">
            <div class="text-[12px] text-gray-700">{{ previewFamilyForFile(f.name) }} - {{ f.name }}</div>
            <span class="text-[11px]" :class="isFontRegisteredForFile(f.name) ? 'text-green-600' : 'text-gray-400'">
              {{ isFontRegisteredForFile(f.name) ? '已注册' : '未注册' }}
            </span>
          </div>
          <div class="border border-gray-100 rounded p-3 text-[14px]" :style="{ fontFamily: previewFamilyForFile(f.name) }">
            常用文字预览：天地玄黄 宇宙洪荒；The quick brown fox jumps over the lazy dog 0123456789
          </div>
          <div class="flex gap-2 mt-2">
            <button @click="deleteFont(f)" class="px-2 py-1 text-[12px] bg-red-500 text-white hover:bg-red-600 rounded">删除</button>
            <a :href="f.publicPath" target="_blank" rel="noopener" class="px-2 py-1 text-[12px] bg-gray-100 hover:bg-gray-200 rounded">下载</a>
            <button @click="openRename(f)" class="px-2 py-1 text-[12px] bg-gray-100 hover:bg-gray-200 rounded">{{ isFontRegisteredForFile(f.name) ? '改名' : '注册' }}</button>
          </div>
          <div v-if="renameState && renameState.fileName === f.name" class="mt-2 flex items-center gap-2">
            <input v-model="renameState.newFamily" class="border rounded px-2 py-1 text-[12px] flex-1" placeholder="输入新的字体名称（family）" />
            <button @click="confirmRename()" class="px-2 py-1 text-[12px] bg-green-600 text-white hover:bg-green-700 rounded">保存</button>
            <button @click="cancelRename()" class="px-2 py-1 text-[12px] bg-gray-300 hover:bg-gray-400 rounded">取消</button>
          </div>
        </div>
      </div>
      <div v-if="registeredOnly.length > 0" class="mt-4">
        <div class="px-2 py-1 rounded bg-yellow-50 text-[12px] text-yellow-700 border border-yellow-200">已注册但缺少文件</div>
        <div class="grid grid-cols-2 gap-3 mt-2">
          <div v-for="r in registeredOnly" :key="r.fileName" class="border border-gray-200 rounded-md p-3 bg-white">
            <div class="flex items-center justify-between mb-2">
              <div class="text-[12px] text-gray-700">{{ r.family }} - {{ r.fileName }}</div>
              <span class="text-[11px] text-amber-600">文件缺失</span>
            </div>
            <div class="border border-gray-100 rounded p-3 text-[14px]" :style="{ fontFamily: r.family }">
              常用文字预览：天地玄黄 宇宙洪荒；The quick brown fox jumps over the lazy dog 0123456789
            </div>
            <div class="flex gap-2 mt-2">
              <button @click="uploadMissing(r.fileName)" class="px-2 py-1 text-[12px] bg-blue-600 text-white hover:bg-blue-700 rounded">上传文件</button>
              <button @click="deleteRegisteredEntry(r.fileName)" class="px-2 py-1 text-[12px] bg-red-500 text-white hover:bg-red-600 rounded">删除注册</button>
              <button @click="openRenameByName(r.fileName)" class="px-2 py-1 text-[12px] bg-gray-100 hover:bg-gray-200 rounded">改名</button>
            </div>
            <div v-if="renameState && renameState.fileName === r.fileName" class="mt-2 flex items-center gap-2">
              <input v-model="renameState.newFamily" class="border rounded px-2 py-1 text-[12px] flex-1" placeholder="输入新的字体名称（family）" />
              <button @click="confirmRename()" class="px-2 py-1 text-[12px] bg-green-600 text-white hover:bg-green-700 rounded">保存</button>
              <button @click="cancelRename()" class="px-2 py-1 text-[12px] bg-gray-300 hover:bg-gray-400 rounded">取消</button>
            </div>
          </div>
        </div>
      </div>
    </div>
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
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { fileManagerService } from '@/core/services/FileManagerService'
import ConfirmModal from '@/components/editor/ConfirmModal.vue'

/**
 * 是否为 woff2 字体文件
 */
function isWoff2(name: string): boolean { return /(\.woff2)$/i.test(name) }

/**
 * 构建相对资源的公共访问 URL
 */
function buildPublicUrl(rel: string): string { const base = (import.meta.env.BASE_URL || '/'); return `${base.replace(/\/$/, '')}/${rel.replace(/^\//, '')}` }

const fonts = ref<{ name: string; path: string; publicPath: string }[]>([])
const registeredFamilies = ref<Set<string>>(new Set())
const registrationBySrc = ref<Map<string, string>>(new Map())
const fontLoading = ref<boolean>(false)
const fontFaceCss = ref<string>('')
let assetFontStyleEl: HTMLStyleElement | null = null
const uploadInput = ref<HTMLInputElement | null>(null)
const selectedUpload = ref<File | null>(null)
const renameState = ref<{ fileName: string; newFamily: string } | null>(null)
const registeredOnly = ref<{ fileName: string; family: string }[]>([])
const confirm = ref<{ visible: boolean; title: string; message: string; onOk?: () => void; onCancel?: () => void }>({ visible: false, title: '确认操作', message: '' })

/**
 * 触发文件选择并直接上传
 */
function triggerUpload(): void {
  if (uploadInput.value) uploadInput.value.click()
}

/**
 * 生成字体预览所需的 @font-face CSS 字符串
 */
function updateFontFaceCss(): void {
  const rules = fonts.value.map(f => {
    const family = previewFamilyForFile(f.name)
    return `@font-face{font-family:'${family}';src:url('${f.publicPath}') format('woff2');font-weight:400;font-style:normal;font-display:swap;}`
  })
  fontFaceCss.value = rules.join('\n')
}

/**
 * 预览所用的字体 family 名称（去除后缀）
 */
function previewFamilyForFile(fileName: string): string {
  const reg = registrationBySrc.value.get(fileName)
  if (reg) return reg
  const dot = fileName.lastIndexOf('.')
  return dot >= 0 ? fileName.slice(0, dot) : fileName
}

/**
 * 加载字体文件并更新预览 CSS 与注册集
 */
async function loadFonts(): Promise<void> {
  fontLoading.value = true
  try {
    const files: any[] = await fileManagerService.listFiles('public/fonts')
    fonts.value = (files || []).filter(f => !f.isDirectory && isWoff2(f.name)).map(f => ({
      name: f.name,
      path: f.path,
      publicPath: buildPublicUrl(`/fonts/${f.name}`)
    }))
    updateFontFaceCss()
    await loadRegisteredFontsCss()
    rebuildRegisteredOnly()
  } finally { fontLoading.value = false }
}

/**
 * 读取项目已注册字体的 CSS 并解析 family 名称
 */
async function loadRegisteredFontsCss(): Promise<void> {
  try {
    const css = await fileManagerService.readFile('src/styles/fonts.css')
    const famSet = new Set<string>()
    const map = new Map<string, string>()
    const blocks = css.match(/@font-face\s*\{[\s\S]*?\}/g) || []
    for (const b of blocks) {
      const fm = /font-family:\s*['"]([^'"]+)['"]/i.exec(b)
      const sm = /src:\s*url\(['"]([^'"]+)['"]\)/i.exec(b)
      if (fm) { famSet.add(fm[1]) }
      if (fm && sm) {
        const url = sm[1]
        const file = url.split('/').pop() || ''
        if (file) { map.set(file, fm[1]) }
      }
    }
    registeredFamilies.value = famSet
    registrationBySrc.value = map
  } catch {
    registeredFamilies.value = new Set()
    registrationBySrc.value = new Map()
  }
}

/**
 * 根据注册信息与现有文件重建“注册但缺文件”的列表
 */
function rebuildRegisteredOnly(): void {
  const present = new Set<string>(fonts.value.map(f => f.name))
  const arr: { fileName: string; family: string }[] = []
  registrationBySrc.value.forEach((family, fileName) => {
    if (!present.has(fileName)) arr.push({ fileName, family })
  })
  registeredOnly.value = arr
}

/**
 * 判断给定 family 是否已在项目中注册
 */
function isFontRegisteredForFile(fileName: string): boolean { return registrationBySrc.value.has(fileName) }

/**
 * 删除字体文件
 */
async function deleteFont(f: { name: string; path: string }): Promise<void> {
  openConfirm({
    title: '删除字体',
    message: `确定删除 ${f.name} 吗？`,
    onOk: async () => {
      try {
        await fileManagerService.deleteFile(f.path)
        await removeFontRegistrationForFile(f.name)
        await loadFonts()
      } catch { }
    }
  })
}

function onSelectUpload(e: Event): void {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedUpload.value = input.files[0]
    void doUpload()
  }
}

async function doUpload(): Promise<void> {
  if (!selectedUpload.value) return
  const file = selectedUpload.value
  const name = file.name
  if (!isWoff2(name)) { alert('仅支持 .woff2 文件'); return }
  if (fonts.value.some(f => f.name === name)) {
    openConfirm({
      title: '覆盖字体',
      message: '同名文件已存在，是否覆盖并更新注册？',
      onOk: async () => { await performUpload(file) },
      onCancel: () => { selectedUpload.value = null; if (uploadInput.value) uploadInput.value.value = '' }
    })
    return
  }
  await performUpload(file)
}

/**
 * 执行上传并注册字体
 */
async function performUpload(file: File): Promise<void> {
  const name = file.name
  const target = `public/fonts/${name}`
  try {
    await fileManagerService.uploadFile(target, file)
    const family = previewFamilyForFile(name)
    await upsertFontRegistration(name, family)
    selectedUpload.value = null
    if (uploadInput.value) uploadInput.value.value = ''
    await loadFonts()
  } catch { }
}

function openRename(f: { name: string }): void {
  const current = registrationBySrc.value.get(f.name) || previewFamilyForFile(f.name)
  renameState.value = { fileName: f.name, newFamily: current }
}

/**
 * 打开改名对话（按文件名触发，适用于缺文件项）
 */
function openRenameByName(fileName: string): void {
  const current = registrationBySrc.value.get(fileName) || previewFamilyForFile(fileName)
  renameState.value = { fileName, newFamily: current }
}

function cancelRename(): void { renameState.value = null }

async function confirmRename(): Promise<void> {
  if (!renameState.value) return
  const { fileName, newFamily } = renameState.value
  if (!newFamily || !newFamily.trim()) { alert('名称不能为空'); return }
  try {
    await upsertFontRegistration(fileName, newFamily.trim())
    renameState.value = null
    await loadRegisteredFontsCss()
    updateFontFaceCss()
    rebuildRegisteredOnly()
  } catch { }
}

async function upsertFontRegistration(fileName: string, family: string): Promise<void> {
  const cssPath = 'src/styles/fonts.css'
  const absUrl = `/fonts/${fileName}`
  const css = await fileManagerService.readFile(cssPath)
  let changed = false
  const blocks = css.match(/@font-face\s*\{[\s\S]*?\}/g) || []
  let newCss = css
  for (const b of blocks) {
    const sm = /src:\s*url\(['"]([^'"]+)['"]\)/i.exec(b)
    if (sm && sm[1].endsWith(fileName)) {
      const updated = b.replace(/font-family:\s*['"][^'"]+['"]/i, `font-family: '${family}'`).replace(/src:\s*url\(['"][^'"]+['"]\)/i, `src: url('${absUrl}')`)
      newCss = newCss.replace(b, updated)
      changed = true
      break
    }
  }
  if (!changed) {
    const append = `\n\n@font-face{\n  font-family: '${family}';\n  src: url('${absUrl}') format('woff2');\n  font-weight: 400;\n  font-style: normal;\n  font-display: swap;\n}`
    newCss = newCss + append
  }
  await fileManagerService.writeFile(cssPath, newCss)
  await loadRegisteredFontsCss()
  rebuildRegisteredOnly()
}

async function removeFontRegistrationForFile(fileName: string): Promise<void> {
  const cssPath = 'src/styles/fonts.css'
  const css = await fileManagerService.readFile(cssPath)
  const blocks = css.match(/@font-face\s*\{[\s\S]*?\}/g) || []
  let newCss = css
  for (const b of blocks) {
    const sm = /src:\s*url\(['"]([^'"]+)['"]\)/i.exec(b)
    if (sm && sm[1].endsWith(fileName)) {
      newCss = newCss.replace(b, '')
      break
    }
  }
  if (newCss !== css) {
    await fileManagerService.writeFile(cssPath, newCss)
    await loadRegisteredFontsCss()
    rebuildRegisteredOnly()
  }
}

/**
 * 为缺失文件的注册项上传对应文件（目标名使用已注册的 src 文件名）
 */
async function uploadMissing(targetFileName: string): Promise<void> {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.woff2'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    if (!isWoff2(file.name)) { alert('仅支持 .woff2 文件'); return }
    try {
      await fileManagerService.uploadFile(`public/fonts/${targetFileName}`, file)
      await loadFonts()
    } catch { }
  }
  input.click()
}

/**
 * 删除仅注册的缺文件项（移除 @font-face）
 */
async function deleteRegisteredEntry(fileName: string): Promise<void> {
  try {
    await removeFontRegistrationForFile(fileName)
    await loadFonts()
  } catch { }
}

onMounted(() => {
  // 注入或复用预览样式节点，并监听变化
  assetFontStyleEl = document.getElementById('asset-font-preview-style') as HTMLStyleElement
  if (!assetFontStyleEl) {
    assetFontStyleEl = document.createElement('style')
    assetFontStyleEl.id = 'asset-font-preview-style'
    document.head.appendChild(assetFontStyleEl)
  }
  const stop = watch(fontFaceCss, css => { if (assetFontStyleEl) assetFontStyleEl.textContent = css }, { immediate: true })
  loadFonts()
  onUnmounted(() => { if (assetFontStyleEl?.parentNode) assetFontStyleEl.parentNode.removeChild(assetFontStyleEl); assetFontStyleEl = null; stop() })
})

/**
 * 打开确认弹窗
 */
function openConfirm(options: { title?: string; message: string; onOk?: () => void; onCancel?: () => void }): void {
  confirm.value.title = options.title || '确认操作'
  confirm.value.message = options.message
  confirm.value.onOk = options.onOk
  confirm.value.onCancel = options.onCancel
  confirm.value.visible = true
}

/**
 * 确认回调
 */
function confirmOk(): void { const cb = confirm.value.onOk; confirm.value.visible = false; confirm.value.onOk = undefined; cb && cb() }

/**
 * 取消回调
 */
function confirmCancel(): void { const cb = confirm.value.onCancel; confirm.value.visible = false; confirm.value.onCancel = undefined; cb && cb() }
</script>

<style scoped>
/* 无额外样式 */
</style>