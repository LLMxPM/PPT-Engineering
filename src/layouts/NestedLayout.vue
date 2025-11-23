<template>
  <div class="nested-layout">
    <!-- 嵌套路由渲染区域 -->
    <router-view v-slot="{ Component, route }">
      <transition name="page" mode="out-in">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>
  </div>
</template>

<script setup lang="ts">
/**
 * 嵌套布局组件
 * 专门用于处理嵌套路由的渲染
 * 它会被用作有子路由的父级路由的组件
 */
</script>

<style scoped>
.nested-layout {
  width: 100%;
  height: 100%;
}

/* 页面切换动画 */
.page-enter-active,
.page-leave-active {
  transition: all 0.3s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>



