import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { parse } from 'yaml'
import viteFileManager from './src/core/plugins/vite-file-manager'

/**
 * 从app.config.yaml读取baseUrl配置
 * @returns baseUrl配置值，默认为'/'
 */
function getBaseUrlFromConfig(): string {
  try {
    const configPath = resolve(__dirname, 'public/config/app.config.yaml')
    const configContent = readFileSync(configPath, 'utf-8')
    const config = parse(configContent)
    return config?.app?.baseUrl || '/'
  } catch (error) {
    console.warn('Failed to read baseUrl from app.config.yaml, using default "/":', error)
    return '/'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    viteFileManager({
      allowedDirs: [
        { path: 'public/config', read: true, write: true, delete: false, upload: false },
        { path: 'public/img', read: true, write: true, delete: true, upload: true },
        { path: 'src/views', read: true, write: true, delete: true, upload: true },
        { path: 'src/components/layout/pagecontainer', read: true, write: false, delete: false, upload: false },
        { path: 'public/fonts', read: true, write: true, delete: true, upload: true },
        { path: 'src/styles', read: true, write: true, delete: false, upload: false }
      ]
    }), // 文件管理插件（仅开发环境）
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@views': resolve(__dirname, 'src/views'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
      '@styles': resolve(__dirname, 'src/styles')
    }
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router']
        }
      }
    }
  },
  base: getBaseUrlFromConfig()
})
