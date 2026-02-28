<template>
  <div class="responsive-layout" :class="{ 'responsive-layout--fullscreen': isFullscreen }" :style="themeStyles">
    <!-- 应用设置面板容器：放在侧边栏的左侧，仅在非全屏且面板可见时显示 -->
    <div v-if="isDev && appSettingsVisible && !isFullscreen" class="settings-wrapper">
      <AppSettingsPanel :visible="appSettingsVisible" @close="closeAppSettings" @update="handleAppUpdate" />
    </div>
    <!-- 路由设置面板容器：放在侧边栏的左侧，仅在非全屏且面板可见时显示 -->
    <div v-if="isDev && routeSettingsVisible && !isFullscreen" class="settings-wrapper">
      <RouteSettingsPanel :visible="routeSettingsVisible" @close="closeRouteSettings" @update="handleRouteUpdate" />
    </div>
    <!-- 主题设置面板容器：放在侧边栏的左侧，仅在非全屏且面板可见时显示 -->
    <div v-if="isDev && themeSettingsVisible && !isFullscreen" class="settings-wrapper">
      <ThemeSettingsPanel :visible="themeSettingsVisible" @close="closeThemeSettings" @update="handleThemeUpdate" />
    </div>
    <!-- 图标设置面板容器：放在侧边栏的左侧，仅在非全屏且面板可见时显示 -->
    <div v-if="isDev && iconSettingsVisible && !isFullscreen" class="settings-wrapper">
      <IconSettingsPanel :visible="iconSettingsVisible" @close="closeIconSettings" @update="handleIconUpdate" />
    </div>

    <!-- 响应式侧边栏 -->
    <div class="sidebar-wrapper" :class="{
      'sidebar-wrapper--fullscreen': isFullscreen,
      'sidebar-wrapper--fullscreen-hover': isFullscreen && isSidebarHovered
    }" @mouseenter="handleSidebarMouseEnter" @mouseleave="handleSidebarMouseLeave">
      <ResponsiveSidebar :navigation-items="processedNavigationItems" :app-config="appConfig.app"
        @collapse-change="handleCollapseChange" @open-app-settings="openAppSettings"
        @open-route-settings="openRouteSettings" @open-theme-settings="openThemeSettings"
        @open-icon-settings="openIconSettings" @open-resource-manager="openResourceManager" />
    </div>

    <!-- 全屏模式下的左侧悬停触发区域 -->
    <div v-if="isFullscreen" class="fullscreen-sidebar-trigger" @mouseenter="handleSidebarMouseEnter"
      @mouseleave="handleSidebarMouseLeave"></div>

    <!-- 主内容区域 -->
    <main class="main-content" :class="{
      'main-content--collapsed': isCollapsed,
      'main-content--fullscreen': isFullscreen
    }">
      <!-- 全屏模式下的右上角悬停触发区域 -->
      <div v-if="isFullscreen" class="fullscreen-button-trigger" @mouseenter="handleFullscreenButtonMouseEnter"
        @mouseleave="handleFullscreenButtonMouseLeave"></div>

      <!-- 全屏切换按钮 -->
      <button class="fullscreen-button" :class="{
        'fullscreen-button--fullscreen': isFullscreen
      }" @click.stop="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '进入全屏'"
        @mouseenter="handleFullscreenButtonMouseEnter" @mouseleave="handleFullscreenButtonMouseLeave">
        <Minimize2 v-if="isFullscreen" :size="20" />
        <Maximize2 v-else :size="20" />
      </button>

      <!-- 页面导航按钮 -->
      <div class="page-navigation-buttons" :class="{
        'page-navigation-buttons--fullscreen': isFullscreen
      }" @mouseenter="handleFullscreenButtonMouseEnter" @mouseleave="handleFullscreenButtonMouseLeave">
        <!-- PDF导出按钮 -->
        <button v-if="shouldShowPdfExportButton" class="nav-button nav-button--export" :class="{
          'nav-button--fullscreen': isFullscreen
        }" @click.stop="showPDFExportDialog" title="导出PDF">
          <FileDown :size="16" />
        </button>

        <!-- 编辑按钮 (仅开发模式显示) -->
        <button v-if="isDev" class="nav-button" :class="{
          'nav-button--fullscreen': isFullscreen,
          'nav-button--disabled': !canEditCurrentPage
        }" :disabled="!canEditCurrentPage" @click.stop="openEditModal"
          :title="canEditCurrentPage ? '编辑当前页面' : '当前页面不可编辑'">
          <Pencil :size="16" />
        </button>

        <!-- 上一页按钮 -->
        <button class="nav-button nav-button--previous" :class="{
          'nav-button--disabled': !canGoPrevious,
          'nav-button--fullscreen': isFullscreen
        }" @click.stop="goToPreviousPage" :disabled="!canGoPrevious"
          :title="canGoPrevious ? `上一页 ${getPageTitle(previousPage)}` : '没有上一页'">
          <ChevronLeft :size="16" />
        </button>

        <!-- 下一页按钮 -->
        <button class="nav-button nav-button--next" :class="{
          'nav-button--disabled': !canGoNext,
          'nav-button--fullscreen': isFullscreen
        }" @click.stop="goToNextPage" :disabled="!canGoNext"
          :title="canGoNext ? `下一页 ${getPageTitle(nextPage)}` : '没有下一页'">
          <ChevronRightIcon :size="16" />
        </button>
      </div>

      <!-- 页面内容 -->
      <div class="page-content-wrapper">
        <FixedRatioContainer :is-fullscreen="isFullscreen" :scale="scaleRatio">
          <ErrorBoundary>
            <router-view v-slot="{ Component, route }">
              <transition :name="isExportingPdf ? 'none' : 'page'" :mode="isExportingPdf ? undefined : 'out-in'">
                <component :is="Component" :key="route.path" />
              </transition>
            </router-view>
          </ErrorBoundary>
        </FixedRatioContainer>
      </div>

      <EditorModal v-if="isDev" v-model:visible="isEditModalVisible" title="编辑页面" :widthVw="95" :heightVh="95"
        :showFooter="false" :zIndex="1100">
        <SplitEditorPreview v-if="currentEditFilePath" :filePath="currentEditFilePath" :initialLeftPercent="55"
          :initialAutoSave="true" @saved="handleEditSaved" />
        <div v-else class="w-full h-full flex items-center justify-center text-[12px] text-gray-600">未找到可编辑的页面文件</div>
      </EditorModal>
    </main>

    <!-- PDF导出对话框 -->
    <PDFExportDialog v-model:visible="isPDFExportDialogVisible" @export-start="handlePDFExportStart"
      @export-complete="handlePDFExportComplete" @export-error="handlePDFExportError" />

    <!-- 资源管理弹窗 -->
    <ResourceManagerModal v-if="isDev" v-model:visible="resourceManagerVisible" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  FileDown,
  Pencil
} from 'lucide-vue-next'
import ResponsiveSidebar from '@/layouts/ResponsiveSidebar.vue'
import FixedRatioContainer from '@/layouts/FixedRatioContainer.vue'
import PDFExportDialog from '@/layouts/PDFExportDialog.vue'
import ErrorBoundary from '@/components/common/ErrorBoundary.vue'
import { useMenu } from '@/core/composables/useMenu'
import { usePageNavigation } from '@/core/composables/usePageNavigation'
import { PDFExportService } from '@/core/services/PDFExportService'
import { appConfig } from '@/core/utils/config'
import { loadRouteConfig } from '@/core/utils/config'
import { normalizeViewComponentPath as svcNormalize } from '@/core/services/RouteConfigService'
import { useTheme } from '@/core/composables/useTheme'

