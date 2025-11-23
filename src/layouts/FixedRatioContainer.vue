<!--
  文档用途：固定比例缩放容器组件
  说明：用于将插槽内容按照设计尺寸（默认1920x1080）在不同屏幕与布局条件下进行等比缩放，适配本项目的PPT式页面布局。
-->
<template>
  <div
    class="fixed-ratio-container"
    :class="{ 'fixed-ratio-container--fullscreen': isFullscreen }"
    :style="containerStyle"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * 文档用途：固定比例缩放容器组件（简化版）
 * 说明：容器不再参与窗口与布局尺寸计算，仅接收外部计算好的缩放比例并应用。
 */

/**
 * 组件入参
 */
const props = withDefaults(defineProps<{
  /** 设计宽度 */
  designWidth?: number
  /** 设计高度 */
  designHeight?: number
  /** 是否全屏 */
  isFullscreen: boolean
  /** 外部计算后的缩放比例 */
  scale: number
}>(), {
  designWidth: 1920,
  designHeight: 1080
})

/**
 * 计算容器样式
 * 功能：将传入的等比缩放比例应用于插槽内容容器
 */
const containerStyle = computed(() => {
  return {
    transform: `scale(${props.scale})`,
    width: `${props.designWidth}px`,
    height: `${props.designHeight}px`
  }
})
</script>

<style scoped>
.fixed-ratio-container {
  position: relative;
  width: 1920px;
  height: 1080px;
  transform-origin: center center;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  flex-shrink: 0;
}

.fixed-ratio-container--fullscreen {
  border-radius: 0;
  box-shadow: none;
  transform-origin: center center;
}

.fixed-ratio-container > * {
  width: 100%;
  height: 100%;
  overflow: auto;
}

@media (max-width: 768px) {
  .fixed-ratio-container {
    padding: 1rem;
  }
}
</style>