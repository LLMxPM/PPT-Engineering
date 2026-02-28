<template>
  <div class="relative z-[100]">
    <aside
      class="relative h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out z-[999] shadow-md"
      :class="isCollapsed ? 'w-16' : 'w-[280px]'">
      <div class="p-6 px-4 border-b border-gray-200 flex items-center justify-between h-[60px] bg-gray-50">
        <div class="flex-1 flex items-center justify-center">
          <transition name="logo-fade" mode="out-in">
            <div v-if="!isCollapsed" key="title" class="flex items-center justify-center gap-3">
              <Icon v-if="appConfig.icon" :name="appConfig.icon"
                class="text-blue-600 flex-shrink-0 transition-all duration-200" :size="24" />
              <h1 class="text-[22px] font-bold text-gray-900 m-0 text-center">
                {{ appConfig.title }}
              </h1>
            </div>
            <div v-else key="icon"
              class="w-10 h-10 bg-slate-50 text-blue-500 rounded-xl flex items-center justify-center font-bold text-[20px] cursor-pointer transition-all duration-200 shadow-sm border border-slate-200 hover:scale-105 hover:bg-slate-100 hover:text-blue-600 hover:shadow-md hover:border-slate-300"
              :title="appConfig.title">
              <Icon v-if="appConfig.icon" :name="appConfig.icon" :size="20" />
              <span v-else>
                {{ appConfig.title.charAt(0).toUpperCase() }}
              </span>
            </div>
          </transition>
        </div>

        <button
          class="bg-transparent border-none cursor-pointer p-2 rounded-lg text-gray-500 transition-all duration-200 flex items-center justify-center hover:text-gray-700 hover:scale-110"
          @click="toggleCollapse" :title="isCollapsed ? '展开侧边栏' : '收起侧边栏'">
          <ChevronLeft :size="20" :class="isCollapsed ? 'rotate-180' : ''" class="transition-transform duration-300" />
        </button>
      </div>

      <nav class="flex-1 overflow-hidden">
        <div
          class="h-full overflow-y-auto overflow-x-hidden p-4 py-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
          :class="isCollapsed ? 'scrollbar-none' : ''">
          <ul class="list-none m-0 p-0">
            <li v-for="item in navigationItems" :key="item.path" class="mb-1">
              <div v-if="item.children && item.children.length > 0" class="relative">
                <div class="relative" @mouseenter="isCollapsed ? showHoverMenu(item.path, $event) : null"
                  @mouseleave="isCollapsed ? hideHoverMenu() : null">
                  <div
                    class="flex items-center text-gray-500 no-underline rounded-xl transition-all duration-200 relative mx-2 cursor-pointer"
                    :class="[
                      isPreviewMode
                        ? (hasActiveChildRoute(item) ? 'text-blue-600 font-bold text-xs py-2 px-4 uppercase tracking-wider' : 'text-gray-400 font-bold text-xs py-2 px-4 uppercase tracking-wider hover:text-gray-600')
                        : 'py-3 px-4 font-medium ' + (isActiveRoute(item.path)
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50 hover:bg-blue-600 hover:text-white' + (isCollapsed ? '' : ' hover:translate-x-1')
                          : hasActiveChildRoute(item)
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300' + (isCollapsed ? '' : ' hover:translate-x-1')
                            : 'hover:bg-gray-100 hover:text-gray-700' + (isCollapsed ? ' hover:scale-110' : ' hover:translate-x-1')),
                      isCollapsed ? (isPreviewMode ? 'justify-center p-2 mx-2' : 'justify-center p-3 mx-2') : ''
                    ]" @click="handleNavClick(item)">
                    <div v-if="isCollapsed"
                      class="flex items-center justify-center flex-shrink-0 font-bold text-[16px] text-gray-500 w-5 h-5">
                      {{ item.title.charAt(0).toUpperCase() }}
                    </div>
                    <span v-if="!isCollapsed" class="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                      {{ item.title }}
                    </span>
                    <ChevronDown v-if="!isCollapsed && item.children.length > 0"
                      class="ml-auto transition-transform duration-300 flex-shrink-0"
                      :class="isMenuExpanded(item.path) ? 'rotate-180' : ''" :size="isPreviewMode ? 14 : 16" />
                  </div>

                  <Teleport to="body">
                    <div v-if="isCollapsed && hoverMenuVisible === item.path"
                      class="pointer-events-auto animate-[hoverMenuFadeIn_0.2s_ease-out]" :style="{
                        position: 'fixed',
                        top: hoverMenuPosition.top + 'px',
                        left: hoverMenuPosition.left + 'px',
                        zIndex: 9999
                      }" @mouseenter="keepHoverMenu" @mouseleave="hideHoverMenu">
                      <div
                        class="bg-white border border-gray-200 rounded-xl shadow-xl p-4 min-w-[200px] max-w-[280px] whitespace-nowrap">
                        <div class="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">{{ item.title }}
                        </div>
                        <ul class="list-none m-0 p-0">
                          <li v-for="child in item.children" :key="child.path">
                            <router-link :to="child.path"
                              class="flex items-center py-2 px-3 text-gray-500 no-underline rounded-lg transition-all duration-200 text-[14px] hover:bg-gray-100 hover:text-gray-700"
                              :class="isActiveRoute(child.path) ? 'bg-blue-500 text-white hover:bg-blue-600 hover:text-white' : ''">
                              {{ child.title }}
                            </router-link>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </Teleport>
                </div>

                <transition name="submenu-slide">
                  <ul v-if="isMenuExpanded(item.path) && !isCollapsed"
                    class="list-none mt-2 mb-0 mx-0 p-1 py-0 bg-gray-50 rounded-xl overflow-hidden">
                    <li v-for="child in item.children" :key="child.path" class="m-0">
                      <div
                        @mouseenter="isPreviewMode ? showSimpleTooltip(child.title, $event) : showPreviewTooltip(child, $event)"
                        @mouseleave="isPreviewMode ? hideSimpleTooltip() : hidePreviewTooltip()">
                        <router-link :to="child.path"
                          class="flex items-center text-gray-500 no-underline rounded-lg text-[14px] transition-all duration-200"
                          :class="[
                            (isPreviewMode && child.meta?.componentPath) ? 'p-2 mx-2 mb-2' : 'py-2 px-4 pl-8 mx-2 my-0.5',
                            isActiveRoute(child.path)
                              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 hover:bg-blue-600 hover:text-white hover:translate-x-1'
                              : 'hover:bg-gray-200 hover:translate-x-1 hover:shadow-sm'
                          ]">
                          <template v-if="isPreviewMode && child.meta?.componentPath">
                            <div class="w-full aspect-video rounded overflow-hidden relative bg-white shadow-sm"
                              :class="isActiveRoute(child.path) ? 'ring-2 ring-white/50' : 'border border-gray-300'">
                              <ViewPreview :file-path="child.meta.componentPath" />
                              <div class="absolute inset-0 z-10 transition-colors hover:bg-black/5"></div>
                            </div>
                          </template>
                          <template v-else>
                            <span class="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{{ child.title
                            }}</span>
                          </template>
                        </router-link>
                      </div>
                    </li>
                  </ul>
                </transition>
              </div>

              <div v-else
                @mouseenter="(isCollapsed || isPreviewMode) ? showSimpleTooltip(item.title, $event) : showPreviewTooltip(item, $event)"
                @mouseleave="(isCollapsed || isPreviewMode) ? hideSimpleTooltip() : hidePreviewTooltip()">
                <router-link :to="item.path"
                  class="flex items-center text-gray-500 no-underline rounded-xl transition-all duration-200 relative mx-2 font-medium"
                  :class="[
                    (isPreviewMode && !isCollapsed && item.meta?.componentPath) ? 'p-2' : 'py-3 px-4',
                    isActiveRoute(item.path)
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50 hover:bg-blue-600 hover:text-white' + (isCollapsed ? '' : ' hover:translate-x-1')
                      : 'hover:bg-gray-100 hover:text-gray-700' + (isCollapsed ? ' hover:scale-110' : ' hover:translate-x-1'),
                    isCollapsed ? 'justify-center p-3 mx-2' : ''
                  ]">
                  <template v-if="isPreviewMode && !isCollapsed && item.meta?.componentPath">
                    <div class="w-full aspect-video rounded overflow-hidden relative bg-white shadow-sm"
                      :class="isActiveRoute(item.path) ? 'ring-2 ring-white/50' : 'border border-gray-300'">
                      <ViewPreview :file-path="item.meta.componentPath" />
                      <div class="absolute inset-0 z-10 transition-colors hover:bg-black/5"></div>
                    </div>
                  </template>
                  <template v-else>
                    <div v-if="isCollapsed"
                      class="flex items-center justify-center flex-shrink-0 font-bold text-[16px] text-gray-500 w-5 h-5">
                      {{ item.title.charAt(0).toUpperCase() }}
                    </div>
                    <span v-if="!isCollapsed" class="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                      {{ item.title }}
                    </span>
                  </template>
                </router-link>
              </div>
            </li>
          </ul>
        </div>
      </nav>

      <div class="mt-auto border-t border-gray-200" v-if="isDev">
        <button
          class="flex items-center w-full py-3 px-4 m-0 bg-transparent border-none text-gray-500 no-underline rounded-xl transition-all duration-200 cursor-pointer font-medium hover:bg-gray-100 hover:text-gray-700"
          :class="isCollapsed ? 'justify-center p-3' : ''" @mouseenter="handleSettingsHover"
          @mouseleave="handleSettingsLeave" :title="isCollapsed ? '' : '配置工具'">
          <div class="flex items-center justify-center flex-shrink-0" :class="isCollapsed ? 'mr-0' : 'mr-3'">
            <Settings class="flex-shrink-0 transition-all duration-200" :size="20" />
          </div>
          <span v-if="!isCollapsed" class="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
            配置工具
          </span>
        </button>
      </div>
    </aside>

    <Teleport to="body">
      <div v-if="simpleTooltipVisible && simpleTooltipText"
        class="pointer-events-none animate-[tooltipFadeIn_0.2s_cubic-bezier(0.4,0,0.2,1)]" :style="{
          position: 'fixed',
          top: simpleTooltipPosition.top + 'px',
          left: simpleTooltipPosition.left + 'px',
          zIndex: 9999
        }">
        <div
          class="bg-gray-800 text-white py-2 px-3 rounded-lg text-[14px] whitespace-nowrap shadow-lg border border-white/10 -translate-y-1/2 relative before:content-[''] before:absolute before:top-1/2 before:left-[-5px] before:-translate-y-1/2 before:w-0 before:h-0 before:border-[5px] before:border-solid before:border-transparent before:border-r-gray-800">
          {{ simpleTooltipText }}
        </div>
      </div>

      <div v-if="previewTooltipVisible && previewTooltipItem?.meta?.componentPath"
        class="pointer-events-none animate-[tooltipFadeIn_0.2s_cubic-bezier(0.4,0,0.2,1)]" :style="{
          position: 'fixed',
          top: previewTooltipPosition.top + 'px',
          left: previewTooltipPosition.left + 'px',
          zIndex: 9998
        }">
        <div
          class="bg-white p-2 rounded-xl shadow-xl border border-gray-200 -translate-y-1/2 relative before:content-[''] before:absolute before:top-1/2 before:left-[-6px] before:-translate-y-1/2 before:w-0 before:h-0 before:border-[6px] before:border-solid before:border-transparent before:border-r-gray-200 after:content-[''] after:absolute after:top-1/2 after:left-[-5px] after:-translate-y-1/2 after:w-0 after:h-0 after:border-[5px] after:border-solid after:border-transparent after:border-r-white w-64 aspect-[4/3] flex flex-col">
          <div class="text-xs font-medium text-gray-500 mb-1 px-1 whitespace-nowrap overflow-hidden text-ellipsis">{{
            previewTooltipItem.title }}</div>
          <div class="flex-1 w-full rounded overflow-hidden relative bg-gray-50 border border-gray-100">
            <ViewPreview :file-path="previewTooltipItem.meta.componentPath" />
          </div>
        </div>
      </div>
    </Teleport>

    <SettingsMenu v-if="isDev" :visible="settingsMenuVisible" :position="settingsMenuPosition"
      @keep-visible="keepSettingsMenu" @hide="hideSettingsMenu" @app-settings="handleAppSettings"
      @route-settings="handleRouteSettings" @theme-settings="handleThemeSettings" @icon-settings="handleIconSettings"
      @asset-settings="handleAssetSettings" />

    <!-- 主题配置面板改为由父布局渲染，此处不再引入模态框 -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, ChevronDown, Settings } from 'lucide-vue-next'
