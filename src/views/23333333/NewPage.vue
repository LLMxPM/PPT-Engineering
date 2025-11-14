<!--
  文件用途：新页面组件（NewPage.vue）
  主要功能：
  - 使用 DefaultContentPage 组件构建 PPT 风格静态页面
  - 内容区域高度约为 950px（去除标题和页脚）
-->
<template>
  <DefaultContentPage>
    <div class="w-full h-[950px] flex items-center justify-center bg-white">
      <!-- 将此处替换为你的页面内容（静态展示） -->
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">新页面：NewPage</h1>
        <p class="mt-2 text-gray-600">请根据页面创建指南进行排版和内容填充</p>
      </div>
    </div>
  </DefaultContentPage>
</template>

<script setup lang="ts">
/**
 * 页面组件：NewPage.vue
 * - 说明：静态内容展示，使用 DefaultContentPage 容器
 */
import DefaultContentPage from "@/components/layout/pagecontainer/DefaultContentPage.vue"
</script>

<style scoped>
/* 根据需要添加页面特定样式（禁止使用 !important 和渐变色） */
</style>