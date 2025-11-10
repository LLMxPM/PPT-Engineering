# Connector 连接线组件

用于在两个 DOM 元素之间绘制连接线的组件。

## 快速开始

```vue
<template>
  <div>
    <div id="box1">起点</div>
    <div id="box2">终点</div>
    
    <!-- 绘制从 box1 到 box2 的连接线 -->
    <Connector from="#box1" to="#box2" arrow="end" />
  </div>
</template>

<script setup>
import Connector from '@/components/layout/contentcommon/Connector.vue'
</script>
```

## 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `from` | `string \| HTMLElement` | - | 起始元素（必需） |
| `to` | `string \| HTMLElement` | - | 目标元素（必需） |
| `type` | `'straight' \| 'polyline' \| 'curve'` | `'straight'` | 连接线类型 |
| `strokeWidth` | `number` | `2` | 线条粗细 |
| `color` | `string` | `'#000000'` | 线条颜色 |
| `arrow` | `'none' \| 'start' \| 'end' \| 'both'` | `'none'` | 箭头位置 |
| `dashed` | `boolean` | `false` | 是否虚线 |
| `fromAnchor` | `'center' \| 'top' \| 'bottom' \| 'left' \| 'right'` | `'center'` | 起点锚点 |
| `toAnchor` | `'center' \| 'top' \| 'bottom' \| 'left' \| 'right'` | `'center'` | 终点锚点 |
| `curvature` | `number` | `0.5` | 曲线弯曲度（仅 curve 类型） |
| `zIndex` | `number` | `1` | 层级 |

## 示例

### 直线连接

```vue
<Connector 
  from="#box1" 
  to="#box2" 
  type="straight" 
  arrow="end" 
  color="#ef4444"
  :stroke-width="3"
/>
```

### 折线连接

```vue
<Connector 
  from="#box1" 
  to="#box2" 
  type="polyline" 
  arrow="both"
  color="#8b5cf6"
/>
```

### 曲线连接

```vue
<Connector 
  from="#box1" 
  to="#box2" 
  type="curve" 
  arrow="end"
  :curvature="0.3"
  color="#06b6d4"
/>
```

### 虚线连接

```vue
<Connector 
  from="#box1" 
  to="#box2" 
  :dashed="true"
  arrow="end"
/>
```

### 指定锚点

```vue
<Connector 
  from="#box1" 
  to="#box2" 
  from-anchor="right"
  to-anchor="left"
  arrow="end"
/>
```

### 使用元素引用

```vue
<template>
  <div>
    <div ref="startBox">起点</div>
    <div ref="endBox">终点</div>
    
    <Connector 
      v-if="startBox && endBox"
      :from="startBox" 
      :to="endBox" 
      arrow="end"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Connector from '@/components/layout/contentcommon/Connector.vue'

const startBox = ref(null)
const endBox = ref(null)
</script>
```

## 注意事项

1. **元素必须存在**：确保 `from` 和 `to` 指定的元素在 DOM 中已渲染
2. **自动更新**：组件会自动响应元素位置变化、窗口大小变化和滚动
3. **缩放支持**：支持在使用 `transform: scale()` 的容器中正确定位
4. **性能**：使用了 ResizeObserver 和 MutationObserver 进行高效的位置更新

## 完整示例

查看演示页面：`src/views/feature-showcase/ConnectorDemo.vue`