const isDev = import.meta.env.DEV

const AppSettingsPanel = isDev ? defineAsyncComponent(() => import('@/layouts/SettingModule/AppSettingsPanel.vue')) : null as any
const RouteSettingsPanel = isDev ? defineAsyncComponent(() => import('@/layouts/SettingModule/RouteSettingsPanel.vue')) : null as any
const ThemeSettingsPanel = isDev ? defineAsyncComponent(() => import('@/layouts/SettingModule/ThemeSettingsPanel.vue')) : null as any
const IconSettingsPanel = isDev ? defineAsyncComponent(() => import('@/layouts/SettingModule/IconSettingsPanel.vue')) : null as any
const ResourceManagerModal = isDev ? defineAsyncComponent(() => import('@/layouts/SettingModule/ResourceManagerModal.vue')) : null as any
const SplitEditorPreview = isDev ? defineAsyncComponent(() => import('@/components/editor/SplitEditorPreview.vue')) : null as any
const EditorModal = isDev ? defineAsyncComponent(() => import('@/components/editor/EditorModal.vue')) : null as any

// 应用配置已迁移到 @/config/app.config.ts

/**
 * 响应式状态
 */
const isCollapsed = ref(false)
const isFullscreen = ref(false)
// 缩放容器已抽取到独立组件处理窗口尺寸
const isSidebarHovered = ref(false)
const isFullscreenButtonHovered = ref(false)
const isPDFExportDialogVisible = ref(false)
// 正在导出PDF的状态
const isExportingPdf = ref(false)
// 应用/路由设置面板可见性
// 初始化在下方通过 sessionStorage 恢复

