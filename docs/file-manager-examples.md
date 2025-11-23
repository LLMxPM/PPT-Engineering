# 文件管理插件使用示例

## 快速开始

### 1. 在 Vue 组件中使用

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fileManagerService } from '@/core/services/FileManagerService'

const configContent = ref('')

onMounted(async () => {
  // 读取配置文件
  const content = await fileManagerService.readFile('public/config/app.config.yaml')
  configContent.value = content
})

async function saveConfig() {
  // 保存配置文件
  await fileManagerService.writeFile('public/config/app.config.yaml', configContent.value)
  alert('保存成功！')
}
</script>

<template>
  <div>
    <textarea v-model="configContent"></textarea>
    <button @click="saveConfig">保存配置</button>
  </div>
</template>
```

### 2. 配置文件编辑器

```typescript
import { fileManagerService } from '@/core/services/FileManagerService'

// 读取所有配置文件
async function loadAllConfigs() {
  const files = await fileManagerService.listFiles('public/config')
  const configs = []
  
  for (const file of files) {
    if (!file.isDirectory && file.name.endsWith('.yaml')) {
      const content = await fileManagerService.readFile(file.path)
      configs.push({ name: file.name, content })
    }
  }
  
  return configs
}

// 批量更新配置
async function updateConfigs(configs: Array<{ path: string, content: string }>) {
  for (const config of configs) {
    await fileManagerService.writeFile(config.path, config.content)
  }
}
```

### 3. 图片管理器

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { fileManagerService } from '@/core/services/FileManagerService'

const images = ref<string[]>([])

async function loadImages() {
  const files = await fileManagerService.listFiles('public/img')
  images.value = files
    .filter(f => !f.isDirectory && /\.(png|jpg|jpeg|gif|svg)$/i.test(f.name))
    .map(f => f.path)
}

async function uploadImage(file: File) {
  const path = `public/img/${file.name}`
  await fileManagerService.uploadFile(path, file)
  await loadImages()
}

async function deleteImage(path: string) {
  if (confirm('确定删除？')) {
    await fileManagerService.deleteFile(path)
    await loadImages()
  }
}
</script>

<template>
  <div>
    <input type="file" @change="e => uploadImage(e.target.files[0])" accept="image/*" />
    
    <div class="image-grid">
      <div v-for="img in images" :key="img">
        <img :src="`/${img}`" />
        <button @click="deleteImage(img)">删除</button>
      </div>
    </div>
  </div>
</template>
```

### 4. 页面模板生成器

```typescript
import { fileManagerService } from '@/core/services/FileManagerService'

async function createNewPage(pageName: string, template: string) {
  const fileName = `${pageName}.vue`
  const filePath = `src/views/${fileName}`
  
  // 检查文件是否已存在
  try {
    await fileManagerService.readFile(filePath)
    throw new Error('文件已存在')
  } catch (error) {
    // 文件不存在，可以创建
  }
  
  // 创建新页面
  const content = `<template>
  <DefaultContentPage>
    <template #header>
      <h1>${pageName}</h1>
    </template>
    
    <template #content>
      ${template}
    </template>
  </DefaultContentPage>
</template>

<script setup lang="ts">
import DefaultContentPage from '@/components/layout/pagecontainer/DefaultContentPage.vue'
</script>
`
  
  await fileManagerService.writeFile(filePath, content)
  return filePath
}

// 使用示例
await createNewPage('MyNewPage', '<p>这是新页面的内容</p>')
```

### 5. 配置备份与恢复

```typescript
import { fileManagerService } from '@/core/services/FileManagerService'

// 备份所有配置文件
async function backupConfigs() {
  const files = await fileManagerService.listFiles('public/config')
  const backup: Record<string, string> = {}
  
  for (const file of files) {
    if (!file.isDirectory) {
      const content = await fileManagerService.readFile(file.path)
      backup[file.name] = content
    }
  }
  
  // 保存到本地存储
  localStorage.setItem('config-backup', JSON.stringify(backup))
  return backup
}

// 恢复配置文件
async function restoreConfigs() {
  const backupStr = localStorage.getItem('config-backup')
  if (!backupStr) {
    throw new Error('没有找到备份')
  }
  
  const backup = JSON.parse(backupStr)
  
  for (const [fileName, content] of Object.entries(backup)) {
    await fileManagerService.writeFile(`public/config/${fileName}`, content as string)
  }
}
```

