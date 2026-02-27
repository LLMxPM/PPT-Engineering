<!--
  文件用途：基础设置面板（AppSettingsPanel.vue）
  主要功能：
  - 静态侧边面板展示与编辑 public/config/app.config.yaml
  - 支持编辑应用图标、标题、基础地址以及功能开关（PDF导出按钮）
  - 使用轻量提示与禁用保存状态，避免浏览器原生 prompt/alert/confirm
  规则遵循：
  - Vue@3 + TypeScript@5 + Vite@5，样式使用 Tailwind CSS@3
  - 禁止使用 !important 与渐变色；单文件不超过 1000 行
-->

<template>
  <!-- 非全屏下作为静态容器渲染，由父布局控制显示与位置 -->
  <div v-if="visible" class="bg-blue-50/50 h-screen w-[360px] flex flex-col border-r border-gray-200">
    <!-- 头部 -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-blue-50 h-[60px]">
      <h2 class="text-[20px] font-semibold text-gray-900 m-0">基础设置</h2>
      <div class="flex items-center gap-2">
        <button @click="saveConfig" :disabled="!hasChanges"
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
        <button @click="loadConfig"
          class="px-4 py-2 bg-blue-500 text-white border-0 rounded-md cursor-pointer hover:bg-blue-600">重试</button>
      </div>

      <!-- 配置编辑器 -->
      <div v-else>
        <!-- 应用基本信息 -->
        <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[16px] font-semibold text-gray-900">应用基本信息</span>
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-[14px] text-gray-600">应用图标（图标系统名称）</label>
            <div class="flex items-center gap-2">
              <Icon :name="config.app.icon" class="text-blue-600 flex-shrink-0 transition-all duration-200"
                :size="24" />
              <input type="text"
                class="flex-1 px-2 py-1.5 text-[14px] border border-gray-300 rounded-md bg-white text-gray-700"
                v-model="config.app.icon" @input="markAsChanged" placeholder="请输入图标名称" />
              <button @click="openIconPicker"
                class="px-1 py-1.5 text-[14px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">选择图标</button>
            </div>

            <label class="text-[14px] text-gray-600">应用标题</label>
            <input type="text"
              class="w-full px-2 py-1.5 text-[14px] border border-gray-300 rounded-md bg-white text-gray-700"
              v-model="config.app.title" @input="markAsChanged" placeholder="例如：PPT-Engineering" />

            <label class="text-[14px] text-gray-600">基础地址（baseUrl）</label>
            <input type="text"
              class="w-full px-2 py-1.5 text-[14px] border border-gray-300 rounded-md bg-white text-gray-700"
              v-model="config.app.baseUrl" @input="markAsChanged" placeholder="例如：/ 或 /PPT-Engineering/" />
          </div>
        </div>

        <!-- 功能特性开关 -->
        <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[16px] font-semibold text-gray-900">功能特性</span>
          </div>
          <label class="flex items-center gap-2 text-[14px] text-gray-700 mb-3">
            <input type="checkbox" class="w-4 h-4 cursor-pointer" v-model="config.app.features.showPdfExportButton"
              @change="markAsChanged" />
            <span>显示 PDF 导出按钮</span>
          </label>

          <div class="flex flex-col gap-2">
            <span class="text-[14px] text-gray-600">侧边栏菜单展示模式</span>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 text-[14px] text-gray-700 cursor-pointer">
                <input type="radio" value="text" v-model="config.app.features.menuMode" @change="markAsChanged"
                  class="w-4 h-4 text-blue-600 cursor-pointer" />
                <span>普通文本</span>
              </label>
              <label class="flex items-center gap-2 text-[14px] text-gray-700 cursor-pointer">
                <input type="radio" value="preview" v-model="config.app.features.menuMode" @change="markAsChanged"
                  class="w-4 h-4 text-blue-600 cursor-pointer" />
                <span>预览缩略图</span>
              </label>
            </div>
            <span class="text-[12px] text-gray-400">开启预览模式后，侧边栏无子路由页面将显示页面微缩图</span>
          </div>
        </div>

        <!-- 提示 -->
        <div class="text-[11px] text-gray-500">保存后会刷新页面，配置通过 YAML 加载到运行时</div>
      </div>
    </div>
  </div>
  <EditorModal :visible="iconPickerVisible" :title="'选择应用图标'" :widthVw="70" :heightVh="80" :zIndex="104"
    :showFooter="false" @update:visible="v => { if (!v) iconPickerVisible = false }"
    @cancel="() => { iconPickerVisible = false }">
    <div class="h-[calc(80vh-100px)]">
      <IconPicker v-model="config.app.icon" @select="handleIconSelected" />
    </div>
  </EditorModal>
