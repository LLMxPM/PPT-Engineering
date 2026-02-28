<!--
  组件用途：功能展示-页面简单编辑页面
  展示页面演示、编辑以及页面文件管理的界面
-->
<template>
    <DefaultContentPage title="页面简单编辑" subtitle="页面编辑与文件管理相关功能展示">
        <template #content>
            <div class="space-y-8 p-6">
                <div class="flex items-center mb-4">
                    <Icon name="Edit" :size="24" class="text-primary mr-2" />
                    <h2 class="font-heading text-2xl font-semibold text-primary">页面编辑</h2>
                </div>
                <img :src="resolveResourcePath('/img/illus/插图/页面编辑.png')" alt="页面编辑"
                    class="rounded-lg shadow-theme-md border border-border-default max-w-full h-auto" />



                <div class="flex items-center mb-4 mt-8">
                    <Icon name="FileImage" :size="24" class="text-primary mr-2" />
                    <h2 class="font-heading text-2xl font-semibold text-primary">页面文件管理</h2>
                </div>
                <img :src="resolveResourcePath('/img/illus/插图/页面文件管理.png')" alt="页面文件管理"
                    class="rounded-lg shadow-theme-md border border-border-default max-w-full h-auto" />
            </div>
        </template>
    </DefaultContentPage>
</template>

<script setup lang="ts">
import DefaultContentPage from '@/components/layout/pagecontainer/DefaultContentPage.vue'
import Icon from '@/components/layout/contentcommon/Icon.vue'
import { resolveResourcePath } from '@/core/utils/path'

defineOptions({
    name: 'SimplePageEdit'
})
</script>
