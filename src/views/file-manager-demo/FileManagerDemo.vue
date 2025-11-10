<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold mb-8 text-gray-800">文件管理器演示</h1>

      <!-- 可用性检查 -->
      <div v-if="!isAvailable" class="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
        <p class="text-yellow-700">⚠️ 文件管理服务不可用（仅在开发环境下可用）</p>
      </div>

      <!-- 目录选择 -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">选择目录</h2>
        <div class="flex gap-2">
          <button
            v-for="dir in allowedDirs"
            :key="dir"
            @click="currentDir = dir"
            :class="[
              'px-4 py-2 rounded transition-colors',
              currentDir === dir
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            ]"
          >
            {{ dir }}
          </button>
        </div>
      </div>

      <!-- 文件列表 -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">文件列表</h2>
          <button
            @click="loadFiles"
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            刷新
          </button>
        </div>

        <div v-if="loading" class="text-center py-8 text-gray-500">加载中...</div>

        <div v-else-if="files.length === 0" class="text-center py-8 text-gray-500">
          目录为空
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="file in files"
            :key="file.path"
            class="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
          >
            <div class="flex items-center gap-3">
              <span v-if="file.isDirectory" class="text-2xl">📁</span>
              <span v-else class="text-2xl">📄</span>
              <div>
                <div class="font-medium">{{ file.name }}</div>
                <div class="text-sm text-gray-500">
                  {{ formatSize(file.size) }} · {{ formatDate(file.modified) }}
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                v-if="!file.isDirectory"
                @click="readFileContent(file.path)"
                class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                读取
              </button>
              <button
                v-if="!file.isDirectory && canDelete"
                @click="deleteFileConfirm(file.path)"
                class="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 文件内容编辑器 -->
      <div v-if="selectedFile" class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">编辑文件: {{ selectedFile }}</h2>
          <div class="flex gap-2">
            <button
              @click="saveFile"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              保存
            </button>
            <button
              @click="closeEditor"
              class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
        <textarea
          v-model="fileContent"
          class="w-full h-96 p-4 border rounded font-mono text-sm"
          placeholder="文件内容..."
        ></textarea>
      </div>

      <!-- 文件上传 -->
      <div v-if="canUpload" class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">上传文件</h2>
        <div class="flex items-center gap-4">
          <input
            type="file"
            ref="fileInput"
            @change="handleFileSelect"
            class="flex-1"
          />
          <button
            @click="uploadFile"
            :disabled="!selectedUploadFile"
            class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:bg-gray-400"
          >
            上传到 {{ currentDir }}
          </button>
        </div>
      </div>

      <!-- 消息提示 -->
      <div
        v-if="message"
        :class="[
          'fixed bottom-4 right-4 px-6 py-3 rounded shadow-lg',
          message.type === 'success' ? 'bg-green-500' : 'bg-red-500',
          'text-white'
        ]"
      >
        {{ message.text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fileManagerService, type FileInfo } from '@/core/services/FileManagerService'

const allowedDirs = ['public/config', 'public/img', 'src/views']
const currentDir = ref('public/config')
const files = ref<FileInfo[]>([])
const loading = ref(false)
const isAvailable = ref(false)

const selectedFile = ref<string | null>(null)
const fileContent = ref('')

const fileInput = ref<HTMLInputElement | null>(null)
const selectedUploadFile = ref<File | null>(null)

const message = ref<{ text: string; type: 'success' | 'error' } | null>(null)

const canDelete = computed(() => {
  return currentDir.value === 'public/img' || currentDir.value === 'src/views'
})

const canUpload = computed(() => {
  return currentDir.value === 'public/img' || currentDir.value === 'src/views'
})

// 加载文件列表
async function loadFiles() {
  loading.value = true
  try {
    files.value = await fileManagerService.listFiles(currentDir.value)
  } catch (error: any) {
    showMessage(error.message, 'error')
  } finally {
    loading.value = false
  }
}

// 读取文件内容
async function readFileContent(filePath: string) {
  try {
    const content = await fileManagerService.readFile(filePath)
    selectedFile.value = filePath
    fileContent.value = content
  } catch (error: any) {
    showMessage(error.message, 'error')
  }
}

// 保存文件
async function saveFile() {
  if (!selectedFile.value) return

  try {
    await fileManagerService.writeFile(selectedFile.value, fileContent.value)
    showMessage('文件保存成功', 'success')
    await loadFiles()
  } catch (error: any) {
    showMessage(error.message, 'error')
  }
}

// 关闭编辑器
function closeEditor() {
  selectedFile.value = null
  fileContent.value = ''
}

// 删除文件确认
function deleteFileConfirm(filePath: string) {
  if (confirm(`确定要删除文件 ${filePath} 吗？`)) {
    deleteFileAction(filePath)
  }
}

// 删除文件
async function deleteFileAction(filePath: string) {
  try {
    await fileManagerService.deleteFile(filePath)
    showMessage('文件删除成功', 'success')
    await loadFiles()
  } catch (error: any) {
    showMessage(error.message, 'error')
  }
}

// 选择上传文件
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedUploadFile.value = target.files[0]
  }
}

// 上传文件
async function uploadFile() {
  if (!selectedUploadFile.value) return

  const fileName = selectedUploadFile.value.name
  const targetPath = `${currentDir.value}/${fileName}`

  try {
    await fileManagerService.uploadFile(targetPath, selectedUploadFile.value)
    showMessage('文件上传成功', 'success')
    selectedUploadFile.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }
    await loadFiles()
  } catch (error: any) {
    showMessage(error.message, 'error')
  }
}

// 显示消息
function showMessage(text: string, type: 'success' | 'error') {
  message.value = { text, type }
  setTimeout(() => {
    message.value = null
  }, 3000)
}

// 格式化文件大小
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// 格式化日期
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 检查服务可用性
onMounted(async () => {
  isAvailable.value = await fileManagerService.isAvailable()
  if (isAvailable.value) {
    await loadFiles()
  }
})

// 监听目录变化
import { watch } from 'vue'
watch(currentDir, () => {
  closeEditor()
  loadFiles()
})
</script>
