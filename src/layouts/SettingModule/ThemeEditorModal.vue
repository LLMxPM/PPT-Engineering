<!--
  文件用途：主题编辑弹窗（ThemeEditorModal.vue）
  主要功能：
  - 新增或编辑主题的基础信息、Logo、调色板与字体排印
  - 上传图片到 `public/img/logo`、上传字体到 `public/fonts` 并自动追加 `@font-face`
  - 以模态对话框形式独立呈现，供父组件控制显示与提交
  使用技术：Vue@3 + TypeScript@5 + Tailwind CSS@3
-->

<template>
  <EditorModal
    :visible="isVisible"
    :title="title"
    :widthVw="80"
    :heightVh="90"
    :zIndex="500"
    @update:visible="v => { if (!v) onCancel() }"
    @cancel="onCancel"
    @ok="onOk"
  >
      <div class="space-y-3">
        <div class="space-y-3">
          <!-- 主题键名 / 显示名称 / 描述 -->
          <div class="grid grid-cols-6 gap-2">
            <div class="col-span-1 grid grid-cols-1 gap-2">
              <label class="text-[12px] text-gray-600">主题键名</label>
              <input type="text" class="px-2 py-1.5 text-[14px] border border-gray-300 rounded-md" v-model="localKey"
                @input="markChanged" />
            </div>
            <div class="col-span-1 grid grid-cols-1 gap-2">
              <label class="text-[12px] text-gray-600">显示名称</label>
              <input type="text" class="px-2 py-1.5 text-[14px] border border-gray-300 rounded-md" v-model="localTheme.name"
                @input="markChanged" />
            </div>
            <div class="col-span-4 grid grid-cols-1 gap-2">
              <label class="text-[12px] text-gray-600">描述</label>
              <input type="text" class="px-2 py-1.5 text-[14px] border border-gray-300 rounded-md"
                v-model="localTheme.description" @input="markChanged" />
            </div>
          </div>
          <!-- Logo 与 反色Logo 选择 -->
          <div class="grid grid-cols-2 gap-2">
            <div class="grid grid-cols-1 gap-2">
              <label class="text-[12px] text-gray-600">Logo</label>
              <div class="flex items-center gap-2">
                <!-- 输入框占 2 份 -->
                <select class="w-2/3 px-2 h-9 text-[14px] border border-gray-300 rounded-md bg-white text-gray-700"
                  v-model="localTheme.logo" @change="markChanged">
                  <option value="">不使用</option>
                  <option v-for="item in logos" :key="item.publicPath" :value="item.publicPath">{{ item.name }}</option>
                </select>
                <!-- 按钮占 1 份 -->
                <button @click="triggerUpload('logo')"
                  class="w-1/3 px-3 h-9 text-[12px] font-medium border-0 rounded-md cursor-pointer transition-colors duration-150 bg-blue-500 text-white hover:bg-blue-600 shrink-0">
                  上传图片
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-2">
              <label class="text-[12px] text-gray-600">反色Logo</label>
              <div class="flex items-center gap-2">
                <!-- 输入框占 2 份 -->
                <select class="w-2/3 px-2 h-9 text-[14px] border border-gray-300 rounded-md bg-white text-gray-700"
                  v-model="localTheme.invertLogo" @change="markChanged">
                  <option value="">不使用</option>
                  <option v-for="item in logos" :key="item.publicPath" :value="item.publicPath">{{ item.name }}</option>
                </select>
                <!-- 按钮占 1 份 -->
                <button @click="triggerUpload('invertLogo')"
                  class="w-1/3 px-3 h-9 text-[12px] font-medium border-0 rounded-md cursor-pointer transition-colors duration-150 bg-blue-500 text-white hover:bg-blue-600 shrink-0">
                  上传图片
                </button>
              </div>
            </div>
          </div>
          <!-- 颜色设置 -->
          <div class="mt-2 p-2 bg-white border border-gray-200 rounded-md">
            <div class="text-[12px] font-semibold text-gray-700 mb-2">颜色设置</div>
            <div class="space-y-3">
              <div>
                <div class="grid grid-cols-6 gap-2">
                  <div class="space-y-1">
                    <label class="text-[12px] text-gray-600">text.primary</label>
                    <ColorPicker v-model="localTheme.palette.text.primary" @update:modelValue="markChanged" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[12px] text-gray-600">text.secondary</label>
                    <ColorPicker v-model="localTheme.palette.text.secondary" @update:modelValue="markChanged" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[12px] text-gray-600">text.invert</label>
                    <ColorPicker v-model="localTheme.palette.text.invert" @update:modelValue="markChanged" />
                  </div>
                                    <div class="space-y-1">
                    <label class="text-[12px] text-gray-600">link.default</label>
                    <ColorPicker v-model="localTheme.palette.link.default" @update:modelValue="markChanged" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[12px] text-gray-600">link.hover</label>
                    <ColorPicker v-model="localTheme.palette.link.hover" @update:modelValue="markChanged" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[12px] text-gray-600">link.visited</label>
                    <ColorPicker v-model="localTheme.palette.link.visited" @update:modelValue="markChanged" />
                  </div>
                </div>
              </div>

              <div>
                <div class="grid grid-cols-6 gap-2">
                  <div class="space-y-1">
                    <label class="text-[12px] text-gray-600">background.default</label>
                    <ColorPicker v-model="localTheme.palette.background.default" @update:modelValue="markChanged" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[12px] text-gray-600">background.invert</label>
                    <ColorPicker v-model="localTheme.palette.background.invert" @update:modelValue="markChanged" />
                  </div>
                                    <div class="space-y-1">
                    <label class="text-[12px] text-gray-600">border.default</label>
                    <ColorPicker v-model="localTheme.palette.border.default" @update:modelValue="markChanged" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[12px] text-gray-600">border.subtle</label>
                    <ColorPicker v-model="localTheme.palette.border.subtle" @update:modelValue="markChanged" />
                  </div>
                </div>
                
              </div>

              <div>
                <div class="grid grid-cols-4 gap-2">

                </div>
              </div>

              <div class="mt-2">
                <div class="text-[12px] font-semibold text-gray-700 mb-1">accent 强调色</div>
                <div class="grid grid-cols-6 gap-2">
                  <div v-for="(color, idx) in localTheme.palette.accent" :key="idx" class="space-y-1">
                    <label class="text-[12px] text-gray-600">accent{{ idx + 1 }}</label>
                    <ColorPicker v-model="localTheme.palette.accent[idx]" @update:modelValue="markChanged" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- 字体设置 -->
          <div class="mt-2 p-2 bg-white border border-gray-200 rounded-md">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[12px] font-semibold text-gray-700">字体设置</span>
              <button
                @click="openFontPanel"
                class="px-3 h-7 text-[12px] font-medium border-0 rounded-md cursor-pointer transition-colors duration-150 bg-blue-500 text-white hover:bg-blue-600"
              >
                管理字体
              </button>
            </div>
            <div class="grid grid-cols-3 gap-x-4 gap-y-3">
              <!-- headingfont -->
              <div class="flex items-center gap-2">
                <label class="w-20 text-[12px] text-gray-600 shrink-0">headingfont</label>
                <select
                  class="flex-1 px-2 h-8 text-[14px] border border-gray-300 rounded-md bg-white text-gray-700"
                  v-model="localTheme.typography.headingfont"
                  @change="markChanged"
                >
                  <option v-for="opt in fontOptions" :key="opt.family" :value="opt.family">
                    {{ opt.family }}
                  </option>
                </select>
              </div>

              <!-- bodyfont -->
              <div class="flex items-center gap-2">
                <label class="w-20 text-[12px] text-gray-600 shrink-0">bodyfont</label>
                <select
                  class="flex-1 px-2 h-8 text-[14px] border border-gray-300 rounded-md bg-white text-gray-700"
                  v-model="localTheme.typography.bodyfont"
                  @change="markChanged"
                >
                  <option v-for="opt in fontOptions" :key="opt.family + '-b'" :value="opt.family">
                    {{ opt.family }}
                  </option>
                </select>
              </div>

              <!-- codefont -->
              <div class="flex items-center gap-2">
                <label class="w-20 text-[12px] text-gray-600 shrink-0">codefont</label>
                <select
                  class="flex-1 px-2 h-8 text-[14px] border border-gray-300 rounded-md bg-white text-gray-700"
                  v-model="localTheme.typography.codefont"
                  @change="markChanged"
                >
                  <option v-for="opt in fontOptions" :key="opt.family + '-c'" :value="opt.family">
                    {{ opt.family }}
                  </option>
                </select>
              </div>

              <!-- baseFontSize -->
              <div class="flex items-center gap-2">
                <label class="w-20 text-[12px] text-gray-600 shrink-0">baseFontSize</label>
                <input
                  type="text"
                  class="flex-1 px-2 h-8 text-[14px] border border-gray-300 rounded-md"
                  v-model="localTheme.typography.baseFontSize"
                  @input="markChanged"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
  </EditorModal>
  <EditorModal
    :visible="fontPanelVisible"
    title="字体资源管理"
    :widthVw="70"
    :heightVh="90"
    :zIndex="500"
    :showFooter="false"
    @update:visible="v => { if (!v) closeFontPanel() }"
    @cancel="closeFontPanel"
  >
    <div class="flex-1 h-[calc(80vh-30px)] ">
      <FontResourcePanel />
    </div>
  </EditorModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import ColorPicker from '@/components/editor/ColorPicker.vue'
