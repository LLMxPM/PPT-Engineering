<!--
  文件用途：通用图标组件 AppIcon。支持 Lucide 图标与静态资源图标展示。
  本次更新：为静态 SVG 图标提供内联渲染与颜色配置能力（可通过 color 属性设置）。
-->
<template>
  <span 
    class="app-icon inline-flex items-center justify-center"
    :class="[
      props.class,
      {
        'app-icon--lucide': isLucideIcon,
        'app-icon--static': isStaticIcon,
        'app-icon--disabled': props.disabled
      }
    ]"
    :style="iconStyle"
  >
    <!-- Lucide 图标 -->
    <component
      v-if="showIcon && isLucideIcon"
      :is="iconComponent"
      :size="props.size"
      :stroke-width="props.strokeWidth"
      :color="resolvedColor"
    />
    
    <!-- 静态 SVG 图标（内联渲染以支持颜色配置） -->
    <span
      v-else-if="showIcon && isStaticSvg && coloredSvgContent"
      class="app-icon__static-svg"
      :style="iconStyle"
      v-html="coloredSvgContent"
      role="img"
      :aria-label="iconDescription || props.name || 'Icon'"
    />

    <!-- 静态图标 -->
    <img
      v-else-if="showIcon && isStaticIcon && staticIconSrc"
      :src="staticIconSrc"
      :alt="iconDescription || props.name || 'Icon'"
      class="app-icon__static"
      :style="iconStyle"
    />
    
    <!-- 回退显示 -->
    <span 
      v-else-if="showFallback && props.fallback"
      class="app-icon-fallback text-xs"
    >
      {{ props.fallback }}
    </span>
    
    <!-- 默认回退（显示图标名称首字母） -->
    <span 
      v-else-if="showFallback"
      class="app-icon-fallback text-xs"
    >
      {{ props.name?.charAt(0)?.toUpperCase() || '?' }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useIcon } from '@/core/composables/useIcon'
import { resolveColor } from '@/core/utils/colorResolver'

interface Props {
  /** 图标名称 */
  name?: string
  /** 图标大小 */
  size?: string | number
  /** 
   * 图标颜色
   * 支持以下格式：
   * - 直接颜色值：#ff0000, rgb(255,0,0), rgba(255,0,0,0.5)
   * - 主题颜色类：primary, secondary, accent1, accent2-500 等
   * - CSS 变量：var(--custom-color)
   */
  color?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  class?: string
  /** 线条宽度（仅Lucide图标） */
  strokeWidth?: number
  /** 回退显示内容（当图标不存在时） */
  fallback?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  disabled: false,
  strokeWidth: 2
})

// 使用图标 composable
const {
  iconComponent,
  iconConfig,
  iconExists,
  iconType,
  isLucideIcon,
  isStaticIcon,
  isStaticSvg,
  staticIconSrc,
  iconDescription,
  staticSvgContent
} = useIcon(computed(() => props.name))

// 计算图标大小
const iconSize = computed(() => {
  const size = props.size
  return typeof size === 'number' ? `${size}px` : size
})

// 计算解析后的颜色值
const resolvedColor = computed(() => {
  if (!props.color) return undefined
  
  // 使用颜色解析工具解析颜色
  return resolveColor(props.color)
})

// 计算图标样式
const iconStyle = computed(() => ({
  width: iconSize.value,
  height: iconSize.value,
  color: resolvedColor.value,
  opacity: props.disabled ? 0.5 : 1
}))

// 计算是否显示图标
const showIcon = computed(() => {
  return iconExists.value && iconComponent.value
})

// 计算是否显示回退状态
const showFallback = computed(() => {
  return (!iconExists.value || !iconComponent.value) && props.name
})

/**
 * 为静态 SVG 文本注入颜色与尺寸
 * 实现要点：
 * - 保留 fill="none" 与 fill/stroke="url(#...)"（渐变或引用）不做替换
 * - 将其它 fill/stroke 替换为 currentColor，并在根 svg 注入 style="color: <resolvedColor>"
 * - 去除根 svg 的 width/height，使其通过容器样式控制大小，或统一设置为 100%
 * @param svg 原始 SVG 文本
 * @param color 解析后的颜色值（可为 undefined）
 * @returns 处理后的 SVG 文本
 */
function colorizeSvg(svg: string, color?: string): string {
  if (!svg) return svg

  let s = svg

  // 1) 去除根 svg width/height 以便容器控制尺寸
  s = s.replace(/<svg([^>]*)>/i, (match, attrs) => {
    let newAttrs = attrs
      .replace(/\swidth="[^"]*"/gi, '')
      .replace(/\sheight="[^"]*"/gi, '')

    // 注入 width/height="100%" 保持自适应容器
    newAttrs = `${newAttrs} width="100%" height="100%"`

    if (color) {
      if (/style="[^"]*"/i.test(newAttrs)) {
        newAttrs = newAttrs.replace(/style="([^"]*)"/i, (m, val) => `style="${val};color:${color}"`)
      } else {
        newAttrs = `${newAttrs} style="color:${color}"`
      }
    }
    return `<svg${newAttrs}>`
  })

  // 2) 将非 none/非 url(#...) 的 fill/stroke 替换为 currentColor
  s = s.replace(/fill="(.*?)"/gi, (m, val) => {
    if (val === 'none' || /^url\(#/.test(val)) return m
    return 'fill="currentColor"'
  })
  s = s.replace(/stroke="(.*?)"/gi, (m, val) => {
    if (val === 'none' || /^url\(#/.test(val)) return m
    return 'stroke="currentColor"'
  })

  return s
}

// 计算：着色后的 SVG 文本
const coloredSvgContent = computed(() => {
  const svg = staticSvgContent.value || ''
  return colorizeSvg(svg, resolvedColor.value)
})

</script>

<style scoped>
.app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.app-icon--lucide {
  /* Lucide图标特定样式 */
}

.app-icon--static {
  /* 静态图标特定样式 */
}

.app-icon--disabled {
  /* 禁用状态样式 */
  cursor: not-allowed;
}

.app-icon__static {
  object-fit: contain;
  max-width: 100%;
  max-height: 100%;
}

.app-icon__static-svg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.app-icon__static-svg :deep(svg) {
  width: 100%;
  height: 100%;
}

.app-icon-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #e5e7eb;
  color: #6b7280;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
  min-width: 1em;
  min-height: 1em;
}
</style>