/**
 * 路由设置面板可见性持久化键
 * 作用：在因新增组件导致的页面刷新后，自动恢复侧边面板的显示状态，配合子组件的编辑器状态恢复。
 */
const APP_SETTINGS_VISIBLE_KEY = 'app-settings-visible'
const ROUTE_SETTINGS_VISIBLE_KEY = 'route-settings-visible'
// 与子组件 RouteSettingsPanel.vue 保持一致的编辑器状态持久化键，用于兜底恢复侧边面板
const EDITOR_STORAGE_KEY = 'route-editor-session-state'

/**
 * 初始化：从 sessionStorage 读取路由设置面板可见状态
 * 目的：避免刷新后丢失侧边面板显示，从而让子组件的编辑器状态恢复逻辑得以执行
 */
const initialAppSettingsVisible = (() => {
  try {
    const raw = sessionStorage.getItem(APP_SETTINGS_VISIBLE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data && typeof data.visible === 'boolean') {
        return !!data.visible
      }
    }
  } catch (e) {
    // 忽略读取异常
  }
  return false
})()

const appSettingsVisible = ref<boolean>(initialAppSettingsVisible)

const initialRouteSettingsVisible = (() => {
  try {
    const raw = sessionStorage.getItem(ROUTE_SETTINGS_VISIBLE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data && typeof data.visible === 'boolean') {
        return !!data.visible
      }
    }
    // 兜底：若编辑器状态存在并标记为可见，则强制展示侧边面板，以便子组件恢复模态框
    const editorRaw = sessionStorage.getItem(EDITOR_STORAGE_KEY)
    if (editorRaw) {
      const ed = JSON.parse(editorRaw)
      if (ed && ed.editor && ed.editor.visible === true) {
        return true
      }
    }
  } catch (e) {
    console.warn('读取路由设置面板可见状态失败:', e)
  }
  return false
})()

const routeSettingsVisible = ref<boolean>(initialRouteSettingsVisible)

// 主题设置面板可见性：从 sessionStorage 恢复
const THEME_SETTINGS_VISIBLE_KEY = 'theme-settings-visible'
const initialThemeSettingsVisible = (() => {
  try {
    const raw = sessionStorage.getItem(THEME_SETTINGS_VISIBLE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data && typeof data.visible === 'boolean') {
        return !!data.visible
      }
    }
  } catch (e) {
    // 忽略读取异常
  }
  return false
})()
const themeSettingsVisible = ref<boolean>(initialThemeSettingsVisible)

// 图标设置面板可见性：从 sessionStorage 恢复
const ICON_SETTINGS_VISIBLE_KEY = 'icon-settings-visible'
const initialIconSettingsVisible = (() => {
  try {
    const raw = sessionStorage.getItem(ICON_SETTINGS_VISIBLE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data && typeof data.visible === 'boolean') {
        return !!data.visible
      }
    }
  } catch (e) {
    // 忽略读取异常
  }
  return false
})()
const iconSettingsVisible = ref<boolean>(initialIconSettingsVisible)
// 资源管理弹窗可见性（不持久化）
const resourceManagerVisible = ref<boolean>(false)

/**
 * 固定比例缩放配置
 */
// 设计尺寸在容器组件默认 1920x1080，这里用于缩放计算保持一致
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080
// 应用/路由/主题/图标设置面板固定宽度（与面板组件一致）
const APP_SETTINGS_WIDTH = 360
const ROUTE_SETTINGS_WIDTH = 360
const THEME_SETTINGS_WIDTH = 360
const ICON_SETTINGS_WIDTH = 360
// 侧边栏宽度（与容器旧逻辑保持一致）
const SIDEBAR_EXPANDED_WIDTH = 280
const SIDEBAR_COLLAPSED_WIDTH = 80
// 非全屏主内容区域的内边距合计（与样式 padding: 2rem 保持一致 -> 2rem * 2 = 64）
const PADDING_SIZE = 64

