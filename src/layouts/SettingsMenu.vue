<template>
  <Teleport to="body">
    <div 
      v-if="visible"
      class="settings-menu-overlay"
      :style="{
        position: 'fixed',
        top: position.top + 'px',
        left: position.left + 'px',
        zIndex: 9999
      }"
      @mouseenter="keepMenuVisible"
      @mouseleave="handleMouseLeave"
    >
      <div class="settings-menu-content">
        <div class="settings-menu-title">设置</div>
        <ul class="settings-menu-list">
          <li>
            <button 
              class="settings-menu-item"
              @click="handleAppSettings"
              disabled
            >
              <Settings :size="18" class="menu-icon" />
              <span>应用设置</span>
              <span class="coming-soon">敬请期待</span>
            </button>
          </li>
          <li>
            <button 
              class="settings-menu-item"
              @click="handleRouteSettings"
            >
              <Route :size="18" class="menu-icon" />
              <span>路由设置</span>
            </button>
          </li>
          <li>
            <button 
              class="settings-menu-item"
              @click="handleThemeSettings"
            >
              <Palette :size="18" class="menu-icon" />
              <span>主题设置</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { Settings, Route, Palette } from 'lucide-vue-next'

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
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const keepMenuVisible = () => {
  emit('keep-visible')
}

const handleMouseLeave = () => {
  emit('hide')
}

const handleAppSettings = () => {
  // 暂不实现
}

const handleRouteSettings = () => {
  emit('route-settings')
  emit('hide')
}

const handleThemeSettings = () => {
  emit('theme-settings')
  emit('hide')
}
</script>

<style scoped>
.settings-menu-overlay {
  pointer-events: auto;
  animation: menuFadeIn 0.2s ease-out;
}

.settings-menu-content {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  padding: 8px;
  min-width: 200px;
  white-space: nowrap;
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.settings-menu-title {
  font-weight: 600;
  color: #111827;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 0.875rem;
}

.settings-menu-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.settings-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  color: #374151;
  background: transparent;
  border: none;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  cursor: pointer;
  text-align: left;
}

.settings-menu-item:hover:not(:disabled) {
  background-color: #f3f4f6;
  color: #111827;
}

.settings-menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-icon {
  flex-shrink: 0;
  color: #6b7280;
}

.settings-menu-item:hover:not(:disabled) .menu-icon {
  color: #3b82f6;
}

.coming-soon {
  margin-left: auto;
  font-size: 0.75rem;
  color: #9ca3af;
  font-style: italic;
}
</style>
