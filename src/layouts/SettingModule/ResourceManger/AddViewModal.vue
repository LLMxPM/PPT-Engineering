<!--
  文档用途：新增页面视图弹窗面板
  主要功能：
    1. 选择页面容器类型（src/components/layout/pagecontainer 下的组件）
    2. 解析所选容器的 interface Props，动态生成表单项供配置
    3. 编辑 content 插槽的纯文本内容（单行文本输入框）
    4. 选择是否配置路由，支持生成 public/config/routes.config.yaml 的顶级路由
    5. 依据表单配置生成 src/views 下的 .vue 页面文件
  技术栈：Vue@3 + TypeScript@5 + Tailwind CSS@3
-->

<template>
  <EditorModal
    v-model:visible="visibleProxy"
    title="新增页面"
    :widthVw="60"
    :heightVh="75"
    :zIndex="600"
    ok-text="创建"
    cancel-text="取消"
    @ok="saveNewView"
    @cancel="handleCancel"
  >
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-[12px] font-medium text-gray-700 mb-1">文件名（不含扩展名）</label>
          <input v-model="form.fileName" type="text" placeholder="例如：MyPage"
                 class="w-full px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          <div class="mt-1 text-[11px] text-gray-500">实际保存为：{{ fullViewPath }}</div>
          <div v-if="errors.fileName" class="mt-1 text-[11px] text-red-600">{{ errors.fileName }}</div>
        </div>
        <div>
          <label class="block text-[12px] font-medium text-gray-700 mb-1">容器类型</label>
          <select v-model="form.containerName" @change="onContainerChange" class="w-full px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option v-for="opt in containerOptions" :key="opt.name" :value="opt.name">{{ opt.name }}</option>
          </select>
          <div v-if="errors.containerName" class="mt-1 text-[11px] text-red-600">{{ errors.containerName }}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div v-if="propsSchema.length" class="border rounded-md p-3">
          <div class="text-[12px] font-semibold text-gray-700 mb-2">基础配置</div>
          <div class="grid grid-cols-1 gap-3">
            <div v-for="p in propsSchema" :key="p.name">
              <label class="block text-[12px] font-medium text-gray-700 mb-1">{{ p.name }} <span class="text-gray-400">({{ p.type }})</span> <span v-if="p.optional" class="text-gray-400">可选</span></label>
              <input v-if="p.type === 'string' || p.type === 'any'" v-model="propsValues[p.name]" type="text"
                     class="w-full px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <input v-else-if="p.type === 'number'" v-model.number="propsValues[p.name]" type="number"
                     class="w-full px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <label v-else-if="p.type === 'boolean'" class="inline-flex items-center gap-2 text-[12px] text-gray-700">
                <input v-model="propsValues[p.name]" type="checkbox" />
                勾选为 true
              </label>
              <input v-else v-model="propsValues[p.name]" type="text"
                     class="w-full px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
        </div>
        <div class="border rounded-md p-3">
          <div class="text-[12px] font-semibold text-gray-700 mb-2">占位内容</div>
          <textarea
            v-model="form.slotContent"
            rows="5"
            placeholder="请输入占位内容（纯文本）"
            class="w-full px-3 py-2 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          ></textarea>
        </div>
      </div>

      <div class="border rounded-md p-3">
        <label class="inline-flex items-center gap-2 text-[12px] font-medium text-gray-700">
          <input type="checkbox" v-model="form.configureRoute" /> 是否配置路由
        </label>
        <div v-if="form.configureRoute" class="grid grid-cols-2 gap-3 mt-2">
          <div>
            <label class="block text-[12px] font-medium text-gray-700 mb-1">路由路径（不含前导/）</label>
            <input v-model="form.routePath" type="text" placeholder="例如：my-page"
                   class="w-full px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            <div v-if="errors.routePath" class="mt-1 text-[11px] text-red-600">{{ errors.routePath }}</div>
          </div>
          <div>
            <label class="block text-[12px] font-medium text-gray-700 mb-1">路由标题</label>
            <input v-model="form.routeTitle" type="text" placeholder="用于菜单显示的标题"
                   class="w-full px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div class="col-span-2">
            <label class="block text-[12px] font-medium text-gray-700 mb-1">路由层级</label>
            <div class="flex items-center gap-6">
              <label class="inline-flex items-center gap-2 text-[12px] text-gray-700">
                <input type="radio" class="h-3 w-3" value="route" v-model="form.routeType" /> 顶级路由
              </label>
              <label class="inline-flex items-center gap-2 text-[12px] text-gray-700">
                <input type="radio" class="h-3 w-3" value="child" v-model="form.routeType" /> 子路由
              </label>
            </div>
          </div>
           <div v-if="form.routeType === 'child'">
            <label class="block text-[12px] font-medium text-gray-700 mb-1">父路由</label>
            <select v-model="form.parentRoute" class="w-full px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option v-for="opt in parentOptions" :key="opt.value" :value="opt.value">{{ opt.label }}（{{ opt.value }}）</option>
            </select>
            <div v-if="errors.parentRoute" class="mt-1 text-[11px] text-red-600">{{ errors.parentRoute }}</div>
          </div>
        <div v-if="form.routeType === 'route'">
            <label class="block text-[12px] font-medium text-gray-700 mb-1">菜单图标</label>
            <div class="relative flex items-center gap-2">
              <Icon :name="form.routeIcon" :size="24" :stroke-width="2" class="text-gray-700" />
              <input v-model="form.routeIcon" type="text" placeholder="选择或输入图标名称"
                class="flex-1 px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <button @click="openIconPicker"
                class="px-3 py-2 text-[12px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">选择图标</button>
            </div>
          </div>
          
          <div>
            <label class="block text-[12px] font-medium text-gray-700 mb-1">排序序号（order）</label>
            <input v-model.number="form.routeOrder" type="number" placeholder="例如：10"
                   class="w-full px-3 h-8 text-[12px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>
      </div>
    </div>
  </EditorModal>
  <EditorModal :visible="iconPickerVisible" :title="'选择图标'" :widthVw="70" :heightVh="80" :zIndex="602"
    :showFooter="false" @update:visible="v => { if (!v) iconPickerVisible = false }"
    @cancel="() => { iconPickerVisible = false }">
    <div class="h-[calc(80vh-100px)]">
      <IconPicker v-model="form.routeIcon" @select="handleIconSelected" />
    </div>
  </EditorModal>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { upsertRouteEntry, listParentRouteOptions } from '@/core/services/RouteConfigService'