</template>

<script setup lang="ts">
/**
 * AppSettingsPanel.vue
 * 文档用途：静态“基础设置”面板组件，编辑 public/config/app.config.yaml。
 * 提供：应用图标、标题、基础地址及功能开关的编辑；保存后刷新页面。
 */
import { ref, onMounted, watch } from 'vue'
import { X, Save } from 'lucide-vue-next'
import { fileManagerService } from '@/core/services/FileManagerService'
import { parse, stringify } from 'yaml'
import { useToast } from '@/core/composables/useToast'
import EditorModal from '@/components/editor/EditorModal.vue'
import IconPicker from '@/components/editor/IconPicker.vue'
import Icon from '@/components/layout/contentcommon/Icon.vue'

/** 组件属性 */
interface Props { visible: boolean }
/** 组件事件 */
interface Emits { (e: 'close'): void;(e: 'update'): void }
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

/** 配置类型定义 */
interface AppFeatures { showPdfExportButton?: boolean; menuMode?: 'text' | 'preview' }
interface AppInfo {
  icon: string
  title: string
  version?: string
  description?: string
  baseUrl?: string
  features: AppFeatures
}
interface AppConfigFile { app: AppInfo }

/** 本地状态 */
const loading = ref(false)
const error = ref('')
const hasChanges = ref(false)
const { showToast } = useToast()
const noticeShown = ref(false)
/** 图标选择弹窗可见性 */
const iconPickerVisible = ref(false)

/** 配置对象 */
const config = ref<AppConfigFile>({ app: { icon: '', title: '', baseUrl: '/', features: { showPdfExportButton: true, menuMode: 'text' } } })

/**
 * 标记更改
 */
function markAsChanged(): void {
  hasChanges.value = true
  if (!noticeShown.value) {
    showToast({ type: 'info', message: '更改已暂存，需要保存才能生效' })
    noticeShown.value = true
  }
}

/**
 * 打开图标选择器弹窗
 */
function openIconPicker(): void {
  iconPickerVisible.value = true
}

/**
 * 处理从图标选择器选择的图标并回填
 */
function handleIconSelected(payload: { name: string; type: 'lucide' | 'static'; src?: string }): void {
  config.value.app.icon = payload.name
  markAsChanged()
  iconPickerVisible.value = false
}

/**
 * 加载应用配置
 * 读取 public/config/app.config.yaml 并解析到本地状态
 */
async function loadConfig(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const content = await fileManagerService.readFile('public/config/app.config.yaml')
    const cfg = parse(content) as AppConfigFile
    const normalized: AppConfigFile = {
      app: {
        icon: cfg?.app?.icon || '',
        title: cfg?.app?.title || '',
        version: cfg?.app?.version || '',
        description: cfg?.app?.description || '',
        baseUrl: cfg?.app?.baseUrl || '/',
        features: {
          showPdfExportButton: cfg?.app?.features?.showPdfExportButton ?? true,
          menuMode: cfg?.app?.features?.menuMode || 'text'
        }
      }
    }
    config.value = normalized
  } catch (err: any) {
    error.value = err?.message || '加载应用配置失败'
  } finally {
    loading.value = false
  }
}

/**
 * 保存应用配置
 * 写回 public/config/app.config.yaml，随后关闭并刷新
 */
async function saveConfig(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const content = stringify({ app: config.value.app })
    await fileManagerService.writeFile('public/config/app.config.yaml', content)
    hasChanges.value = false
    noticeShown.value = false
    emit('update')
    emit('close')
    window.location.reload()
  } catch (err: any) {
    error.value = err?.message || '保存应用配置失败'
    showToast({ type: 'info', message: '保存失败：' + error.value })
  } finally {
    loading.value = false
  }
}

/**
 * 关闭面板
 */
function onRequestClose(): void { emit('close') }

/**
 * 初始化与监听
 */
watch(() => props.visible, (v) => { if (v) { loadConfig() } })
onMounted(() => { if (props.visible) { loadConfig() } })
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