import type { MenuItem } from '@/core/types/menu'
import { isRouteActive, hasActiveChild } from '@/core/utils/route-generator'

import Icon from '@/components/layout/contentcommon/Icon.vue'
import ViewPreview from '@/components/editor/ViewPreview.vue'

const isDev = import.meta.env.DEV
const SettingsMenu = isDev ? defineAsyncComponent(() => import('@/layouts/SettingsMenu.vue')) : null as any
// 主题配置面板由父布局统一渲染

/**
 * 组件属性定义
 */
interface Props {
  navigationItems: MenuItem[]
  appConfig: {
    icon?: string
    title: string
    version?: string
    description?: string
    features?: {
      menuMode?: 'text' | 'preview'
    }
  }
}

const props = defineProps<Props>()

const isPreviewMode = computed(() => {
  return props.appConfig.features?.menuMode === 'preview'
})

// 调试日志
// console.log('ResponsiveSidebar - navigationItems:', props.navigationItems)
// console.log('ResponsiveSidebar - navigationItems length:', props.navigationItems?.length)



/**
 * 组件事件定义
 */
const emit = defineEmits<{
  (e: 'collapseChange', collapsed: boolean): void
  // 打开应用设置面板事件，由父布局接管渲染
  (e: 'openAppSettings'): void
  // 打开路由设置面板事件，由父布局接管渲染
  (e: 'openRouteSettings'): void
  // 打开主题设置面板事件，由父布局接管渲染
  (e: 'openThemeSettings'): void
  // 打开图标设置面板事件，由父布局接管渲染
  (e: 'openIconSettings'): void
  // 打开资源管理模态框事件，由父布局接管渲染
  (e: 'openResourceManager'): void
}>()

