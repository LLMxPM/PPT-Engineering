<!--
  文件用途：资源管理弹窗（图片/字体/页面视图）
  主要功能：
  - 图片（public/img）：上传、删除、预览
  - 字体（public/fonts）：预览、删除
  - 页面视图（src/views）：预览（映射到路由）、删除
  使用技术：Vue@3 + TypeScript@5 + Tailwind CSS@3
-->

<template>
  <EditorModal
    v-model:visible="visibleState"
    title="资源管理"
    :widthVw="80"
    :heightVh="90"
    :zIndex="102"
    :showFooter="false"
    @cancel="onCancel"
  >
    <div class="pt-0">
      <div class="flex gap-2 ">
        <button :class="tabButtonClass('icon')" @click="activeTab = 'icon'">本地图标</button>
        <button :class="tabButtonClass('illus')" @click="activeTab = 'illus'">插图</button>
        <button :class="tabButtonClass('drawio')" @click="activeTab = 'drawio'">Drawio</button>
        <button :class="tabButtonClass('fonts')" @click="activeTab = 'fonts'">字体</button>
        <button :class="tabButtonClass('views')" @click="activeTab = 'views'">页面视图</button>
      </div>
    </div>

    <div class="pt-2 h-[calc(90vh-130px)] overflow-hidden">
      <IconResourcePanel v-if="activeTab === 'icon'" />
      <IllusResourcePanel v-else-if="activeTab === 'illus'" />
      <DrawioResourcePanel v-else-if="activeTab === 'drawio'" />
      <FontResourcePanel v-else-if="activeTab === 'fonts'" />
      <ViewResourcePanel v-else @close="onCancel" />
    </div>
    <ConfirmModal
      v-model:visible="confirm.visible"
      :title="confirm.title"
      :message="confirm.message"
      :zIndex="1020"
      :widthVw="40"
      cancel-text="取消"
      ok-text="确定"
      @ok="confirmOk"
      @cancel="confirmCancel"
    />
  </EditorModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { fileManagerService } from '@/core/services/FileManagerService'
import yaml from 'js-yaml'
import FontResourcePanel from '@/layouts/SettingModule/ResourceManger/FontResourcePanel.vue'
import ViewResourcePanel from '@/layouts/SettingModule/ResourceManger/ViewResourcePanel.vue'
import IconResourcePanel from '@/layouts/SettingModule/ResourceManger/IconResourcePanel.vue'
import IllusResourcePanel from '@/layouts/SettingModule/ResourceManger/IllusResourcePanel.vue'
import DrawioResourcePanel from '@/layouts/SettingModule/ResourceManger/DrawioResourcePanel.vue'
import EditorModal from '@/components/editor/EditorModal.vue'
import ConfirmModal from '@/components/editor/ConfirmModal.vue'

interface Props { visible: boolean }
interface Emits { (e: 'update:visible', v: boolean): void }

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()

const visibleState = ref<boolean>(props.visible)
watch(() => props.visible, v => { visibleState.value = v })
watch(visibleState, v => emit('update:visible', v))

const activeTab = ref<'icon' | 'illus' | 'drawio' | 'fonts' | 'views'>('icon')
const confirm = ref<{ visible: boolean; title: string; message: string; onOk?: () => void; onCancel?: () => void }>({ visible: false, title: '确认操作', message: '' })

/** 切换标签按钮样式 */
function tabButtonClass(tab: 'icon' | 'illus' | 'drawio' | 'fonts' | 'views') {
  return [
    'px-3 h-9 text-[14px] font-medium rounded-md',
    activeTab.value === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  ]
}

/** 关闭弹窗 */
function onCancel(): void { visibleState.value = false }

// =============== 图片 ===============
const images = ref<{ name: string; path: string; publicPath: string }[]>([])
const imgTree = ref<ImgNode[]>([])
const expandedDirs = ref<Set<string>>(new Set())
const selectedImgDir = ref<string>('public/img')
const imgLoading = ref<boolean>(false)

function isImage(name: string): boolean { return /\.(png|jpe?g|svg|webp|gif)$/i.test(name) }
function buildPublicUrl(rel: string): string { const base = (import.meta.env.BASE_URL || '/'); return `${base.replace(/\/$/, '')}/${rel.replace(/^\//, '')}` }

type ImgNode = { name: string; path: string; isDirectory: boolean; children?: ImgNode[] }