/**
 * 当前路由和路由器
 */
const router = useRouter()
const currentRoute = useRoute()

/**
 * 使用菜单系统
 */
const { menuConfig } = useMenu()

/**
 * 使用页面导航系统
 */
const {
  previousPage,
  nextPage,
  canGoPrevious,
  canGoNext,
  goToPreviousPage,
  goToNextPage,
  getPageTitle
} = usePageNavigation()

/**
 * 使用主题系统
 */
const { themeStyles } = useTheme()

/**
 * 计算属性：是否显示PDF导出按钮
 */
const shouldShowPdfExportButton = computed(() => {
  return appConfig.value.app.features?.showPdfExportButton ?? true
})

/**
 * 计算属性：处理后的导航项
 */
const processedNavigationItems = computed(() => {
  try {
    return menuConfig?.value?.items || []
  } catch (error) {
    console.warn('获取导航项时出错:', error)
    return []
  }
})

/**
 * 计算属性：缩放比例和样式
 */
// 缩放计算迁移至布局组件，由容器组件仅负责应用传入的缩放比例

/**
 * 窗口尺寸变化处理
 */
/**
 * 屏幕尺寸
 */
const screenWidth = ref(window.innerWidth)
const screenHeight = ref(window.innerHeight)

/**
 * 窗口尺寸变化处理
 * 功能：更新屏幕尺寸以触发缩放计算
 */
const handleResize = (): void => {
  screenWidth.value = window.innerWidth
  screenHeight.value = window.innerHeight
}

/**
 * 处理侧边栏折叠状态变化
 */
const handleCollapseChange = (collapsed: boolean): void => {
  isCollapsed.value = collapsed
}

/**
 * 打开路由设置面板
 */
const openRouteSettings = (): void => {
  routeSettingsVisible.value = true
}

/**
 * 打开应用设置面板
 */
const openAppSettings = (): void => {
  appSettingsVisible.value = true
}

/**
 * 关闭路由设置面板
 */
const closeRouteSettings = (): void => {
  routeSettingsVisible.value = false
}

/**
 * 关闭应用设置面板
 */
const closeAppSettings = (): void => {
  appSettingsVisible.value = false
}

/**
 * 路由配置更新处理
 * 说明：面板内部保存成功后会触发 update，并随后关闭及刷新页面。
 */
const handleRouteUpdate = (): void => {
  // 这里可以根据需要添加额外逻辑，例如刷新局部状态等。
  // 当前逻辑由面板内部执行 window.location.reload() 刷新页面。
}

/**
 * 应用配置更新处理
 */
const handleAppUpdate = (): void => {
  // 应用配置保存与刷新由面板内部完成
}

/**
 * 打开主题设置面板
 */
const openThemeSettings = (): void => {
  themeSettingsVisible.value = true
}

/**
 * 关闭主题设置面板
 */
const closeThemeSettings = (): void => {
  themeSettingsVisible.value = false
}

/**
 * 打开图标设置面板
 */
const openIconSettings = (): void => {
  iconSettingsVisible.value = true
}

/** 打开资源管理弹窗 */
const openResourceManager = (): void => {
  resourceManagerVisible.value = true
}

/**
 * 关闭图标设置面板
 */
const closeIconSettings = (): void => {
  iconSettingsVisible.value = false
}

/**
 * 图标配置更新处理
 */
const handleIconUpdate = (): void => {
  // 图标保存与刷新由面板内部完成
}

/**
 * 主题配置更新处理
 */
const handleThemeUpdate = (): void => {
  // 主题保存与刷新由面板内部完成
}



/**
 * 处理侧边栏鼠标进入事件
 */
const handleSidebarMouseEnter = (): void => {
  if (isFullscreen.value) {
    isSidebarHovered.value = true
  }
}

/**
 * 处理侧边栏鼠标离开事件
 */
const handleSidebarMouseLeave = (): void => {
  if (isFullscreen.value) {
    isSidebarHovered.value = false
  }
}

/**
 * 处理全屏按钮鼠标进入事件
 */