/**
 * 响应式状态
 */
const isCollapsed = ref(false)
const expandedMenus = ref<Set<string>>(new Set())
const hoverMenuVisible = ref<string | null>(null)
const hoverMenuPosition = ref({ top: 0, left: 0 })
const hoverMenuTimer = ref<number | null>(null)
const simpleTooltipVisible = ref(false)
const simpleTooltipText = ref('')
const simpleTooltipPosition = ref({ top: 0, left: 0 })
const simpleTooltipTimer = ref<number | null>(null)

const previewTooltipVisible = ref(false)
const previewTooltipItem = ref<MenuItem | null>(null)
const previewTooltipPosition = ref({ top: 0, left: 0 })
const previewTooltipTimer = ref<number | null>(null)

// 设置菜单相关状态
const settingsMenuVisible = ref(false)
const settingsMenuPosition = ref({ top: 0, left: 0 })
const settingsMenuTimer = ref<number | null>(null)


// 主题设置面板改为父布局控制

/**
 * 当前路由和路由器
 */
const route = useRoute()
const router = useRouter()



/**
 * 切换折叠状态
 */
const toggleCollapse = (): void => {
  isCollapsed.value = !isCollapsed.value
  emit('collapseChange', isCollapsed.value)
}



/**
 * 切换菜单展开状态
 */
