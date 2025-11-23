<!--
  文件用途：图标配置面板（IconSettingsPanel.vue）
  主要功能：
  - 展示并管理 public/config/icons.config.yaml 中的图标配置
  - 支持新增/删除 Lucide 图标与静态图标，分类视图展开折叠
  - 保存后写回 YAML 并刷新页面
  规则遵循：
  - Vue@3 + TypeScript@5 + Vite@5，样式使用 Tailwind CSS@3
  - 禁止使用 !important 与渐变色；单文件不超过 1000 行
-->

<template>
  <div v-if="visible" class="bg-blue-50/50 h-screen w-[360px] flex flex-col border-r border-gray-200">
    <!-- 头部 -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-blue-50 h-[60px]">
      <h2 class="text-[20px] font-semibold text-gray-900 m-0">图标管理</h2>
      <div class="flex items-center gap-2">
        <button @click="saveIcons" :disabled="!hasChanges || hasValidationErrors"
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
        <button @click="loadIcons"
          class="px-4 py-2 bg-blue-500 text-white border-0 rounded-md cursor-pointer hover:bg-blue-600">重试</button>
      </div>

      <!-- 图标编辑器 -->
      <div v-else class="flex flex-col gap-2 h-full">


        <!-- 搜索栏 -->
        <div class="grid grid-cols-1 gap-2">
          <input v-model="searchQuery" type="text" placeholder="搜索图标名称（Lucide/静态）"
            class="px-2 py-1.5 text-[14px] border border-gray-300 rounded-md bg-white text-gray-700" />
        </div>

        <!-- Lucide 图标模块操作按钮 -->
        <div class="flex flex-col gap-2 flex-1 min-h-0">
          <div class="border border-gray-200 rounded-lg h-full flex flex-col">
            <div class="w-full flex items-center gap-2 px-3 py-2 text-[16px] bg-blue-50 text-gray-900">
              <span class="font-medium">Lucide 图标</span>
              <span class="ml-auto text-[12px] text-gray-500">{{ filteredLucideList.length }}</span>
              <button @click="openAddLucideDialog"
                class="ml-2 px-2 py-1 text-[11px] bg-blue-500 text-white rounded hover:bg-blue-600"
                title="新增Lucide图标">新增</button>
            </div>
            <div class="px-1 py-1 bg-white overflow-y-auto flex-1 min-h-0">
              <div class="grid grid-cols-2 gap-1">
                <div v-for="name in filteredLucideList" :key="name"
                  class="flex items-center gap-1 p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                  <Icon :name="name" :size="iconsConfig.config.default_size"
                    :stroke-width="iconsConfig.config.default_stroke_width" class="text-gray-700" />
                  <span class="text-[12px] text-gray-700 truncate" :title="name">{{ name }}</span>
                  <div class="ml-auto flex items-center ">
                    <button @click.stop="copyIconName(name)"
                      class="flex items-center justify-center w-6 h-6 p-0 border-0 bg-transparent text-gray-600 rounded-md cursor-pointer hover:bg-gray-100"
                      title="复制名称">
                      <Copy :size="14" />
                    </button>
                    <button @click.stop="copyIconUsage(name)"
                      class="flex items-center justify-center w-6 h-6 p-0 border-0 bg-transparent text-gray-600 rounded-md cursor-pointer hover:bg-gray-100"
                      title="复制用法">
                      <Files :size="14" />
                    </button>
                    <button @click.stop="requestDeleteLucide(name)"
                      class="flex items-center justify-center w-6 h-6 p-0 border-0 bg-transparent text-red-500 rounded-md cursor-pointer hover:bg-red-50 hover:text-red-600"
                      title="删除">
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 静态图标（固定高度，内部滚动） -->
        <div class="flex flex-col gap-2 flex-1 min-h-0">
          <div class="border border-gray-200 rounded-lg h-full flex flex-col">
            <div class="w-full flex items-center gap-2 px-3 py-2 text-[16px] bg-blue-50 text-gray-900">
              <span class="font-medium">静态图标</span>
              <span class="ml-auto text-[12px] text-gray-500">{{ filteredStaticList.length }}</span>
              <button @click="openStaticManager"
                class="ml-2 px-2 py-1 text-[11px] bg-blue-500 text-white rounded hover:bg-blue-600"
                title="管理静态图标">管理</button>
            </div>
            <div class="px-3 py-3 bg-white overflow-y-auto flex-1 min-h-0">
              <div class="grid grid-cols-1 gap-2">
                <div v-for="item in filteredStaticList" :key="item.name"
                  class="flex items-center gap-2 p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                  <Icon :name="item.name" :size="iconsConfig.config.default_size"
                    :stroke-width="iconsConfig.config.default_stroke_width" class="text-gray-700" />
                  <span class="text-[12px] text-gray-700 truncate" :title="item.name">{{ item.name }}</span>
                  <span class="text-[11px] text-gray-400 truncate" :title="item.src">{{ item.src }}</span>
                  <div class="ml-auto flex items-center gap-1">
                    <button @click.stop="copyIconName(item.name)"
                      class="flex items-center justify-center w-6 h-6 p-0 border-0 bg-transparent text-gray-600 rounded-md cursor-pointer hover:bg-gray-100"
                      title="复制名称">
                      <Copy :size="14" />
                    </button>
                    <button @click.stop="copyIconUsage(item.name)"
                      class="flex items-center justify-center w-6 h-6 p-0 border-0 bg-transparent text-gray-600 rounded-md cursor-pointer hover:bg-gray-100"
                      title="复制用法">
                      <Files :size="14" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 基本配置（可编辑） -->
        <div class="px-3 py-1 bg-blue-50/60 border border-blue-200 rounded-lg">
          <div class="flex flex-col-2 gap-3 text-[16px] text-gray-700">
            <label class="flex items-center justify-between gap-2">
              <span class="shrink-0 text-gray-900">默认大小</span>
              <div class="flex flex-col items-end">
                <input v-model.number="iconsConfig.config.default_size" type="number" min="12" max="128" step="1"
                  @change="onDefaultSizeChange"
                  class="px-2 py-1.5 text-[14px] rounded-md w-20 bg-white text-gray-700 text-right border"
                  :class="sizeInvalid ? 'border-red-400 focus:border-red-500' : 'border-gray-300'" />
                <span v-if="sizeInvalid" class="mt-1 text-[11px] text-red-500">大小范围 12-128 的整数</span>
              </div>
            </label>
            <label class="flex items-center justify-between gap-2">
              <span class="shrink-0 text-gray-900">线条宽度</span>
              <div class="flex flex-col items-end">
                <input v-model.number="iconsConfig.config.default_stroke_width" type="number" step="0.5" min="1" max="4"
                  @change="onStrokeWidthChange"
                  class="px-2 py-1.5 text-[14px] rounded-md w-20 bg-white text-gray-700 text-right border"
                  :class="strokeInvalid ? 'border-red-400 focus:border-red-500' : 'border-gray-300'" />
                <span v-if="strokeInvalid" class="mt-1 text-[11px] text-red-500">线宽范围 1-4，步进 0.5</span>
              </div>
            </label>
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

    <EditorModal
      v-model:visible="addLucideVisible"
      title="新增 Lucide 图标"
      :widthVw="40"
      :heightVh="40"
      :zIndex="1100"
      @ok="onAddLucideOk"
      @cancel="onAddLucideCancel"
    >
      <div class="flex flex-col gap-3 p-1">
        <label class="text-[14px] text-gray-900">图标名称或组件语法</label>
        <input
          v-model="newLucideName"
          type="text"
          placeholder="例如：Home 或 <Home />"
          class="px-3 py-2 text-[14px] border border-gray-300 rounded-md bg-white text-gray-700"
          @keydown.enter.prevent="onAddLucideOk"
        />
        <p class="text-[12px] text-gray-500">支持输入 Lucide 名称，或 &lt;Name /&gt; 语法。保存后即时注册可预览。</p>
      </div>
    </EditorModal>

    <EditorModal
      v-model:visible="manageStaticVisible"
      title="本地图标管理"
      :widthVw="80"
      :heightVh="90"
      :zIndex="500"
      :showFooter="false"
      @cancel="closeStaticManager"
    >
      <div class="flex-1 h-[calc(90vh-100px)]">
        <IconResourcePanel />
      </div>
    </EditorModal>
  </div>