import EditorModal from '@/components/editor/EditorModal.vue'
import { fileManagerService } from '@/core/services/FileManagerService'
import IconPicker from '@/components/editor/IconPicker.vue'
import Icon from '@/components/layout/contentcommon/Icon.vue'
interface Emits { (e: 'update:visible', v: boolean): void; (e: 'created', payload: { filePath: string }): void }
const emit = defineEmits<Emits>()

const props = defineProps<{ visible: boolean; baseDir?: string }>()
const visibleProxy = computed({ get: () => props.visible, set: (v: boolean) => emit('update:visible', v) })

/**
 * 计算视图文件完整保存路径
 */
const fullViewPath = computed(() => {
  const dirCleanAbs = String(currentBaseDir.value || 'src/views').replace(/\\/g,'/').replace(/\/+$/,'')
  const fname = safeFileName(form.value.fileName || '')
  if (!fname) return `${dirCleanAbs}/未命名.vue`
  return `${dirCleanAbs}/${fname}.vue`
})

const containerOptions = ref<Array<{ name: string; path: string }>>([])
const propsSchema = ref<Array<{ name: string; type: string; optional: boolean }>>([])
const propsValues = ref<Record<string, any>>({})
const parentOptions = ref<Array<{ value: string; label: string }>>([])

const currentBaseDir = ref<string>('src/views')
const form = ref({
  dirRelPath: '',
  fileName: '',
  containerName: '',
  slotContent: '',
  configureRoute: true,
  routePath: '',
  routeTitle: '',
  routeOrder: 0,
  routeIcon: '',
  routeType: 'route' as 'route' | 'child',
  parentRoute: ''
  
})

const errors = ref<{ fileName?: string; containerName?: string; routePath?: string; parentRoute?: string }>({})

/**
 * 应用基础目录：根据外部选择的目录更新当前保存目录与显示的相对路径
 */
function applyBaseDir(dir: string): void {
  const next = String(dir || 'src/views').replace(/\\/g,'/').replace(/\/+$/,'')
  currentBaseDir.value = next
  const rel = next.replace(/^src\/views\/?/, '')
  form.value.dirRelPath = rel
}

/**
 * 加载可用容器列表
 */