async function buildImgTree(dir: string): Promise<ImgNode[]> {
  const list: any[] = await fileManagerService.listFiles(dir)
  const nodes: ImgNode[] = []
  for (const e of list) {
    const node: ImgNode = { name: e.name, path: e.path, isDirectory: e.isDirectory }
    if (e.isDirectory) {
      node.children = await buildImgTree(e.path)
    }
    nodes.push(node)
  }
  return nodes
}

/** 加载 public/img 下的图片文件 */
async function loadImages(): Promise<void> {
  imgLoading.value = true
  try {
    const files: any[] = await fileManagerService.listFiles(selectedImgDir.value)
    images.value = (files || []).filter(f => !f.isDirectory && isImage(f.name)).map(f => ({
      name: f.name,
      path: f.path,
      publicPath: buildPublicUrl(`/img/${relativeImgPath(selectedImgDir.value, f.name)}`)
    }))
  } finally { imgLoading.value = false }
}

function relativeImgPath(dir: string, name: string): string {
  // dir 形如 public/img 或 public/img/sub
  const prefix = 'public/'
  const rel = dir.startsWith(prefix) ? dir.slice(prefix.length) : dir
  const base = rel === 'img' ? 'img/' : rel.replace(/^img\/?/, 'img/') + (rel.endsWith('/') ? '' : '/')
  return (base + name).replace(/\/+/g, '/')
}

function isExpanded(path: string): boolean { return expandedDirs.value.has(path) }
function toggleDir(node: ImgNode): void {
  if (!node.isDirectory) return
  if (expandedDirs.value.has(node.path)) expandedDirs.value.delete(node.path)
  else expandedDirs.value.add(node.path)
  selectedImgDir.value = node.path
  loadImages()
}
function selectImgDir(path: string): void { selectedImgDir.value = path; loadImages() }

/** 触发图片上传 */
function triggerImageUpload(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => { const file = input.files?.[0]; if (file) uploadImage(file) }
  input.click()
}

/** 保证文件名不重复 */
function ensureUniqueImage(name: string): string {
  const set = new Set(images.value.map(i => i.name))
  if (!set.has(name)) return name
  const dot = name.lastIndexOf('.')
  const base = dot >= 0 ? name.slice(0, dot) : name
  const ext = dot >= 0 ? name.slice(dot) : ''
  let idx = 1
  let candidate = ''
  do { candidate = `${base}-${idx}${ext}`; idx++ } while (set.has(candidate))
  return candidate
}

/** 上传图片到 public/img */
async function uploadImage(file: File): Promise<void> {
  try {
    const finalName = ensureUniqueImage(file.name)
    await fileManagerService.uploadFile(`public/img/${finalName}`, file)
    imgTree.value = await buildImgTree('public/img')
    expandedDirs.value.add('public/img')
    await loadImages()
  } catch { }
}

/** 删除图片 */
async function deleteImage(item: { name: string; path: string }): Promise<void> {
  openConfirm({
    title: '删除图片',
    message: `确定删除 ${item.name} 吗？`,
    onOk: async () => { try { await fileManagerService.deleteFile(item.path); await loadImages() } catch { } }
  })
}

// =============== 字体 ===============
const fonts = ref<{ name: string; path: string; publicPath: string }[]>([])
const registeredFamilies = ref<Set<string>>(new Set())
const fontLoading = ref<boolean>(false)

function isWoff2(name: string): boolean { return /\.(woff2)$/i.test(name) }

/** 加载字体文件列表并生成预览 CSS */
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
  } finally { fontLoading.value = false }
}

/** 预览字体使用的 family 名 */
function previewFamilyName(f: { name: string }): string {
  const dot = f.name.lastIndexOf('.')
  return dot >= 0 ? f.name.slice(0, dot) : f.name
}

const fontFaceCss = ref<string>('')
let assetFontStyleEl: HTMLStyleElement | null = null

/** 生成字体预览所需的 @font-face CSS */
function updateFontFaceCss(): void {
  const rules = fonts.value.map(f => {
    const family = previewFamilyName(f)
    return `@font-face{font-family:'${family}';src:url('${f.publicPath}') format('woff2');font-weight:400;font-style:normal;font-display:swap;}`
  })
  fontFaceCss.value = rules.join('\n')
}

