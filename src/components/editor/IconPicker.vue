<!--
  文件用途：图标选择器组件（IconPicker.vue）
  主要功能：
  - 加载并展示 public/config/icons.config.yaml 中已注册的 Lucide 与静态图标
  - 支持搜索过滤、点击选择并通过 v-model 返回所选图标名称
  - 支持复制图标名称与用法片段
  规则遵循：
  - Vue@3 + TypeScript@5 + Vite@5，样式使用 Tailwind CSS@3
  - 禁止使用 !important 与渐变色；单文件不超过 1000 行
-->

<template>
  <div class="flex flex-col gap-3 w-full h-full">
    <!-- 头部：搜索栏与状态 -->
    <div class="flex items-center gap-2">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索图标名称（Lucide/静态）"
        class="px-2 py-1.5 text-[14px] border border-gray-300 rounded-md bg-white text-gray-700 w-full"
      />
      <span class="text-[12px] text-gray-500 shrink-0">{{ totalCount }} 个</span>
    </div>

    <!-- 加载与错误状态 -->
    <div v-if="loading" class="flex items-center gap-2 text-gray-600">
      <div class="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
      <span>加载中...</span>
    </div>
    <div v-else-if="error" class="flex items-center gap-2 text-red-500">
      <span>{{ error }}</span>
      <button @click="loadIcons" class="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">重试</button>
    </div>

    <!-- 内容：图标网格 -->
    <div v-else class="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded-md bg-white p-2">
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        <div
          v-for="it in filteredAllList"
          :key="it.key"
          class="flex items-center gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
          :class="isSelected(it.name) ? 'ring-2 ring-blue-400' : ''"
          @click="selectIcon(it)"
        >
          <Icon
            :name="it.name"
            :size="30"
            :stroke-width="iconsConfig.config.default_stroke_width"
            class="text-gray-700"
          />
          <div class="flex flex-col min-w-0">
            <span class="text-[12px] text-gray-800 truncate" :title="it.name">{{ it.name }}</span>
            <div class="flex items-center gap-1">
              <span
                class="text-[11px] px-1 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200"
              >{{ it.type === 'lucide' ? 'Lucide' : '静态' }}</span>
            </div>
          </div>
          <div class="ml-auto flex items-center gap-1">
            <button
              @click.stop="copyIconName(it.name)"
              class="flex items-center justify-center w-6 h-6 p-0 border-0 bg-transparent text-gray-600 rounded-md cursor-pointer hover:bg-gray-100"
              title="复制名称"
            >
              <Copy :size="14" />
            </button>
            <button
              @click.stop="copyIconUsage(it.name)"
              class="flex items-center justify-center w-6 h-6 p-0 border-0 bg-transparent text-gray-600 rounded-md cursor-pointer hover:bg-gray-100"
              title="复制用法"
            >
              <Files :size="14" />
            </button>
          </div>
        </div>
      </div>
      <div v-if="filteredAllList.length === 0" class="text-center py-8 text-gray-500">暂无匹配图标</div>
    </div>
  </div>
  
</template>

<script setup lang="ts">
/**
 * IconPicker.vue
 * 文档用途：可搜索的图标选择器组件，加载 YAML 配置并提供点击选择能力。
 * 功能：搜索、预览、复制名称与用法，v-model 返回所选图标名称。
 */
import { ref, computed, onMounted, watch } from 'vue'
import { Copy, Files } from 'lucide-vue-next'
import Icon from '@/components/layout/contentcommon/Icon.vue'
import { fileManagerService } from '@/core/services/FileManagerService'
import { useToast } from '@/core/composables/useToast'
import { parse } from 'yaml'

/** 组件属性 */
interface Props {
  modelValue?: string | null
}
/** 组件事件 */
interface Emits {
  (e: 'update:modelValue', v: string | null): void
  (e: 'select', payload: { name: string; type: 'lucide' | 'static'; src?: string }): void
}
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
const searchQuery = ref('')
const { showToast } = useToast()

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

/**
 * 计算属性：原始列表
 * 返回 YAML 中的 lucide 与 static 列表
 */
const lucideList = computed(() => iconsConfig.value.lucide_icons || [])
const staticList = computed(() => iconsConfig.value.static_icons || [])

/**
 * 计算属性：合并并附带类型与 key
 */
const allList = computed(() => {
  const a: Array<{ name: string; type: 'lucide' | 'static'; src?: string; key: string }> = []
  for (const n of lucideList.value) a.push({ name: n, type: 'lucide', key: `l:${n}` })
  for (const s of staticList.value) a.push({ name: s.name, type: 'static', src: s.src, key: `s:${s.name}` })
  return a
})

/**
 * 计算属性：搜索过滤
 */
const filteredAllList = computed(() => {
  const q = (searchQuery.value || '').trim().toLowerCase()
  if (!q) return allList.value
  return allList.value.filter(it => it.name.toLowerCase().includes(q))
})

/** 总数量 */
const totalCount = computed(() => allList.value.length)

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
    // Lucide：兼容数组或分组对象
    if (Array.isArray(cfg?.lucide_icons)) {
      normalized.lucide_icons = cfg.lucide_icons.filter((x: any) => typeof x === 'string')
    } else {
      for (const arr of Object.values(cfg?.lucide_icons || {})) {
        const list = Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : []
        normalized.lucide_icons.push(...list)
      }
      normalized.lucide_icons = Array.from(new Set(normalized.lucide_icons))
    }
    // Static：兼容数组或分组对象，并去重 name
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
      const seen = new Set<string>()
      normalized.static_icons = normalized.static_icons.filter(it => {
        if (seen.has(it.name)) return false
        seen.add(it.name)
        return true
      })
    }
    iconsConfig.value = normalized
  } catch (err: any) {
    error.value = err?.message || '加载图标配置失败'
  } finally {
    loading.value = false
  }
}

/**
 * 判断是否选中
 */
function isSelected(name: string): boolean {
  return (props.modelValue ?? null) === name
}

/**
 * 选择图标并回传
 */
function selectIcon(it: { name: string; type: 'lucide' | 'static'; src?: string }): void {
  emit('update:modelValue', it.name)
  emit('select', { name: it.name, type: it.type, src: it.src })
}

/**
 * 复制图标名称
 */
async function copyIconName(name: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(name)
    showToast({ type: 'success', message: '已复制名称' })
  } catch {
    showToast({ type: 'info', message: '复制失败' })
  }
}

/**
 * 复制组件用法片段
 */
async function copyIconUsage(name: string): Promise<void> {
  const snippet = `<Icon name="${name}" :size="${iconsConfig.value.config.default_size}" color="primary" />`
  try {
    await navigator.clipboard.writeText(snippet)
    showToast({ type: 'success', message: '已复制<Icon>标签，记得引入组件' })
  } catch {
    showToast({ type: 'info', message: '复制失败' })
  }
}

/**
 * 初始化加载
 */
onMounted(() => { loadIcons() })
watch(() => props.modelValue, () => { /* 保留：外部变更时无需特殊处理 */ })
</script>

<style scoped>
/* 自定义滚动条，仅限内部滚动容器 */
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