const toggleMenuExpansion = (menuPath: string): void => {
  if (expandedMenus.value.has(menuPath)) {
    expandedMenus.value.delete(menuPath)
  } else {
    expandedMenus.value.add(menuPath)
  }
}

/**
 * 判断菜单是否展开
 */
const isMenuExpanded = (menuPath: string): boolean => {
  return expandedMenus.value.has(menuPath)
}



/**
 * 判断路由是否激活
 */
const isActiveRoute = (path: string): boolean => {
  return isRouteActive(path, route.path)
}

/**
 * 判断是否有激活的子路由
 */
const hasActiveChildRoute = (item: MenuItem): boolean => {
  return hasActiveChild(item, route.path)
}

/**
 * 处理导航点击
 */
const handleNavClick = (item: MenuItem): void => {
  // 如果有子菜单
  if (item.children && item.children.length > 0) {
    const isExpanded = isMenuExpanded(item.path)

    // 在非折叠状态切换展开状态
    if (!isCollapsed.value) {
      toggleMenuExpansion(item.path)
    }

    // 父路由只是分组，不指向具体页面
    // 当菜单展开或折叠模式下，导航到第一个子路由
    if (!isExpanded || isCollapsed.value) {
      const firstChild = item.children[0]
      if (firstChild) {
        router.push(firstChild.path)
      }
    }
  } else {
    // 没有子菜单的项目进行路由跳转
    router.push(item.path)
  }
}


/**
  * 显示悬浮菜单
  */