const handleFullscreenButtonMouseEnter = (): void => {
  if (isFullscreen.value) {
    isFullscreenButtonHovered.value = true
  }
}

/**
 * 处理全屏按钮鼠标离开事件
 */
const handleFullscreenButtonMouseLeave = (): void => {
  if (isFullscreen.value) {
    isFullscreenButtonHovered.value = false
  }
}

/**
 * 切换全屏模式
 */
const toggleFullscreen = async (): Promise<void> => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  } catch (error) {
    console.error('全屏API调用失败:', error)
    // 如果全屏API失败，手动重置状态
    isFullscreen.value = !!document.fullscreenElement
  }
}

/**
 * 键盘事件处理
 */
const handleKeydown = (event: KeyboardEvent): void => {
  // F11 键处理（全局有效）
  if (event.key === 'F11') {
    event.preventDefault()
    toggleFullscreen()
    return
  }

  // 只在全屏模式下处理其他键盘事件
  if (!isFullscreen.value) return

  // 防止在输入框等元素中触发
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return
  }

  switch (event.key) {
    case 'PageDown':
    case 'ArrowRight':
    case ' ': // 空格键
      event.preventDefault()
      goToNextPage()
      break
    case 'PageUp':
    case 'ArrowLeft':
      event.preventDefault()
      goToPreviousPage()
      break
  }
}

/**
 * 全屏状态变化监听
 */
const handleFullscreenChange = (): void => {
  isFullscreen.value = !!document.fullscreenElement

  // 退出全屏时重置悬停状态
  if (!isFullscreen.value) {
    isSidebarHovered.value = false
    isFullscreenButtonHovered.value = false
  }
}

/**
 * 显示PDF导出对话框
 */
const showPDFExportDialog = (): void => {
  isPDFExportDialogVisible.value = true
}

/**
 * 处理PDF导出开始事件
 */
const handlePDFExportStart = (): void => {
  console.log('PDF导出开始')
  isExportingPdf.value = true
}

/**
 * 处理PDF导出完成事件
 * @param result 导出结果
 */
const handlePDFExportComplete = (result: any): void => {
  console.log('PDF导出完成:', result)
  isExportingPdf.value = false
}

/**
 * 处理PDF导出错误事件
 * @param error 错误信息
 */
const handlePDFExportError = (error: Error): void => {
  console.error('PDF导出失败:', error)
  isExportingPdf.value = false
}

/**
 * 组件挂载
 */
onMounted(() => {
  // 设置PDF导出服务的路由实例
  const pdfExportService = PDFExportService.getInstance()
  pdfExportService.setRouter(router)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('keydown', handleKeydown)

  // 初始化窗口尺寸并监听变化，用于缩放计算
  handleResize()
  window.addEventListener('resize', handleResize)
})

/**
 * 监听侧边栏状态变化，重新计算缩放比例
 */
watch([isCollapsed, isFullscreen], () => {
  // 状态变化时触发重新计算
  // 缩放比例会通过计算属性自动更新
}, { immediate: true })

/**
 * 组件卸载
 */
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleResize)
})

/* 移除 mounted 恢复逻辑，改为在 setup 阶段初始化，避免 watch(immediate) 覆盖 */

/**
 * 侦听路由设置面板可见性并持久化
 * 目的：当用户打开面板后，若页面因新增文件而刷新，刷新后仍保持面板打开，从而触发子组件的编辑器恢复逻辑。
 */
watch(routeSettingsVisible, (visible) => {
  try {
    sessionStorage.setItem(ROUTE_SETTINGS_VISIBLE_KEY, JSON.stringify({ visible }))
  } catch (e) {
    // 忽略持久化异常
  }
})

watch(appSettingsVisible, (visible) => {
  try {
    sessionStorage.setItem(APP_SETTINGS_VISIBLE_KEY, JSON.stringify({ visible }))
  } catch (e) {
    // 忽略持久化异常
  }
})

watch(themeSettingsVisible, (visible) => {
  try {
    sessionStorage.setItem(THEME_SETTINGS_VISIBLE_KEY, JSON.stringify({ visible }))
  } catch (e) {
    // 忽略持久化异常
  }
})

watch(iconSettingsVisible, (visible) => {
  try {
    sessionStorage.setItem(ICON_SETTINGS_VISIBLE_KEY, JSON.stringify({ visible }))
  } catch (e) {
    // 忽略持久化异常
  }
})