import { fileManagerService } from '@/core/services/FileManagerService'
import { useToast } from '@/core/composables/useToast'
import FontResourcePanel from '@/layouts/SettingModule/ResourceManger/FontResourcePanel.vue'
import EditorModal from '@/components/editor/EditorModal.vue'

interface ThemePalette { text: { primary?: string; secondary?: string; invert?: string }; background: { default?: string; invert?: string }; border: { default?: string; subtle?: string }; link: { default?: string; hover?: string; visited?: string }; accent: string[] }
interface ThemeTypography { headingfont?: string; bodyfont?: string; codefont?: string; baseFontSize?: string }
interface ThemeDef { name?: string; description?: string; logo?: string; invertLogo?: string; palette: ThemePalette; typography: ThemeTypography }

interface Props { visible: boolean; title?: string; theme: ThemeDef; themeKey?: string }
interface Emits { (e: 'update:visible', v: boolean): void;(e: 'submit', payload: { key: string; theme: ThemeDef }): void;(e: 'cancel'): void }

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isVisible = ref(props.visible)
const { showToast } = useToast()
const localTheme = ref<ThemeDef>(JSON.parse(JSON.stringify(props.theme)))
const localKey = ref<string>(props.themeKey || '')
const changed = ref(false)

const title = computed(() => props.title || '编辑主题')

