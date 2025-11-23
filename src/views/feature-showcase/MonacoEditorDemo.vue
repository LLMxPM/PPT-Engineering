<template>
  <DefaultContentPage title="Monaco 编辑器演示" subtitle="仅开发环境加载">
    <template #content>
      <div class="w-full h-full flex flex-col space-y-4">
        <div class="text-secondary text-sm">在开发环境中引入 Monaco Editor，支持 TypeScript/JSON/HTML/CSS 等语法高亮。</div>
        <div class="flex items-center space-x-4">
          <label class="font-body text-sm text-primary">语言：</label>
          <select v-model="language" class="border border-border-default rounded px-2 py-1 bg-default text-primary">
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="vue">Vue (基本高亮)</option>
          </select>
          <label class="font-body text-sm text-primary">主题：</label>
          <select v-model="theme" class="border border-border-default rounded px-2 py-1 bg-default text-primary">
            <option value="vs-dark">vs-dark</option>
            <option value="vs">vs</option>
          </select>
        </div>
        <div class="flex-1 min-h-[600px]">
          <DevMonacoEditor v-model="code" :language="language" :theme="theme" :height="600" />
        </div>
      </div>
    </template>
  </DefaultContentPage>
}</template>

<script setup lang="ts">
import { ref } from 'vue'
import DefaultContentPage from '@/components/layout/pagecontainer/DefaultContentPage.vue'
import DevMonacoEditor from '@/components/editor/DevMonacoEditor.vue'

/**
 * 文件用途：Monaco 编辑器的功能演示页面，验证开发环境下的编辑器工作状态。
 */

const language = ref<'typescript'|'javascript'|'json'|'yaml'|'html'|'css'|'vue'>('typescript')
const theme = ref<'vs'|'vs-dark'>('vs-dark')
const code = ref<string>(`// Monaco 开发演示\n// 选择语言与主题以体验\n\nfunction hello(name: string) {\n  console.log('Hello, ' + name)\n}\n\nhello('PPT Engineering')\n`)
</script>

<style scoped>
</style>