<template>
  <ConnectorCore v-bind="$props" />
</template>

<script setup lang="ts">
import ConnectorCore from '@/components/common/Connector.vue'

/**
 * @description Connector 连接线组件，用于在两个元素之间绘制连接线
 * @example
 * <Connector from="#box1" to="#box2" type="straight" arrow="end" />
 */

interface Props {
  /**
   * @description 起始元素，CSS 选择器或 HTMLElement
   * @example "#element1" 或 document.getElementById('element1')
   */
  from: string | HTMLElement
  
  /**
   * @description 目标元素，CSS 选择器或 HTMLElement
   * @example "#element2"
   */
  to: string | HTMLElement
  
  /**
   * @description 连接线类型
   * @default "straight"
   */
  type?: 'straight' | 'polyline' | 'curve'
  
  /**
   * @description 线条粗细（像素）
   * @default 2
   */
  strokeWidth?: number
  
  /**
   * @description 线条颜色
   * @default "#000000"
   */
  color?: string
  
  /**
   * @description 箭头位置
   * @default "none"
   */
  arrow?: 'none' | 'start' | 'end' | 'both'
  
  /**
   * @description 是否使用虚线
   * @default false
   */
  dashed?: boolean
  
  /**
   * @description 起始元素的锚点位置
   * @default "center"
   */
  fromAnchor?: 'center' | 'top' | 'bottom' | 'left' | 'right'
  
  /**
   * @description 目标元素的锚点位置
   * @default "center"
   */
  toAnchor?: 'center' | 'top' | 'bottom' | 'left' | 'right'
  
  /**
   * @description SVG 层级
   * @default 1
   */
  zIndex?: number
  
  /**
   * @description 曲线弯曲程度（仅对 curve 类型有效，0-1之间）
   * @default 0.5
   */
  curvature?: number
}

defineProps<Props>()
</script>