// 资源管理弹窗无需持久化
/**
 * 计算额外左侧占位宽度（各设置面板的总宽度）
 */
const extraLeftWidth = computed(() => {
  if (isFullscreen.value) return 0
  let total = 0
  if (appSettingsVisible.value) total += APP_SETTINGS_WIDTH
  if (routeSettingsVisible.value) total += ROUTE_SETTINGS_WIDTH
  if (themeSettingsVisible.value) total += THEME_SETTINGS_WIDTH
  if (iconSettingsVisible.value) total += ICON_SETTINGS_WIDTH
  return total
})

/**
 * 计算缩放比例
 * 说明：根据屏幕尺寸与布局占位计算最适合的等比缩放比例，最大不超过3倍
 */
const scaleRatio = computed(() => {
  const sidebarWidth = isCollapsed.value ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH
  let availableWidth: number
  let availableHeight: number

  if (isFullscreen.value) {
    availableWidth = screenWidth.value
    availableHeight = screenHeight.value
  } else {
    availableWidth = screenWidth.value - sidebarWidth - PADDING_SIZE - extraLeftWidth.value
    availableHeight = screenHeight.value - PADDING_SIZE
  }

  const scaleX = availableWidth / DESIGN_WIDTH
  const scaleY = availableHeight / DESIGN_HEIGHT
  return Math.min(scaleX, scaleY, 3)
})

/**
 * 计算属性：当前页面是否可编辑
 */
const canEditCurrentPage = computed(() => {
  const name = String(currentRoute.name || '')
  return name !== 'NotFound'
})

/**
 * 状态：编辑弹窗与当前编辑文件路径
 */
const isEditModalVisible = ref<boolean>(false)
const currentEditFilePath = ref<string>('')

/**
 * 打开编辑弹窗
 */
const openEditModal = async (): Promise<void> => {
  if (!canEditCurrentPage.value) return
  currentEditFilePath.value = await resolveComponentPathForCurrentRoute()
  isEditModalVisible.value = true
}

/**
 * 关闭编辑弹窗
 */
const closeEditModal = (): void => {
  isEditModalVisible.value = false
}

/**
 * 保存回调：可按需刷新或提示
 */
const handleEditSaved = (_path: string): void => {
  // 目前依赖 HMR 刷新，保留占位以便后续扩展
}

/**
 * 解析当前路由对应的组件文件路径（返回 'src/...'）
 */
/**
 * 解析当前路由对应的组件文件路径（返回 'src/...'）
 * 优先使用唯一的路由名称进行匹配，避免子路由同名但父路由不同导致误匹配；
 * 若名称缺失则回退到完整路径精确匹配（移除查询与哈希并规范化斜杠）。
 */
async function resolveComponentPathForCurrentRoute(): Promise<string> {
  try {
    const routeConfig = await loadRouteConfig()
    const normalizePath = (p: string): string => {
      const base = String(p || '').split('#')[0].split('?')[0]
      return base.replace(/\/+$/, '')
    }
    const curPath = normalizePath(currentRoute.path || '')
    const segments = curPath.split('/').filter(Boolean)
    if (segments.length === 0) return ''
    const parentSeg = segments[0]
    for (const r of routeConfig.routes || []) {
      if (String(r.route) === parentSeg) {
        if (segments.length === 1) {
          return svcNormalize(r.component)
        }
        const childSeg = segments[1]
        if (Array.isArray(r.children)) {
          const matchedChild = r.children.find(c => String(c.route) === childSeg)
          if (matchedChild) {
            return svcNormalize(matchedChild.component)
          }
        }
        return ''
      }
    }
  } catch { }
  return ''
}
</script>

<style scoped>
/* 路由设置面板容器样式：左侧固定宽度，与面板宽度一致 */
.settings-wrapper {
  width: 360px;
  flex: 0 0 360px;
  /* 固定宽度，不参与收缩 */
  height: 100vh;
  border-right: 1px solid #e5e7eb;
  /* gray-200 */
  background: #ffffff;
  z-index: 101;
  /* 高于侧边栏基础层级 */
}

/* 响应式布局容器 - 固定比例模式 */
.responsive-layout {
  display: flex;
  height: 100vh;
  background-color: #f8fafc;
  transition: background-color 0.3s ease;
  overflow: hidden;
}

