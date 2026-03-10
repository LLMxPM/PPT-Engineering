<!--
  文件用途：通用编辑弹窗组件（EditorModal.vue）
  主要功能：
  - 以模态弹窗形式承载任意编辑内容，支持标题、关闭、底部操作区
  - 支持宽高以视口百分比进行控制（props：widthVw、heightVh）
  - 提供默认底部按钮（取消/确定），并支持插槽自定义底部
  - 键盘 ESC 关闭、可选点击遮罩关闭、可配置 zIndex
  技术栈：Vue@3 + TypeScript@5 + Tailwind CSS@3
-->

<template>
  <teleport to="body">
    <div v-if="visible" class="fixed inset-0 flex items-center justify-center" :style="overlayStyle"
      @click.self="onOverlayClick">
      <div class="bg-white rounded-lg shadow-xl mx-4 flex flex-col" :style="containerStyle">
        <!-- 头部 -->
        <div class="flex items-center justify-between p-3 border-b border-gray-200">
          <h3 class="text-[18px] font-semibold text-gray-900">{{ title }}</h3>
          <button @click="handleCancel" class="text-gray-500 hover:text-gray-700 transition-colors">
            <X :size="18" />
          </button>
        </div>

        <!-- 内容区：当设置了高度时，内容区域滚动 -->
        <div :class="contentClass">
          <slot />
        </div>

        <!-- 底部操作 -->
        <div v-if="showFooter" class="flex justify-end gap-2 p-2 border-t border-gray-200">
          <button @click="handleCancel"
            class="px-3 py-1.5 text-[14px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">{{
            cancelText }}</button>
          <button @click="handleOk"
            class="px-3 py-1.5 text-[14px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">{{
            okText }}</button>
        </div>
        <slot name="footer" />
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, withDefaults } from 'vue'
import { X } from 'lucide-vue-next'

interface Props {
  visible: boolean
  title?: string
  widthVw?: number
  heightVh?: number
  showFooter?: boolean
  okText?: string
  cancelText?: string
  closeOnEsc?: boolean
  closeOnOverlay?: boolean
  zIndex?: number
}

interface Emits {
  (e: 'update:visible', v: boolean): void
  (e: 'ok'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  widthVw: 60,
  showFooter: true,
  okText: '确定',
  cancelText: '取消',
  closeOnEsc: true,
  closeOnOverlay: false,
  zIndex: 500
})
const emit = defineEmits<Emits>()

/**
 * 计算遮罩层样式：包含 zIndex 与背景色
 */
const overlayStyle = computed(() => ({
  zIndex: props.zIndex.toString(),
  backgroundColor: 'rgba(0,0,0,0.4)'
}))

/**
 * 计算容器样式：以视口百分比控制宽高，未设置高度则由内容自适应
 */
const containerStyle = computed(() => ({
  width: `${props.widthVw}vw`,
  height: props.heightVh != null ? `${props.heightVh}vh` : 'auto'
}))

/**
 * 内容区 class：有固定高度时启用滚动布局
 */
const contentClass = computed(() => (props.heightVh != null ? 'p-4 flex-1 min-h-0 overflow-y-auto' : 'p-4'))

/**
 * 处理遮罩点击：按需关闭
 */
function onOverlayClick() {
  if (props.closeOnOverlay) handleCancel()
}

/**
 * 取消操作：更新可见性并发出取消事件
 */
function handleCancel(): void {
  emit('update:visible', false)
  emit('cancel')
}

/**
 * 确定操作：保持弹窗，由父组件决定关闭逻辑
 */
function handleOk(): void {
  emit('ok')
}

/**
 * 键盘 ESC 关闭
 */
function onKeydown(e: KeyboardEvent): void {
  if (!props.visible) return
  if (e.key === 'Escape' && props.closeOnEsc) {
    e.preventDefault()
    handleCancel()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
/* 无额外样式；遵循 Tailwind 规范 */
</style>