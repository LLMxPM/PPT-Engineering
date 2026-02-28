<!--
  组件用途：功能展示-配置UI页面
  展示系统各项基础配置、主题、图文相关的界面
-->
<template>
    <DefaultContentPage title="配置UI展示" subtitle="系统各类配置界面的功能展示">
        <template #content>
            <div class="space-y-8 p-6">
                <div class="flex items-center mb-4">
                    <Icon name="Settings" :size="24" class="text-primary mr-2" />
                    <h2 class="font-heading text-2xl font-semibold text-primary">基础配置</h2>
                </div>
                <img :src="resolveResourcePath('/img/illus/插图/基础配置.png')" alt="基础配置"
                    class="rounded-lg shadow-theme-md border border-border-default max-w-full h-auto" />

                <div class="flex items-center mb-4 mt-8">
                    <Icon name="Palette" :size="24" class="text-primary mr-2" />
                    <h2 class="font-heading text-2xl font-semibold text-primary">主题编辑</h2>
                </div>
                <img :src="resolveResourcePath('/img/illus/插图/主题编辑.png')" alt="主题编辑"
                    class="rounded-lg shadow-theme-md border border-border-default max-w-full h-auto" />

                <div class="flex items-center mb-4 mt-8">
                    <Icon name="Image" :size="24" class="text-primary mr-2" />
                    <h2 class="font-heading text-2xl font-semibold text-primary">图片管理</h2>
                </div>
                <img :src="resolveResourcePath('/img/illus/插图/图片管理.png')" alt="图片管理"
                    class="rounded-lg shadow-theme-md border border-border-default max-w-full h-auto" />

                <div class="flex items-center mb-4 mt-8">
                    <Icon name="Box" :size="24" class="text-primary mr-2" />
                    <h2 class="font-heading text-2xl font-semibold text-primary">图标管理</h2>
                </div>
                <img :src="resolveResourcePath('/img/illus/插图/图标管理.png')" alt="图标管理"
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
    name: 'ConfigUI'
})
</script>
