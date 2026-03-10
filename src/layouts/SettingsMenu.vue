<!--
  文件用途说明：
  SettingsMenu.vue 是 PPT-Engineering 项目的悬浮配置菜单。该版本使用 Tailwind CSS 完成样式，
  并新增“图标管理”“资源管理”两个暂不实现的入口（保持禁用并显示提示文案）。
  遵循项目规则：不使用 !important 与渐变色；保持文件内容不超过 1000 行。
-->

<template>
  <Teleport to="body">
    <div v-if="visible" :class="['fixed pointer-events-auto z-[9999]']"
      :style="{ top: position.top + 'px', left: position.left + 'px' }" @mouseenter="keepMenuVisible"
      @mouseleave="handleMouseLeave">
      <div class="bg-white border border-gray-200 rounded-xl shadow-2xl p-2 min-w-[200px] whitespace-nowrap">
        <div class="font-semibold text-gray-900 px-3 py-2 mb-1 border-b border-gray-200 text-[14px]">配置工具</div>
        <ul class="list-none m-0 p-0">
          <li>
            <button
              class="group flex items-center gap-2.5 w-full px-3 py-2.5 text-gray-700 bg-transparent rounded-lg transition-colors duration-200 text-[14px] cursor-pointer text-left hover:bg-gray-100 hover:text-gray-900"
              @click="handleAppSettings">
              <Settings :size="18" class="shrink-0 text-gray-500 group-hover:text-blue-500" />
              <span>基础设置</span>
            </button>
          </li>
          <li>
            <button
              class="group flex items-center gap-2.5 w-full px-3 py-2.5 text-gray-700 bg-transparent rounded-lg transition-colors duration-200 text-[14px] cursor-pointer text-left hover:bg-gray-100 hover:text-gray-900"
              @click="handleRouteSettings">
              <Route :size="18" class="shrink-0 text-gray-500 group-hover:text-blue-500" />
              <span>路由设置</span>
            </button>
          </li>
          <li>
            <button
              class="group flex items-center gap-2.5 w-full px-3 py-2.5 text-gray-700 bg-transparent rounded-lg transition-colors duration-200 text-[14px] cursor-pointer text-left hover:bg-gray-100 hover:text-gray-900"
              @click="handleThemeSettings">
              <Palette :size="18" class="shrink-0 text-gray-500 group-hover:text-blue-500" />
              <span>主题配置</span>
            </button>
          </li>
          <!-- 暂不实现：图标管理入口 -->
          <li>
            <button
              class="group flex items-center gap-2.5 w-full px-3 py-2.5 text-gray-700 bg-transparent rounded-lg transition-colors duration-200 text-[14px] cursor-pointer text-left hover:bg-gray-100 hover:text-gray-900"
              @click="handleIconSettings">
              <Shapes :size="18" class="shrink-0 text-gray-500 group-hover:text-blue-500" />
              <span>图标管理</span>
            </button>
          </li>
          <!-- 资源管理入口 -->
          <li>
            <button
              class="group flex items-center gap-2.5 w-full px-3 py-2.5 text-gray-700 bg-transparent rounded-lg transition-colors duration-200 text-[14px] cursor-pointer text-left hover:bg-gray-100 hover:text-gray-900"
              @click="handleAssetSettings">
              <FolderOpen :size="18" class="shrink-0 text-gray-500 group-hover:text-blue-500" />
              <span>资源管理</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * SettingsMenu.vue
 * 文档用途：悬浮的“配置工具”菜单组件，使用 Tailwind CSS 完成样式。
 * 提供基础设置（暂不实现）、路由设置、主题设置，以及暂不实现的图标管理与资源管理入口。
 * 规则遵循：不使用 !important 与渐变；组件用于工程内的布局辅助。
 */

import { Settings, Route, Palette, Shapes, FolderOpen } from 'lucide-vue-next'

interface Props {
  visible: boolean
  position: { top: number; left: number }
}

interface Emits {
  (e: 'keep-visible'): void
  (e: 'hide'): void
  (e: 'app-settings'): void
  (e: 'route-settings'): void
  (e: 'theme-settings'): void
  (e: 'icon-settings'): void
  (e: 'asset-settings'): void
}

/**
 * 组件接收的属性
 * - visible: 是否显示菜单
 * - position: 菜单定位（top/left 像素值）
 */
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

/** 保持菜单显示（鼠标进入时触发） */
const keepMenuVisible = () => {
  emit('keep-visible')
}

/** 鼠标移出时隐藏菜单 */
const handleMouseLeave = () => {
  emit('hide')
}

/** 基础设置（暂不实现，仅占位） */
const handleAppSettings = () => {
  emit('app-settings')
  emit('hide')
}

/** 路由设置：打开路由设置面板并隐藏菜单 */
const handleRouteSettings = () => {
  emit('route-settings')
  emit('hide')
}

/** 主题设置：打开主题设置面板并隐藏菜单 */
const handleThemeSettings = () => {
  emit('theme-settings')
  emit('hide')
}

/** 图标管理（暂不实现，仅占位） */
const handleIconSettings = () => {
  // 暂不实现：仅占位，无实际逻辑
  emit('icon-settings')
}

/** 资源管理入口点击：发出事件并由父组件接管 */
const handleAssetSettings = () => {
  emit('asset-settings')
  emit('hide')
}
</script>

<style scoped>
/* 样式由 Tailwind CSS 完成，此处保留作用域样式块但不写任何规则。 */
</style>