async function loadRegisteredFontsCss(): Promise<void> {
  try {
    const css = await fileManagerService.readFile('src/styles/fonts.css')
    const set = new Set<string>()
    const re = /font-family:\s*['"]([^'"\n]+)['"]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(css)) !== null) { set.add(m[1]) }
    registeredFamilies.value = set
  } catch { registeredFamilies.value = new Set() }
}

function isFontRegistered(family: string): boolean { return registeredFamilies.value.has(family) }

/** 删除字体文件 */
async function deleteFont(f: { name: string; path: string }): Promise<void> {
  openConfirm({
    title: '删除字体',
    message: `确定删除 ${f.name} 吗？`,
    onOk: async () => { try { await fileManagerService.deleteFile(f.path); await loadFonts() } catch { } }
  })
}

// =============== 页面视图 ===============
const views = ref<{ path: string; routePath?: string }[]>([])
const viewLoading = ref<boolean>(false)

function isVueFile(name: string): boolean { return /\.vue$/i.test(name) }

/** 递归列出目录下的所有 .vue 文件 */
async function listVueFilesRecursive(dir: string): Promise<{ path: string }[]> {
  const entries: any[] = await fileManagerService.listFiles(dir)
  const result: { path: string }[] = []
  for (const e of entries) {
    if (e.isDirectory) {
      const sub = await listVueFilesRecursive(e.path)
      result.push(...sub)
    } else if (isVueFile(e.name)) {
      result.push({ path: e.path })
    }
  }
  return result
}

/** 解析 YAML 路由，构建 view->routePath 映射 */
async function buildViewRouteMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  try {
    const raw = await fileManagerService.readFile('public/config/routes.config.yaml')
    const doc: any = yaml.load(raw)
    const routes = Array.isArray(doc?.routes) ? doc.routes : []
    for (const r of routes) {
      if (typeof r?.component === 'string') {
        const comp: string = r.component
        const routePath = `/${r.route}`
        const normalized = normalizeViewComponentPath(comp)
        map[normalized] = routePath
      }
      if (Array.isArray(r?.children)) {
        for (const c of r.children) {
          if (typeof c?.component === 'string') {
            const comp: string = c.component
            const routePath = `/${r.route}/${c.route}`
            const normalized = normalizeViewComponentPath(comp)
            map[normalized] = routePath
          }
        }
      }
    }
  } catch { }
  return map
}

/** 将 '@/views/xxx.vue' 规范化为实际文件路径 'src/views/xxx.vue' */
function normalizeViewComponentPath(component: string): string {
  let s = component.trim()
  if (s.startsWith('@/')) s = s.replace('@/', 'src/')
  if (s.startsWith('src/')) return s.replace(/\\/g, '/').replace(/\/*$/, '')
  return s
}

/** 加载视图列表并关联路由 */
async function loadViews(): Promise<void> {
  viewLoading.value = true
  try {
    const files = await listVueFilesRecursive('src/views')
    const routeMap = await buildViewRouteMap()
    views.value = files.map(f => ({ path: f.path.replace(/\\/g, '/'), routePath: routeMap[f.path.replace(/\\/g, '/')] }))
  } finally { viewLoading.value = false }
}

/** 预览视图：导航到已映射的路由路径 */
function previewView(v: { routePath?: string }): void {
  if (!v.routePath) return
  router.push(v.routePath)
  visibleState.value = false
}

/** 删除视图文件 */
async function deleteView(v: { path: string }): Promise<void> {
  openConfirm({
    title: '删除视图',
    message: `确定删除 ${v.path} 吗？`,
    onOk: async () => { try { await fileManagerService.deleteFile(v.path); await loadViews() } catch { } }
  })
}

onMounted(() => { loadImages(); loadFonts(); loadViews() })
onUnmounted(() => { })

/** 在挂载阶段注入用于字体预览的样式，并监听变更 */
onMounted(() => {
  assetFontStyleEl = document.getElementById('asset-font-preview-style') as HTMLStyleElement
  if (!assetFontStyleEl) {
    assetFontStyleEl = document.createElement('style')
    assetFontStyleEl.id = 'asset-font-preview-style'
    document.head.appendChild(assetFontStyleEl)
  }
  const stop = watch(fontFaceCss, css => { if (assetFontStyleEl) assetFontStyleEl.textContent = css }, { immediate: true })
  onUnmounted(() => { if (assetFontStyleEl?.parentNode) assetFontStyleEl.parentNode.removeChild(assetFontStyleEl); assetFontStyleEl = null; stop() })
})

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
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #f1f5f9; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>