watch(() => props.visible, v => { isVisible.value = v })
watch(isVisible, v => emit('update:visible', v))
watch(() => props.theme, v => { localTheme.value = JSON.parse(JSON.stringify(v)) })
watch(() => props.themeKey, v => { localKey.value = v || '' })

/** 标记主题内容已更改，用于提交前提示或触发外部保存逻辑 */
function markChanged(): void { changed.value = true }

/** 取消编辑并关闭弹窗 */
function onCancel(): void { isVisible.value = false; emit('cancel') }

/** 提交编辑后的主题数据并关闭弹窗 */
function onOk(): void {
  const payload = { key: (localKey.value || '').trim(), theme: JSON.parse(JSON.stringify(localTheme.value)) }
  emit('submit', payload)
  isVisible.value = false
}

const logos = ref<{ name: string; publicPath: string }[]>([])
function isImageFile(name: string): boolean { return /\.(png|jpe?g|svg|webp)$/i.test(name) }

/** 加载 Logo 文件列表，仅筛选图片类型并生成公共访问路径 */
async function loadLogoFiles(): Promise<void> {
  try {
    const files = await fileManagerService.listFiles('public/img/logo')
    logos.value = (files || []).filter((f: any) => !f.isDirectory && isImageFile(f.name)).map((f: any) => ({ name: f.name, publicPath: `/img/logo/${f.name}` }))
  } catch { }
}