</template>

<script setup lang="ts">
/**
 * IconSettingsPanel.vue
 * 文档用途：静态“图标管理”面板组件，编辑 public/config/icons.config.yaml。
 * 提供：预览已注册图标、按分类新增/删除 Lucide 与静态图标；保存后刷新页面。
 */
import { ref, computed, onMounted, watch, defineAsyncComponent } from 'vue'
import { X, Save, ChevronRight, Trash2, Copy, Pencil, Files } from 'lucide-vue-next'
import { fileManagerService } from '@/core/services/FileManagerService'
import { parse, stringify } from 'yaml'
import { useToast } from '@/core/composables/useToast'
import Icon from '@/components/layout/contentcommon/Icon.vue'
import IconResourcePanel from '@/layouts/SettingModule/ResourceManger/IconResourcePanel.vue'
import EditorModal from '@/components/editor/EditorModal.vue'
import ConfirmModal from '@/components/editor/ConfirmModal.vue'
import { useIconRegistry } from '@/core/composables/useIcon'

/** 组件属性 */
interface Props { visible: boolean }
/** 组件事件 */
interface Emits { (e: 'close'): void;(e: 'update'): void }
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

/** 配置类型定义 */
interface StaticIconItem { name: string; src: string }
interface IconsConfigFile {
  lucide_icons: string[]
  static_icons: StaticIconItem[]
  config: {
    default_size: number
    default_stroke_width: number
    fallback_behavior: string
    placeholder_text: string
  }
}