const showHoverMenu = (itemPath: string, event: MouseEvent): void => {
  if (hoverMenuTimer.value) {
    clearTimeout(hoverMenuTimer.value)
    hoverMenuTimer.value = null
  }

  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()

  // 找到对应的菜单项
  const item = props.navigationItems.find(nav => nav.path === itemPath)

  // 计算悬浮菜单位置
  const menuLeft = rect.right + 8
  const menuTop = rect.top

  // 检查是否超出视窗右边界
  const menuWidth = 200 // 预估菜单宽度
  const viewportWidth = window.innerWidth

  let finalLeft = menuLeft
  if (menuLeft + menuWidth > viewportWidth) {
    finalLeft = rect.left - menuWidth - 8
  }

  // 检查是否超出视窗下边界
  const menuHeight = item?.children ? item.children.length * 40 + 60 : 100 // 预估菜单高度
  const viewportHeight = window.innerHeight

  let finalTop = menuTop
  if (menuTop + menuHeight > viewportHeight) {
    finalTop = viewportHeight - menuHeight - 20
  }

  hoverMenuPosition.value = {
    top: Math.max(20, finalTop),
    left: Math.max(20, finalLeft)
  }

  hoverMenuVisible.value = itemPath
}

/**
 * 隐藏悬浮菜单
 */
const hideHoverMenu = (): void => {
  hoverMenuTimer.value = window.setTimeout(() => {
    hoverMenuVisible.value = null
  }, 100)
}

/**
    * 保持悬浮菜单显示
    */
const keepHoverMenu = (): void => {
  if (hoverMenuTimer.value) {
    clearTimeout(hoverMenuTimer.value)
    hoverMenuTimer.value = null
  }
}

/**
  * 显示简单tooltip
  */
const showSimpleTooltip = (text: string, event: MouseEvent): void => {
  if (simpleTooltipTimer.value) {
    clearTimeout(simpleTooltipTimer.value)
    simpleTooltipTimer.value = null
  }

  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()

  // 计算tooltip位置
  const tooltipLeft = rect.right + 12
  const tooltipTop = rect.top + rect.height / 2

  // 检查是否超出视窗右边界
  const tooltipWidth = text.length * 8 + 24 // 预估tooltip宽度
  const viewportWidth = window.innerWidth

  let finalLeft = tooltipLeft
  if (tooltipLeft + tooltipWidth > viewportWidth) {
    finalLeft = rect.left - tooltipWidth - 12
  }

  // 检查是否超出视窗边界
  const viewportHeight = window.innerHeight
  let finalTop = tooltipTop

  if (tooltipTop < 20) {
    finalTop = 20
  } else if (tooltipTop > viewportHeight - 40) {
    finalTop = viewportHeight - 40
  }

  simpleTooltipPosition.value = {
    top: finalTop,
    left: Math.max(12, finalLeft)
  }

  simpleTooltipText.value = text
  simpleTooltipVisible.value = true
}

/**
  * 隐藏简单tooltip
  */
const hideSimpleTooltip = (): void => {
  simpleTooltipTimer.value = window.setTimeout(() => {
    simpleTooltipVisible.value = false
    simpleTooltipText.value = ''
  }, 100)
}

/**
 * 显示预览tooltip
 */
const showPreviewTooltip = (item: MenuItem, event: MouseEvent): void => {
  if (!item.meta?.componentPath) return

  if (previewTooltipTimer.value) {
    clearTimeout(previewTooltipTimer.value)
    previewTooltipTimer.value = null
  }

  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()

  const tooltipLeft = rect.right + 12
  const tooltipTop = rect.top + rect.height / 2

  const tooltipWidth = 270
  const viewportWidth = window.innerWidth

  let finalLeft = tooltipLeft
  if (tooltipLeft + tooltipWidth > viewportWidth) {
    finalLeft = rect.left - tooltipWidth - 12
  }

  const viewportHeight = window.innerHeight
  let finalTop = tooltipTop

  const tooltipHeight = 160 // aspect-[4/3] (192 * 3/4 = 144) + title height
  if (tooltipTop - tooltipHeight / 2 < 20) {
    finalTop = 20 + tooltipHeight / 2
  } else if (tooltipTop + tooltipHeight / 2 > viewportHeight - 20) {
    finalTop = viewportHeight - 20 - tooltipHeight / 2
  }

  previewTooltipPosition.value = {
    top: finalTop,
    left: Math.max(12, finalLeft)
  }

  previewTooltipItem.value = item
  previewTooltipVisible.value = true
}

/**
 * 隐藏预览tooltip
 */
const hidePreviewTooltip = (): void => {
  previewTooltipTimer.value = window.setTimeout(() => {
    previewTooltipVisible.value = false
    previewTooltipItem.value = null
  }, 100)
}