/** 保证图片文件名在目标目录下唯一，若冲突则追加递增序号 */
function ensureUniqueFilename(name: string): string {
  const existing = new Set(logos.value.map(l => l.name))
  if (!existing.has(name)) return name
  const dot = name.lastIndexOf('.')
  const base = dot >= 0 ? name.slice(0, dot) : name
  const ext = dot >= 0 ? name.slice(dot) : ''
  let idx = 1
  let candidate = ''
  do { candidate = `${base}-${idx}${ext}`; idx++ } while (existing.has(candidate))
  return candidate
}

/** 上传 Logo 图片到 public 目录并回填到对应字段 */
async function uploadLogoImage(target: 'logo' | 'invertLogo', file: File): Promise<void> {
  try {
    const finalName = ensureUniqueFilename(file.name)
    await fileManagerService.uploadFile(`public/img/logo/${finalName}`, file)
    await loadLogoFiles()
    const publicPath = `/img/logo/${finalName}`
    if (target === 'logo') localTheme.value.logo = publicPath
    else localTheme.value.invertLogo = publicPath
    markChanged()
    showToast({ type: 'success', message: '上传成功' })
  } catch (err: any) { showToast({ type: 'info', message: '上传失败：' + (err?.message || '') }) }
}

/** 触发图片文件选择并上传到指定 Logo 字段 */
function triggerUpload(target: 'logo' | 'invertLogo'): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => { const file = input.files?.[0]; if (file) uploadLogoImage(target, file) }
  input.click()
}

const registeredFamilies = ref<string[]>([])

/** 读取并解析已注册字体（src/styles/fonts.css），用于构建选择项 */
async function loadRegisteredFontsCss(): Promise<void> {
  try {
    const css = await fileManagerService.readFile('src/styles/fonts.css')
    const famSet = new Set<string>()
    const blocks = css.match(/@font-face\s*\{[\s\S]*?\}/g) || []
    for (const b of blocks) {
      const fm = /font-family:\s*['"]([^'\"]+)['"]/i.exec(b)
      if (fm && fm[1]) famSet.add(fm[1])
    }
    registeredFamilies.value = Array.from(famSet)
  } catch { registeredFamilies.value = [] }
}

const fontPanelVisible = ref(false)

/** 打开字体资源管理面板 */
function openFontPanel(): void { fontPanelVisible.value = true }

/** 关闭字体资源管理面板并刷新已注册字体 */
async function closeFontPanel(): Promise<void> { fontPanelVisible.value = false; await loadRegisteredFontsCss() }

const fontOptions = computed(() => {
  const base = [
    { family: 'system-ui', name: 'system-ui', publicPath: '' },
    { family: 'sans-serif', name: 'sans-serif', publicPath: '' },
    { family: 'monospace', name: 'monospace', publicPath: '' }
  ]
  const uploaded = registeredFamilies.value.map(f => ({ family: f, name: f, publicPath: '' }))
  const map: Record<string, boolean> = {}
  const result: { family: string; name: string; publicPath: string }[] = []
  ;[...base, ...uploaded].forEach(f => { if (!map[f.family]) { map[f.family] = true; result.push(f) } })
  return result
})

onMounted(() => { loadLogoFiles(); loadRegisteredFontsCss() })
onUnmounted(() => { })
</script>

<style scoped>
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>