/** 本地状态 */
const loading = ref(false)
const error = ref('')
const hasChanges = ref(false)
const { showToast } = useToast()
const { registerIcon } = useIconRegistry()
const noticeShown = ref(false)

/** 展开状态 */
const newLucideName = ref('')
const searchQuery = ref('')
const lucideCollapsed = ref(false)
const staticCollapsed = ref(false)
const editingStaticName = ref<string | null>(null)
const renameInput = ref('')
const manageStaticVisible = ref(false)
const addLucideVisible = ref(false)

/** 配置对象 */
const iconsConfig = ref<IconsConfigFile>({
  lucide_icons: [],
  static_icons: [],
  config: {
    default_size: 20,
    default_stroke_width: 2,
    fallback_behavior: 'hide',
    placeholder_text: '?'
  }
})

/** 分类列表 */
const lucideList = computed(() => iconsConfig.value.lucide_icons || [])
const staticList = computed(() => iconsConfig.value.static_icons || [])

/** 搜索过滤结果 */
const filteredLucideList = computed(() => {
  const q = (searchQuery.value || '').trim().toLowerCase()
  if (!q) return lucideList.value
  return lucideList.value.filter(n => n.toLowerCase().includes(q))
})
const filteredStaticList = computed(() => {
  const q = (searchQuery.value || '').trim().toLowerCase()
  if (!q) return staticList.value
  return staticList.value.filter(n => n.name.toLowerCase().includes(q))
})

/** 折叠切换（整体） */
function toggleLucideCollapse(): void { lucideCollapsed.value = !lucideCollapsed.value }
function toggleStaticCollapse(): void { staticCollapsed.value = !staticCollapsed.value }


/** 标记更改 */
function markAsChanged(): void {
  hasChanges.value = true
  if (!noticeShown.value) {
    showToast({ type: 'info', message: '更改已暂存，需要保存才能生效' })
    noticeShown.value = true
  }
}

/**
 * 校验状态：尺寸与线宽
 * - sizeInvalid：默认大小是否超出 12-128 或非数字
 * - strokeInvalid：线宽是否超出 1-4 或非数字
 * - hasValidationErrors：是否存在任何校验错误
 */
const sizeInvalid = computed(() => {
  const v = iconsConfig.value.config.default_size
  return !(Number.isFinite(v)) || Math.round(v) !== v || v < 12 || v > 128
})
const strokeInvalid = computed(() => {
  const v = iconsConfig.value.config.default_stroke_width
  return !(Number.isFinite(v)) || v < 1 || v > 4
})
const hasValidationErrors = computed(() => sizeInvalid.value || strokeInvalid.value)

/**
 * 处理“默认大小”更改
 * - 规范化为整数
 * - 约束在 12-128 范围
 */
function onDefaultSizeChange(): void {
  let v = Number(iconsConfig.value.config.default_size)
  if (!Number.isFinite(v)) v = 20
  v = Math.round(v)
  if (v < 12) v = 12
  if (v > 128) v = 128
  iconsConfig.value.config.default_size = v
  markAsChanged()
}

/**
 * 处理“线条宽度”更改
 * - 规范化为 0.5 步进
 * - 约束在 1-4 范围
 */
