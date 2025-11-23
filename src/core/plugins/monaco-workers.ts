/**
 * 文件用途：在开发环境中注册 Monaco Editor 所需的 Web Workers，确保编辑器正常工作。
 * 说明：仅在 `import.meta.env.DEV` 时由入口文件动态引入，不参与生产构建。
 */

// 为了简化类型处理，这里使用 any；该文件仅在浏览器环境下执行
declare const self: any

// 引入各语言与编辑器核心 worker（Vite 支持通过 ?worker 语法打包）
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import yamlWorker from 'monaco-yaml/yaml.worker?worker'

/**
 * 注册 Monaco 的 worker 获取逻辑
 * 根据 label 返回对应的 worker 实例
 */
self.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    if (label === 'yaml') return new yamlWorker()
    return new editorWorker()
  }
}

/**
 * 可选：开启全局 API（满足部分第三方封装依赖）
 * 参考：https://github.com/microsoft/monaco-editor/blob/main/docs/integrate-esm.md
 */
;(self as any).MonacoEnvironment = { ...(self as any).MonacoEnvironment, globalAPI: true }