/**
 * 自动展开包含当前路由的菜单
 */
const autoExpandCurrentRoute = (): void => {
  props.navigationItems.forEach(item => {
    if (hasActiveChild(item, route.path)) {
      expandedMenus.value.add(item.path)
    }
  })
}

/**
 * 监听路由变化
 */
watch(
  () => route.path,
  () => {
    autoExpandCurrentRoute()
  }
)



/**
 * 处理设置按钮悬停
 */
const handleSettingsHover = (event: MouseEvent): void => {
  if (settingsMenuTimer.value) {
    clearTimeout(settingsMenuTimer.value)
    settingsMenuTimer.value = null
  }

  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()

  // 计算菜单位置
  const menuLeft = rect.right + 12
  const menuTop = rect.top

  // 检查是否超出视窗
  const menuWidth = 200
  const menuHeight = 150 // 预估菜单高度
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let finalLeft = menuLeft
  if (menuLeft + menuWidth > viewportWidth) {
    finalLeft = rect.left - menuWidth - 12
  }

  // 检查是否超出视窗下边界
  let finalTop = menuTop
  if (menuTop + menuHeight > viewportHeight) {
    finalTop = viewportHeight - menuHeight - 125
  }

  settingsMenuPosition.value = {
    top: Math.max(20, finalTop),
    left: Math.max(12, finalLeft)
  }

  settingsMenuVisible.value = true
}

/**
 * 处理设置按钮离开
 */
const handleSettingsLeave = (): void => {
  settingsMenuTimer.value = window.setTimeout(() => {
    settingsMenuVisible.value = false
  }, 100)
}

/**
 * 保持设置菜单显示
 */
const keepSettingsMenu = (): void => {
  if (settingsMenuTimer.value) {
    clearTimeout(settingsMenuTimer.value)
    settingsMenuTimer.value = null
  }
}

/**
 * 隐藏设置菜单
 */
const hideSettingsMenu = (): void => {
  settingsMenuTimer.value = window.setTimeout(() => {
    settingsMenuVisible.value = false
  }, 100)
}

/**
 * 处理应用设置
 */
const handleAppSettings = (): void => {
  emit('openAppSettings')
}

/**
 * 处理路由设置：发出打开事件，由父布局决定何时何地渲染
 */
const handleRouteSettings = (): void => {
  emit('openRouteSettings')
}

// 路由设置的渲染和关闭逻辑已迁移到父布局（ResponsiveLayout）

/**
 * 处理主题设置
 */
const handleThemeSettings = (): void => {
  emit('openThemeSettings')
}

/**
 * 处理图标设置：发出打开事件，由父布局决定渲染
 */
const handleIconSettings = (): void => {
  emit('openIconSettings')
}

/** 处理资源管理：发出打开事件，由父布局决定渲染 */
const handleAssetSettings = (): void => {
  emit('openResourceManager')
}

/**
 * 关闭主题设置
 */
// 主题设置面板关闭逻辑迁移至父布局

/**
 * 处理主题更新
 */
// 主题更新回调由父布局处理

/**
 * 组件挂载
 */
onMounted(() => {
  autoExpandCurrentRoute()
})

/**
 * 组件卸载
 */
onUnmounted(() => {
  // 清理定时器
  if (hoverMenuTimer.value) {
    clearTimeout(hoverMenuTimer.value)
  }
  if (simpleTooltipTimer.value) {
    clearTimeout(simpleTooltipTimer.value)
  }
  if (settingsMenuTimer.value) {
    clearTimeout(settingsMenuTimer.value)
  }
  if (previewTooltipTimer.value) {
    clearTimeout(previewTooltipTimer.value)
  }
})
</script>

<style scoped>
/* Logo 过渡动画 */
.logo-fade-enter-active,
.logo-fade-leave-active {
  transition: all 0.3s ease;
}

.logo-fade-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.logo-fade-leave-to {
  opacity: 0;
  transform: scale(1.2);
}

/* 子菜单动画 */
.submenu-slide-enter-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.submenu-slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.submenu-slide-enter-from {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.submenu-slide-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.submenu-slide-enter-to,
.submenu-slide-leave-from {
  max-height: 500px;
  opacity: 1;
  transform: translateY(0);
}

/* 悬浮菜单动画 */
@keyframes hoverMenuFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Tooltip 动画 */
@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 自定义滚动条 */
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}
</style>