function onStrokeWidthChange(): void {
  let v = Number(iconsConfig.value.config.default_stroke_width)
  if (!Number.isFinite(v)) v = 2
  v = Math.round(v * 2) / 2
  if (v < 1) v = 1
  if (v > 4) v = 4
  iconsConfig.value.config.default_stroke_width = v
  markAsChanged()
}

/**
 * 加载图标配置
 * 读取 public/config/icons.config.yaml 并解析到本地状态
 */
async function loadIcons(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const content = await fileManagerService.readFile('public/config/icons.config.yaml')
    const cfg = parse(content) as any
    const normalized: IconsConfigFile = {
      lucide_icons: [],
      static_icons: [],
      config: {
        default_size: cfg?.config?.default_size ?? 20,
        default_stroke_width: cfg?.config?.default_stroke_width ?? 2,
        fallback_behavior: cfg?.config?.fallback_behavior ?? 'hide',
        placeholder_text: cfg?.config?.placeholder_text ?? '?'
      }
    }
    if (Array.isArray(cfg?.lucide_icons)) {
      normalized.lucide_icons = cfg.lucide_icons.filter((x: any) => typeof x === 'string')
    } else {
      for (const arr of Object.values(cfg?.lucide_icons || {})) {
        const list = Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : []
        normalized.lucide_icons.push(...list)
      }
      normalized.lucide_icons = Array.from(new Set(normalized.lucide_icons))
    }
    if (Array.isArray(cfg?.static_icons)) {
      normalized.static_icons = (cfg.static_icons as any[])
        .filter(x => x && typeof x.name === 'string' && typeof x.src === 'string')
        .map(x => ({ name: x.name, src: x.src }))
    } else {
      for (const items of Object.values(cfg?.static_icons || {})) {
        const list = Array.isArray(items) ? items : []
        for (const x of list) {
          if (x && typeof x.name === 'string' && typeof x.src === 'string') normalized.static_icons.push({ name: x.name, src: x.src })
        }
      }
      // 去重：按name唯一
      const seen = new Set<string>()
      normalized.static_icons = normalized.static_icons.filter(it => {
        if (seen.has(it.name)) return false
        seen.add(it.name)
        return true
      })
    }
    iconsConfig.value = normalized
    noticeShown.value = false
  } catch (err: any) {
    error.value = err?.message || '加载图标配置失败'
  } finally {
    loading.value = false
  }
}

/** 生成唯一名称（静态图标） */
function ensureUniqueName(base: string): string {
  const existing = new Set(staticList.value.map(i => i.name))
  let name = base
  if (!existing.has(name)) return name
  let idx = 1
  while (existing.has(`${name}-${idx}`)) idx++
  return `${name}-${idx}`
}

/** 切换展开 */
/** 添加 Lucide 图标（不分组） */
/**
 * 立即注册并添加 Lucide 图标，保证无需刷新即可预览
 */
/**
 * 解析 Lucide 输入：支持 "Home"、"<Home />"、"<Home>"
 */
function normalizeLucideInput(input: string): string {
  const s = (input || '').trim()
  if (!s) return ''
  const m = s.match(/^<\s*([A-Za-z][A-Za-z0-9_]*)\s*\/?\s*>$/)
  if (m) return m[1]
  return s.replace(/[<>]/g, '')
}

/** 添加 Lucide 图标（支持角标输入） */
/**
 * 处理新增 Lucide 图标流程
 * 返回值：true 表示新增成功并已注册，false 表示失败或未变更
 */
async function addLucideIcon(): Promise<boolean> {
  const name = normalizeLucideInput(newLucideName.value)
  if (!name) { showToast({ type: 'info', message: '请输入图标名称' }); return false }
  if (iconsConfig.value.lucide_icons.includes(name)) { showToast({ type: 'info', message: '该图标已存在' }); return false }
  try {
    const mod = await import('lucide-vue-next')
    const comp = (mod as Record<string, any>)[name]
    if (!comp) { showToast({ type: 'info', message: `未找到 Lucide 图标：${name}` }); return false }
    await registerIcon(name, { component: comp, type: 'lucide', description: `Lucide ${name} icon` })
    iconsConfig.value.lucide_icons.push(name)
  } catch (err: any) {
    showToast({ type: 'info', message: `注册失败：${err?.message || '未知错误'}` })
    return false
  }
  newLucideName.value = ''
  markAsChanged()
  return true
}

