<!--
  文件用途：通用颜色选择器组件（ColorPicker.vue）
  主要功能：
  - 提供输入型颜色选择器，支持 `type="color"` 与十六进制文本输入
  - 通过 v-model 双向绑定颜色值，统一输出为十六进制格式（#RRGGBB）
  - 提供禁用态与占位标签显示，样式基于 Tailwind CSS
  规则遵循：
  - Vue@3 + TypeScript@5 + Vite@5
  - 禁止使用 !important 与渐变色；单文件不超过 1000 行
-->

<template>
  <div class="relative flex items-center gap-2 w-full">
    <label v-if="label" class="text-[12px] text-gray-600 whitespace-nowrap" :style="labelStyle">{{ label }}</label>
    <div class="w-8 h-8 rounded-md border border-gray-300 cursor-pointer" :class="disabled ? 'opacity-50 cursor-not-allowed' : ''"
      :style="{ backgroundColor: safeColor }" @click="!disabled && openPicker()" />
    <input type="text" class="flex-1 min-w-0 px-2 py-1.5 text-[14px] border border-gray-300 rounded-md" :disabled="disabled"
      :value="safeColor" placeholder="#RRGGBB" readonly />

    <div v-if="isOpen" ref="panelRef" tabindex="0"
      class="absolute top-full left-0 mt-2 z-50 w-56  bg-white border border-gray-200 rounded-lg shadow-xl p-3"
      @keydown.escape="onCancel" @keydown.enter="onConfirm">
      <div class="flex items-start gap-2">
        <input type="color" class="w-16 h-16 p-0 bg-transparent rounded-md cursor-pointer" :value="draftColor"
          @input="onDraftColorInput" />
        <div class="flex-1">
          <div class="mb-3 flex justify-end gap-2">
            <button type="button"
              class="px-3 w-1/2 text-[14px] border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              @click="onCancel">取消</button>
            <button type="button" class="px-3  w-1/2  text-[14px] rounded-md bg-blue-600 text-white hover:bg-blue-700"
              @click="onConfirm">确定</button>
          </div> <input type="text" class="w-full px-2  text-[14px] border border-gray-300 rounded-md"
            :value="draftColor" placeholder="#RRGGBB" @input="onDraftTextInput" />
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ColorPicker.vue
 * 函数用途：通用颜色选择器组件，封装颜色输入与文本输入，统一校验与输出格式。
 */
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'

/** 组件属性 */
interface Props {
  modelValue: string
  label?: string
  disabled?: boolean
  labelWidth?: number | string
}
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

/**
 * normalizeColor
 * 函数用途：将输入颜色值标准化为 #RRGGBB 格式；非法值回退为 #000000。
 */
function normalizeColor(v: string | undefined): string {
  const value = (v || '').trim()
  const hex = value.startsWith('#') ? value.slice(1) : value
  const full = hex.length === 3
    ? hex.split('').map((c) => c + c).join('')
    : hex
  const valid = /^[0-9a-fA-F]{6}$/.test(full)
  return `#${valid ? full.toLowerCase() : '000000'}`
}

/**
 * safeColor
 * 函数用途：计算属性，始终返回合法的 #RRGGBB 颜色字符串。
 */
const safeColor = computed(() => normalizeColor(props.modelValue))

/**
 * labelStyle
 * 函数用途：根据传入的 labelWidth 统一标签宽度，保证字段名称对齐。
 */
const labelStyle = computed(() => ({
  width: typeof props.labelWidth === 'number' ? `${props.labelWidth}px` : (props.labelWidth || '96px')
}))

/**
 * isOpen
 * 函数用途：弹窗显示状态，控制颜色选择面板的显示与隐藏。
 */
const isOpen = ref(false)

/**
 * panelRef
 * 函数用途：弹窗根节点引用，用于处理外部点击关闭逻辑。
 */
const panelRef = ref<HTMLElement | null>(null)

/**
 * draftColor
 * 函数用途：临时颜色值，用户在弹窗内修改的草稿，仅在“确定”时提交。
 */
const draftColor = ref<string>(safeColor.value)

/**
 * watch safeColor
 * 函数用途：当外部 v-model 变化时同步草稿值（在弹窗关闭时）。
 */
watch(safeColor, (v) => {
  if (!isOpen.value) draftColor.value = v
})

/**
 * openPicker
 * 函数用途：打开颜色选择弹窗，并用当前值初始化草稿。
 */
function openPicker(): void {
  isOpen.value = true
  draftColor.value = safeColor.value
}

/**
 * closePicker
 * 函数用途：关闭颜色选择弹窗。
 */
function closePicker(): void {
  isOpen.value = false
}

/**
 * onDraftColorInput
 * 函数用途：弹窗内原生颜色选择器的输入事件，更新草稿值。
 */
function onDraftColorInput(e: Event): void {
  const target = e.target as HTMLInputElement
  draftColor.value = normalizeColor(target.value)
}

/**
 * onDraftTextInput
 * 函数用途：弹窗内文本输入框的输入事件，更新草稿值。
 */
function onDraftTextInput(e: Event): void {
  const target = e.target as HTMLInputElement
  draftColor.value = normalizeColor(target.value)
}

/**
 * onCancel
 * 函数用途：取消本次修改并关闭弹窗，不提交数据。
 */
function onCancel(): void {
  closePicker()
}

/**
 * onConfirm
 * 函数用途：确认提交草稿颜色值并关闭弹窗。
 */
function onConfirm(): void {
  emit('update:modelValue', draftColor.value)
  closePicker()
}

/**
 * onGlobalClick
 * 函数用途：处理组件外部点击，若发生则关闭弹窗。
 */
function onGlobalClick(e: MouseEvent): void {
  if (!isOpen.value) return
  const el = panelRef.value
  const target = e.target as Node
  if (el && !el.contains(target)) {
    closePicker()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onGlobalClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onGlobalClick)
})
</script>

<style scoped>
/* 无额外样式，保持组件轻量与可复用 */
</style>