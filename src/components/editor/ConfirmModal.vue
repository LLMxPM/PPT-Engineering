<!--
  文件用途：通用确认弹窗组件（ConfirmModal.vue）
  主要功能：
  - 显示确认信息并提供“取消/确定”操作
  - 支持标题、消息文本或默认插槽内容替换
  - 支持宽度以视口百分比、可配置 zIndex、ESC 关闭
  技术栈：Vue@3 + TypeScript@5 + Tailwind CSS@3
-->

<template>
  <teleport to="body">
    <div v-if="visible" class="fixed inset-0 flex items-center justify-center" :style="overlayStyle" @click.self="onOverlayClick">
      <div class="bg-white rounded-lg shadow-xl mx-4" :style="containerStyle">
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 class="text-[16px] font-semibold text-gray-900">{{ title }}</h3>
          <button @click="handleCancel" class="text-gray-500 hover:text-gray-700 transition-colors">
            <X :size="18" />
          </button>
        </div>
        <div class="p-4 text-[16px] text-gray-700">
          <slot>
            {{ message }}
          </slot>
        </div>
        <div class="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button @click="handleCancel" class="px-3 py-1.5 text-[12px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">{{ cancelText }}</button>
          <button @click="handleOk" class="px-3 py-1.5 text-[12px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors">{{ okText }}</button>
        </div>
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
  message?: string
  widthVw?: number
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
  title: '确认操作',
  message: '',
  widthVw: 40,
  okText: '确定',
  cancelText: '取消',
  closeOnEsc: true,
  closeOnOverlay: false,
  zIndex: 9999
})
const emit = defineEmits<Emits>()

/** 计算遮罩样式 */
const overlayStyle = computed(() => ({ zIndex: props.zIndex.toString(), backgroundColor: 'rgba(0,0,0,0.4)' }))

/** 计算容器宽度 */
const containerStyle = computed(() => ({ width: `${props.widthVw}vw` }))

/** 点击遮罩关闭（可选） */
function onOverlayClick() { if (props.closeOnOverlay) handleCancel() }

/** 取消操作 */
function handleCancel(): void { emit('update:visible', false); emit('cancel') }

/** 确认操作 */
function handleOk(): void { emit('ok') }

/** ESC 关闭 */
function onKeydown(e: KeyboardEvent): void {
  if (!props.visible) return
  if (e.key === 'Escape' && props.closeOnEsc) { e.preventDefault(); handleCancel() }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
/* 无额外样式；遵循 Tailwind 规范 */
</style>