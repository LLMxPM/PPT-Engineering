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
                class="text-blue-500 flex-shrink-0 transition-all duration-200" :size="24" />
              <h1 class="text-xl font-bold text-gray-900 m-0 text-center">
                {{ appConfig.title }}
              </h1>
            </div>
            <div v-else key="icon"
              class="w-10 h-10 bg-slate-50 text-blue-500 rounded-xl flex items-center justify-center font-bold text-xl cursor-pointer transition-all duration-200 shadow-sm border border-slate-200 hover:scale-105 hover:bg-slate-100 hover:text-blue-600 hover:shadow-md hover:border-slate-300"
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
                    class="flex items-center py-3 px-4 text-gray-500 no-underline rounded-xl transition-all duration-200 relative mx-2 font-medium cursor-pointer"
                    :class="[
                      isActiveRoute(item.path)
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50 hover:bg-blue-600 hover:text-white' + (isCollapsed ? '' : ' hover:translate-x-1')
                        : hasActiveChildRoute(item)
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300' + (isCollapsed ? '' : ' hover:translate-x-1')
                          : 'hover:bg-gray-100 hover:text-gray-700' + (isCollapsed ? ' hover:scale-110' : ' hover:translate-x-1'),
                      isCollapsed ? 'justify-center p-3 mx-2' : ''
                    ]" @click="handleNavClick(item)">
                    <div class="flex items-center justify-center flex-shrink-0" :class="isCollapsed ? 'mr-0' : 'mr-3'">
                      <Icon v-if="item.icon" :name="item.icon" class="flex-shrink-0 transition-all duration-200"
                        :size="20" />
                    </div>
                    <span v-if="!isCollapsed" class="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                      {{ item.title }}
                    </span>
                    <ChevronDown v-if="!isCollapsed && item.children.length > 0"
                      class="ml-auto transition-transform duration-300 flex-shrink-0"
                      :class="isMenuExpanded(item.path) ? 'rotate-180' : ''" :size="16" />
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
                              class="flex items-center py-2 px-3 text-gray-500 no-underline rounded-lg transition-all duration-200 text-sm hover:bg-gray-100 hover:text-gray-700"
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
                      <router-link :to="child.path"
                        class="flex items-center py-2 px-4 pl-8 mx-2 my-0.5 text-gray-500 no-underline rounded-lg text-sm transition-all duration-200"
                        :class="isActiveRoute(child.path)
                          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 hover:bg-blue-600 hover:text-white hover:translate-x-1'
                          : 'hover:bg-gray-200 hover:translate-x-1 hover:shadow-sm'">
                        <span class="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{{ child.title }}</span>
                      </router-link>
                    </li>
                  </ul>
                </transition>
              </div>

              <div v-else @mouseenter="isCollapsed ? showSimpleTooltip(item.title, $event) : null"
                @mouseleave="isCollapsed ? hideSimpleTooltip() : null">
                <router-link :to="item.path"
                  class="flex items-center py-3 px-4 text-gray-500 no-underline rounded-xl transition-all duration-200 relative mx-2 font-medium"
                  :class="[
                    isActiveRoute(item.path)
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50 hover:bg-blue-600 hover:text-white' + (isCollapsed ? '' : ' hover:translate-x-1')
                      : 'hover:bg-gray-100 hover:text-gray-700' + (isCollapsed ? ' hover:scale-110' : ' hover:translate-x-1'),
                    isCollapsed ? 'justify-center p-3 mx-2' : ''
                  ]">
                  <div class="flex items-center justify-center flex-shrink-0" :class="isCollapsed ? 'mr-0' : 'mr-3'">
                    <Icon v-if="item.icon" :name="item.icon" class="flex-shrink-0 transition-all duration-200"
                      :size="20" />
                  </div>
                  <span v-if="!isCollapsed" class="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                    {{ item.title }}
                  </span>
                </router-link>
              </div>
            </li>
          </ul>
        </div>
      </nav>

      <div class="mt-auto border-t border-gray-200">
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
          class="bg-gray-800 text-white py-2 px-3 rounded-lg text-sm whitespace-nowrap shadow-lg border border-white/10 -translate-y-1/2 relative before:content-[''] before:absolute before:top-1/2 before:left-[-5px] before:-translate-y-1/2 before:w-0 before:h-0 before:border-[5px] before:border-solid before:border-transparent before:border-r-gray-800">
          {{ simpleTooltipText }}
        </div>
      </div>
    </Teleport>

    <SettingsMenu :visible="settingsMenuVisible" :position="settingsMenuPosition" @keep-visible="keepSettingsMenu"
      @hide="hideSettingsMenu" @app-settings="handleAppSettings" @route-settings="handleRouteSettings"
      @theme-settings="handleThemeSettings" />

    <SettingsModal :visible="themeSettingsModalVisible" @close="closeThemeSettings" @update="handleThemeUpdate" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, ChevronDown, Settings } from 'lucide-vue-next'
import type { MenuItem } from '@/core/types/menu'
import { isRouteActive, hasActiveChild } from '@/core/utils/route-generator'

import Icon from '@/components/layout/contentcommon/Icon.vue'
import SettingsMenu from '@/layouts/SettingsMenu.vue'
import SettingsModal from '@/layouts/SettingsModal.vue'

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
  }
}

const props = defineProps<Props>()

// 调试日志
// console.log('ResponsiveSidebar - navigationItems:', props.navigationItems)
// console.log('ResponsiveSidebar - navigationItems length:', props.navigationItems?.length)



/**
 * 组件事件定义
 */
const emit = defineEmits<{
  (e: 'collapseChange', collapsed: boolean): void
  // 打开路由设置面板事件，由父布局接管渲染
  (e: 'openRouteSettings'): void
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

// 设置菜单相关状态
const settingsMenuVisible = ref(false)
const settingsMenuPosition = ref({ top: 0, left: 0 })
const settingsMenuTimer = ref<number | null>(null)


// 主题设置模态框
const themeSettingsModalVisible = ref(false)

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
    // 检查当前是否已经在一级菜单页面或其子页面
    const isCurrentlyActive = isActiveRoute(item.path) || hasActiveChildRoute(item)
    const isExpanded = isMenuExpanded(item.path)

    // 如果菜单处于展开状态且处于非激活状态，点击时不切换折叠状态，直接导航
    if (isExpanded && !isCurrentlyActive) {
      router.push(item.path)
      return
    }

    // 如果当前不在该菜单页面，先导航到一级菜单页面
    if (!isCurrentlyActive) {
      router.push(item.path)
    }

    // 在非折叠状态切换展开状态
    if (!isCollapsed.value) {
      toggleMenuExpansion(item.path)
    }

    // 如果已经在该菜单页面且菜单已展开，再次点击时导航到一级菜单页面
    if (isCurrentlyActive && isExpanded) {
      router.push(item.path)
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
  // 暂不实现
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
  themeSettingsModalVisible.value = true
}

/**
 * 关闭主题设置
 */
const closeThemeSettings = (): void => {
  themeSettingsModalVisible.value = false
}

/**
 * 处理主题更新
 */
const handleThemeUpdate = (): void => {
  console.log('主题已更新')
}

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