### 6. 实时配置同步

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { fileManagerService } from '@/core/services/FileManagerService'
import { debounce } from 'lodash-es' // 需要安装 lodash-es

const configPath = 'public/config/app.config.yaml'
const configContent = ref('')

// 加载配置
async function loadConfig() {
  configContent.value = await fileManagerService.readFile(configPath)
}

// 保存配置（防抖）
const saveConfig = debounce(async () => {
  await fileManagerService.writeFile(configPath, configContent.value)
  console.log('配置已自动保存')
}, 1000)

// 监听变化并自动保存
watch(configContent, () => {
  saveConfig()
})

onMounted(loadConfig)
</script>

<template>
  <div>
    <h2>实时配置编辑器</h2>
    <textarea v-model="configContent" rows="20"></textarea>
    <p class="text-[12px] text-gray-500">更改会自动保存</p>
  </div>
</template>
```

### 7. 文件搜索功能

```typescript
import { fileManagerService } from '@/core/services/FileManagerService'

async function searchInFiles(directory: string, searchText: string) {
  const files = await fileManagerService.listFiles(directory)
  const results = []
  
  for (const file of files) {
    if (!file.isDirectory) {
      const content = await fileManagerService.readFile(file.path)
      if (content.includes(searchText)) {
        // 找到匹配的行
        const lines = content.split('\n')
        const matchedLines = lines
          .map((line, index) => ({ line, lineNumber: index + 1 }))
          .filter(({ line }) => line.includes(searchText))
        
        results.push({
          file: file.path,
          matches: matchedLines
        })
      }
    }
  }
  
  return results
}

// 使用示例
const results = await searchInFiles('src/views', 'DefaultContentPage')
console.log('搜索结果:', results)
```

### 8. 批量文件操作

```typescript
import { fileManagerService } from '@/core/services/FileManagerService'

// 批量重命名文件（通过读取-删除-写入实现）
async function renameFiles(directory: string, pattern: RegExp, replacement: string) {
  const files = await fileManagerService.listFiles(directory)
  
  for (const file of files) {
    if (!file.isDirectory && pattern.test(file.name)) {
      const newName = file.name.replace(pattern, replacement)
      const newPath = file.path.replace(file.name, newName)
      
      // 读取内容
      const content = await fileManagerService.readFile(file.path)
      
      // 写入新文件
      await fileManagerService.writeFile(newPath, content)
      
      // 删除旧文件
      await fileManagerService.deleteFile(file.path)
      
      console.log(`重命名: ${file.name} -> ${newName}`)
    }
  }
}

// 批量删除匹配的文件
async function deleteMatchingFiles(directory: string, pattern: RegExp) {
  const files = await fileManagerService.listFiles(directory)
  
  for (const file of files) {
    if (!file.isDirectory && pattern.test(file.name)) {
      await fileManagerService.deleteFile(file.path)
      console.log(`删除: ${file.name}`)
    }
  }
}
```

## 错误处理最佳实践

```typescript
import { fileManagerService } from '@/core/services/FileManagerService'

async function safeFileOperation() {
  try {
    // 检查服务是否可用
    const isAvailable = await fileManagerService.isAvailable()
    if (!isAvailable) {
      console.warn('文件管理服务不可用（仅开发环境）')
      return
    }
    
    // 执行文件操作
    const content = await fileManagerService.readFile('public/config/app.config.yaml')
    
    // 处理内容...
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        console.error('权限被拒绝：无法访问该文件')
      } else if (error.message.includes('not found')) {
        console.error('文件不存在')
      } else {
        console.error('文件操作失败:', error.message)
      }
    }
  }
}
```

## 性能优化建议

1. **使用防抖/节流**：频繁的文件写入操作应该使用防抖或节流
2. **批量操作**：尽可能合并多个文件操作
3. **缓存读取结果**：对于不常变化的文件，可以缓存读取结果
4. **异步并发**：使用 `Promise.all()` 并发执行独立的文件操作

```typescript
// 并发读取多个文件
const [config1, config2, config3] = await Promise.all([
  fileManagerService.readFile('public/config/app.config.yaml'),
  fileManagerService.readFile('public/config/routes.config.yaml'),
  fileManagerService.readFile('public/config/themes.config.yaml')
])
```