/* 全屏模式下的布局 */
.responsive-layout--fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: white;
}

/* 侧边栏包装器 */
.sidebar-wrapper {
  position: relative;
  z-index: 100;
}

/* 全屏模式下的侧边栏包装器 */
.sidebar-wrapper--fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
}

/* 全屏模式下鼠标悬停时显示侧边栏 */
.sidebar-wrapper--fullscreen-hover {
  transform: translateX(0);
}

/* 全屏模式下侧边栏悬停触发区域 */
.sidebar-wrapper--fullscreen::before {
  content: '';
  position: absolute;
  top: 0;
  right: -20px;
  width: 20px;
  height: 100%;
  background: transparent;
  z-index: 101;
}

/* 全屏模式下的左侧悬停触发区域 */
.fullscreen-sidebar-trigger {
  position: fixed;
  top: 0;
  left: 0;
  width: 20px;
  height: 100vh;
  background: transparent;
  z-index: 101;
  cursor: pointer;
}

/* 主内容区域 - 固定比例缩放模式 */
.main-content {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  background: #f8fafc;
  padding: 2rem;
  box-sizing: border-box;
}



.fullscreen-button {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 102;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}

/* 全屏模式下的控制按钮 */
.fullscreen-button--fullscreen {
  z-index: 102;
  opacity: 0;
  background: transparent;
  border: 1px solid transparent;
  color: rgba(255, 255, 255, 0.5);
}

/* 按钮悬停效果 */
.fullscreen-button:hover {
  opacity: 1;
  transform: scale(1.05);
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.9);
  color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.fullscreen-button--fullscreen:hover {
  opacity: 1;
  transform: scale(1.05);
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.9);
  color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* 页面导航按钮 */
.page-navigation-buttons {
  position: fixed;
  top: 4rem;
  right: 1rem;
  z-index: 101;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.page-navigation-buttons--fullscreen {
  z-index: 102;
  opacity: 0;
  background: transparent;
  border: 1px solid transparent;
  color: rgba(255, 255, 255, 0.5);
}

.page-navigation-buttons--fullscreen:hover {
  opacity: 1;
}

/* 导航按钮样式 */
.nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}

.nav-button:hover:not(.nav-button--disabled) {
  transform: scale(1.05);
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.9);
  color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.nav-button--fullscreen {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.5);
}

.nav-button--fullscreen:hover:not(.nav-button--disabled) {
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.9);
  color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.nav-button--disabled {
  opacity: 0.3;
  cursor: not-allowed;
  transform: none !important;
}

.nav-button--disabled:hover {
  background: rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: rgba(0, 0, 0, 0.6);
  box-shadow: none;
}

.nav-button--fullscreen.nav-button--disabled:hover {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.5);
}

/* 主内容区域全屏状态 */
.main-content--fullscreen {
  margin-left: 0;
  width: 100vw;
  height: 100vh;
  position: relative;
  z-index: 99;
  padding: 0;
  /* 全屏模式下不设置padding，让内容完全占满屏幕 */
  /* 在全屏模式下保持居中对齐 */
  justify-content: center;
  align-items: center;
}

/* 页面内容 - 固定比例缩放容器 */
.page-content-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* --- 页面过渡动画 --- */

/* 定义过渡期间的共享样式。
  这是动画的核心，指定了动画的属性、时长和缓动曲线。
*/
.page-enter-active,
.page-leave-active {
  /* 直接将动画时长设置为 0.4s。
    为了获得最佳性能，我们明确指定只对 opacity 和 transform 属性进行过渡。
  */
  transition: opacity 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  /* 确保在动画播放期间，元素是可见的，否则动画不会播放 */
  visibility: visible;
}

/* 定义“进入”动画的起始状态。
  页面将从这个状态开始，动画播放到其默认样式。
*/
.page-enter-from {
  opacity: 0;
  transform: translateX(30px);
  /* 从右侧 30px 的位置开始进入 */
}

/* 定义“离开”动画的结束状态。
  页面将从其默认样式开始，动画播放到这个状态。
*/
.page-leave-to {
  opacity: 0;
  transform: translateX(-30px);
  /* 向左侧 -30px 的位置移出 */
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-content-wrapper {
    padding: 1rem;
  }
}
</style>