async function loadContainers(): Promise<void> {
  try {
    const modules: Record<string, any> = import.meta.glob('@/components/layout/pagecontainer/*.vue')
    const keys = Object.keys(modules)
    containerOptions.value = keys
      .map(k => {
        const name = k.split('/').pop()!.replace(/\.vue$/i,'')
        const normalized = k.replace(/^@\//,'src/').replace(/^\/+/,'').replace(/\\/g,'/')
        return { name, path: normalized }
      })
    if (!form.value.containerName && containerOptions.value.length) {
      form.value.containerName = containerOptions.value[0].name
      await onContainerChange()
    }
  } catch {
    try {
      const list = await fileManagerService.listFiles('src/components/layout/pagecontainer')
      containerOptions.value = (list || [])
        .filter(e => !e.isDirectory && /\.vue$/i.test(e.name))
        .map(e => ({ name: e.name.replace(/\.vue$/i, ''), path: e.path }))
      if (!form.value.containerName && containerOptions.value.length) {
        form.value.containerName = containerOptions.value[0].name
        await onContainerChange()
      }
    } catch {}
  }
}

/**
 * 解析容器源码中的 interface Props 与 withDefaults 默认值
 */
async function parsePropsFromSource(srcPath: string): Promise<{ schema: Array<{ name: string; type: string; optional: boolean }>; defaults: Record<string, any> }> {
  try {
    const safePath = String(srcPath).replace(/^\/+/,'').replace(/\\/g,'/')
    const code = await fileManagerService.readFile(safePath)
    const m = code.match(/interface\s+Props\s*\{([\s\S]*?)\}/)
    const schema: Array<{ name: string; type: string; optional: boolean }> = []
    if (m) {
      const body = m[1]
      const lines = body.split('\n').map(s => s.trim()).filter(Boolean)
      for (const ln of lines) {
        const pm = ln.match(/^([a-zA-Z_][\w]*)\??:\s*([^;]+);?/) 
        if (pm) {
          const name = pm[1]
          const typeRaw = pm[2].trim()
          const optional = /\?/.test(ln.split(':')[0])
          let type = 'any'
          if (/^string\b/i.test(typeRaw)) type = 'string'
          else if (/^number\b/i.test(typeRaw)) type = 'number'
          else if (/^boolean\b/i.test(typeRaw)) type = 'boolean'
          schema.push({ name, type, optional })
        }
      }
    }
    const d = code.match(/withDefaults\(\s*defineProps<\s*Props\s*>\(\)\s*,\s*\{([\s\S]*?)\}\s*\)/)
    const defaults: Record<string, any> = {}
    if (d) {
      const obj = d[1]
      const entries = obj.split(/\n|,/).map(s => s.trim()).filter(Boolean)
      for (const ent of entries) {
        const em = ent.match(/^([a-zA-Z_][\w]*)\s*:\s*(.+)$/)
        if (em) {
          const k = em[1]
          let vRaw = em[2].trim().replace(/,$/, '')
          if (/^['"]/ .test(vRaw)) defaults[k] = vRaw.replace(/^['"]/,'').replace(/['"]$/,'')
          else if (/^(true|false)\b/i.test(vRaw)) defaults[k] = /^true$/i.test(vRaw)
          else if (/^[\d\.]+$/.test(vRaw)) defaults[k] = Number(vRaw)
          else defaults[k] = ''
        }
      }
    }
    return { schema, defaults }
  } catch {
    return { schema: [], defaults: {} }
  }
}

/**
 * 容器切换：重新解析 Props 并填充默认值
 */
async function onContainerChange(): Promise<void> {
  try {
    const opt = containerOptions.value.find(o => o.name === form.value.containerName)
    if (!opt) return
    const { schema, defaults } = await parsePropsFromSource(opt.path)
    propsSchema.value = schema
    propsValues.value = {}
    for (const s of schema) {
      if (defaults.hasOwnProperty(s.name)) propsValues.value[s.name] = defaults[s.name]
      else {
        propsValues.value[s.name] = s.type === 'number' ? 0 : s.type === 'boolean' ? false : ''
      }
    }
    if (propsValues.value['title'] && !form.value.routeTitle) form.value.routeTitle = String(propsValues.value['title'])
  } catch {}
}

/**
 * 取消：关闭弹窗
 */
function handleCancel(): void { emit('update:visible', false) }

/**
 * 校验表单
 */
function validate(): boolean {
  errors.value = {}
  const fname = safeFileName(form.value.fileName || '')
  if (!fname) errors.value.fileName = '请输入文件名'
  if (!form.value.containerName) errors.value.containerName = '请选择容器类型'
  if (form.value.configureRoute) {
    const rp = (form.value.routePath || '').trim()
    if (!rp) errors.value.routePath = '请输入路由路径'
    if (form.value.routeType === 'child') {
      const pr = (form.value.parentRoute || '').trim()
      if (!pr) errors.value.parentRoute = '请选择父路由'
    }
  }
  return Object.keys(errors.value).length === 0
}

/**
 * 生成页面 .vue 文件内容
 */
function buildSfcContent(): string {
  const compName = form.value.containerName
  const importPath = `@/components/layout/pagecontainer/${compName}.vue`
  const attrs = Object.keys(propsValues.value)
    .map(k => {
      const v = propsValues.value[k]
      if (typeof v === 'string') return `${k}="${escapeHtml(String(v))}"`
      if (typeof v === 'number' || typeof v === 'boolean') return `:${k}="${v}"`
      return `:${k}='${JSON.stringify(v)}'`
    })
    .join('\n      ')
  const contentText = String(form.value.slotContent || '').replace(/\r?\n/g, ' ')
  const contentHtml = contentText ? `<div class=\"font-body text-lg text-secondary\">${escapeHtml(contentText)}</div>` : ''
  const tOpen = '<' + 'template>'
  const tClose = '</' + 'template>'
  const scOpen = '<' + 'script setup lang=\"ts\">'
  const scClose = '</' + 'script>'
  const stOpen = '<' + 'style scoped>'
  const stClose = '</' + 'style>'
  const sfc = `<!--\n  文件用途：由新增页面面板生成的静态视图\n  说明：基于 ${compName} 容器，固定尺寸 1920x1080，内容通过 content 插槽填充\n-->\n\n${tOpen}\n  <${compName}\n      ${attrs}\n  >\n    <template #content>\n      ${contentHtml}\n    </template>\n  </${compName}>\n${tClose}\n\n${scOpen}\nimport ${compName} from '${importPath}'\n/**\n * 设置组件名称，方便调试与定位\n */\ndefineOptions({ name: '${deriveComponentName()}' })\n${scClose}\n\n${stOpen}\n${stClose}\n`
  return sfc
}

/**
 * 转义文本为安全 HTML 内容
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 从文件相对路径派生组件名
 */
function deriveComponentName(): string {
  const base = safeFileName(form.value.fileName || 'NewView')
  return base.replace(/[^a-zA-Z0-9]/g, '_')
}

/**
 * 写入路由配置 YAML（支持顶级路由与子路由）
 */
async function writeRouteConfig(aliasCompPath: string): Promise<void> {
  try {
    const routePath = String(form.value.routePath || '').replace(/^\/+|\/+$/g,'')
    await upsertRouteEntry({
      type: form.value.routeType,
      parentRoute: form.value.routeType === 'child' ? String(form.value.parentRoute || '').replace(/^\/+|\/+$/g,'') : '',
      route: routePath,
      component: aliasCompPath,
      meta: { title: form.value.routeTitle || routePath, icon: String(form.value.routeIcon || ''), order: Number(form.value.routeOrder) || 0 }
    })
  } catch {}
}

/**
 * 执行创建：写文件并按需写路由
 */
async function saveNewView(): Promise<void> {
  if (!validate()) return
  const filePath = fullViewPath.value
  const dir = filePath.replace(/\\/g, '/').replace(/\/+$/,'').replace(/\/(?:[^/]+)$/,'')
  try {
    await fileManagerService.createDir(dir)
  } catch {}
  const content = buildSfcContent()
  try {
    const files = await fileManagerService.listFiles(dir)
    const names = new Set((files || []).filter(f => !f.isDirectory).map(f => f.name.toLowerCase()))
    let targetPath = filePath
    let idx = 1
    const baseName = safeFileName(form.value.fileName || 'new-page')
    while (names.has(`${baseName}.vue`.toLowerCase())) {
      targetPath = `${dir}/${baseName}-${idx}.vue`
      idx++
      if (!names.has(`${baseName}-${idx}.vue`.toLowerCase())) break
    }
    await fileManagerService.writeFile(targetPath, content)
    if (form.value.configureRoute) {
      const effectiveRoutePath = String(form.value.routePath || baseName)
      const alias = `@/${targetPath.replace(/^src\//,'')}`
      form.value.routePath = effectiveRoutePath
      await writeRouteConfig(alias)
    }
  } catch {}
  emit('created', { filePath: fullViewPath.value })
  emit('update:visible', false)
}

onMounted(() => {
  applyBaseDir(String(props.baseDir || 'src/views'))
  loadContainers()
  loadParentRouteOptions()
  /**
   * 监听外部基础目录变更，确保弹窗在不同选择下保存到正确子目录
   */
  watch(() => props.baseDir, (v) => {
    applyBaseDir(String(v || 'src/views'))
  })
})

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fff]/g, '').replace(/^\s+|\s+$/g,'') || ''
}

/**
 * 加载父路由选项（从 YAML 顶级 routes 构建）
 */
async function loadParentRouteOptions(): Promise<void> {
  try {
    parentOptions.value = await listParentRouteOptions()
  } catch {
    parentOptions.value = []
  }
}

/**
 * 打开图标选择器弹窗
 */
const iconPickerVisible = ref(false)
function openIconPicker(): void {
  iconPickerVisible.value = true
}

/**
 * 处理从图标选择器选中的图标并回填
 */
function handleIconSelected(payload: { name: string; type: 'lucide' | 'static'; src?: string }): void {
  form.value.routeIcon = payload.name
  iconPickerVisible.value = false
}
</script>

<style scoped>
/* 无额外样式 */
</style>