/** 打开/关闭静态图标管理面板 */
function openStaticManager(): void { manageStaticVisible.value = true }
function closeStaticManager(): void { manageStaticVisible.value = false }

/** 删除确认弹窗状态 */
const confirm = ref<{ visible: boolean; title: string; message: string; onOk?: () => void; onCancel?: () => void }>({ visible: false, title: '确认操作', message: '' })

/** 打开确认弹窗 */
function openConfirm(options: { title?: string; message: string; onOk?: () => void; onCancel?: () => void }): void {
  confirm.value.title = options.title || '确认操作'
  confirm.value.message = options.message
  confirm.value.onOk = options.onOk
  confirm.value.onCancel = options.onCancel
  confirm.value.visible = true
}

/** 确认与取消回调 */
function confirmOk(): void { const cb = confirm.value.onOk; confirm.value.visible = false; confirm.value.onOk = undefined; cb && cb() }
function confirmCancel(): void { const cb = confirm.value.onCancel; confirm.value.visible = false; confirm.value.onCancel = undefined; cb && cb() }

/** 请求删除 Lucide 图标 */
function requestDeleteLucide(name: string): void {
  openConfirm({ title: '删除图标', message: `确定删除 ${name} 吗？`, onOk: () => deleteLucideIcon(name) })
}

/** 请求删除静态图标 */
function requestDeleteStatic(name: string): void {
  openConfirm({ title: '删除图标', message: `确定删除 ${name} 吗？`, onOk: () => deleteStaticIcon(name) })
}

/**
 * 删除 Lucide 图标
 * 在指定分类数组中移除名称
 */
function deleteLucideIcon(name: string): void {
  const idx = iconsConfig.value.lucide_icons.indexOf(name)
  if (idx >= 0) {
    iconsConfig.value.lucide_icons.splice(idx, 1)
    markAsChanged()
  }
}

/**
 * 删除静态图标
 * 在指定分类列表中移除匹配名称项
 */
function deleteStaticIcon(name: string): void {
  iconsConfig.value.static_icons = iconsConfig.value.static_icons.filter(i => i.name !== name)
  markAsChanged()
}

// 静态图标的改名/上传/删除已迁移至 IconResourcePanel 管理

/** 复制图标名称 */
async function copyIconName(name: string): Promise<void> { try { await navigator.clipboard.writeText(name); showToast({ type: 'success', message: '已复制名称' }) } catch { showToast({ type: 'info', message: '复制失败' }) } }
/** 复制组件用法 */
async function copyIconUsage(name: string): Promise<void> {
  const snippet = `<Icon name="${name}" :size="${iconsConfig.value.config.default_size}" color="primary" />`
  try { await navigator.clipboard.writeText(snippet); showToast({ type: 'success', message: '已复制<Icon>标签，记得引入组件' }) } catch { showToast({ type: 'info', message: '复制失败' }) }
}

/**
 * 保存图标配置
 * 写回 public/config/icons.config.yaml，随后关闭并刷新
 */
async function saveIcons(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const content = stringify({
      lucide_icons: iconsConfig.value.lucide_icons,
      static_icons: iconsConfig.value.static_icons,
      config: iconsConfig.value.config
    })
    await fileManagerService.writeFile('public/config/icons.config.yaml', content)
    hasChanges.value = false
    noticeShown.value = false
    emit('update')
    emit('close')
    window.location.reload()
  } catch (err: any) {
    error.value = err?.message || '保存图标配置失败'
    showToast({ type: 'info', message: '保存失败：' + error.value })
  } finally {
    loading.value = false
  }
}

/** 关闭面板 */
function onRequestClose(): void { emit('close') }

/** 可见性监听与初始化 */
watch(() => props.visible, (v) => { if (v) { loadIcons() } })
onMounted(() => { if (props.visible) { loadIcons() } })

/**
 * 打开新增 Lucide 图标弹窗
 */
function openAddLucideDialog(): void {
  addLucideVisible.value = true
}

/**
 * 弹窗确定：尝试新增并在成功后关闭
 */
async function onAddLucideOk(): Promise<void> {
  const ok = await addLucideIcon()
  if (ok) addLucideVisible.value = false
}

/**
 * 弹窗取消：关闭并清空输入
 */
function onAddLucideCancel(): void {
  addLucideVisible.value = false
  newLucideName.value = ''
}
</script>

<style scoped>
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