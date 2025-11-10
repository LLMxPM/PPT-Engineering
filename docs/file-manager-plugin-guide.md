# 文件管理插件使用指南

## 概述

Vite 文件管理插件为开发环境提供了文件读写 API，允许在浏览器中直接操作项目文件。

## 功能特性

- ✅ 读取文件内容
- ✅ 写入/更新文件
- ✅ 删除文件
- ✅ 上传文件
- ✅ 列出目录文件
- ✅ 权限控制（按目录配置）
- ✅ 仅在开发环境启用

## 允许操作的目录

默认配置下，以下目录可以进行文件操作：

| 目录 | 读取 | 写入 | 删除 | 上传 |
|------|------|------|------|------|
| `public/config` | ✅ | ✅ | ❌ | ❌ |
| `public/img` | ✅ | ✅ | ✅ | ✅ |
| `src/views` | ✅ | ✅ | ✅ | ✅ |

## API 端点

所有 API 端点都以 `/__file-manager` 为前缀：

### 1. 列出文件

```
GET /__file-manager/list?path=<目录路径>
```

**响应示例：**
```json
{
  "files": [
    {
      "name": "app.config.yaml",
      "path": "public/config/app.config.yaml",
      "isDirectory": false,
      "size": 1024,
      "modified": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. 读取文件

```
GET /__file-manager/read?path=<文件路径>
```

**响应示例：**
```json
{
  "content": "文件内容...",
  "path": "public/config/app.config.yaml"
}
```

### 3. 写入文件

```
POST /__file-manager/write
Content-Type: application/json

{
  "path": "public/config/test.yaml",
  "content": "新的文件内容"
}
```

**响应示例：**
```json
{
  "success": true,
  "path": "public/config/test.yaml"
}
```

### 4. 删除文件

```
DELETE /__file-manager/delete
Content-Type: application/json

{
  "path": "public/img/test.png"
}
```

**响应示例：**
```json
{
  "success": true,
  "path": "public/img/test.png"
}
```

### 5. 上传文件

```
POST /__file-manager/upload
Content-Type: multipart/form-data

FormData:
  - file: <文件数据>
  - path: <目标路径>
```

**响应示例：**
```json
{
  "success": true,
  "path": "public/img/uploaded.png"
}
```

## 使用方法

### 方式一：使用 FileManagerService（推荐）

```typescript
import { fileManagerService } from '@/core/services/FileManagerService'

// 列出文件
const files = await fileManagerService.listFiles('public/config')

// 读取文件
const content = await fileManagerService.readFile('public/config/app.config.yaml')

// 写入文件
await fileManagerService.writeFile('public/config/test.yaml', 'content')

// 删除文件
await fileManagerService.deleteFile('public/img/test.png')

// 上传文件
const file = document.querySelector('input[type="file"]').files[0]
await fileManagerService.uploadFile('public/img/uploaded.png', file)

// 检查服务是否可用
const isAvailable = await fileManagerService.isAvailable()
```

### 方式二：直接调用 API

```typescript
// 读取文件
const response = await fetch('/__file-manager/read?path=public/config/app.config.yaml')
const data = await response.json()
console.log(data.content)

// 写入文件
await fetch('/__file-manager/write', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    path: 'public/config/test.yaml',
    content: 'new content'
  })
})
```

## 演示页面

访问 `/file-manager-demo` 查看完整的文件管理功能演示。

演示页面提供：
- 目录切换
- 文件列表查看
- 文件内容编辑
- 文件删除
- 文件上传

## 配置自定义

如需修改允许操作的目录，可以在 `vite.config.ts` 中配置：

```typescript
import viteFileManager from './src/core/plugins/vite-file-manager'

export default defineConfig({
  plugins: [
    viteFileManager({
      allowedDirs: [
        {
          path: 'public/config',
          read: true,
          write: true,
          delete: false,
          upload: false
        },
        {
          path: 'custom/path',
          read: true,
          write: true,
          delete: true,
          upload: true
        }
      ]
    })
  ]
})
```

## 安全注意事项

⚠️ **重要提示：**

1. 此插件仅在开发环境（`vite serve`）下启用
2. 生产构建时不会包含此插件
3. 默认配置限制了可操作的目录范围
4. 不建议在生产环境中使用类似功能
5. 确保 `.git` 等敏感目录不在允许列表中

## 故障排除

### 服务不可用

如果 `fileManagerService.isAvailable()` 返回 `false`：

1. 确认正在运行开发服务器（`pnpm dev`）
2. 检查 `vite.config.ts` 中是否正确导入并注册了插件
3. 查看浏览器控制台是否有错误信息

### 权限被拒绝

如果收到 "Access denied" 错误：

1. 检查目标路径是否在允许的目录列表中
2. 确认该目录的操作权限配置正确
3. 验证路径格式是否正确（使用 `/` 而不是 `\`）

### 文件上传失败

如果上传失败：

1. 确认目标目录允许上传操作
2. 检查文件大小是否过大
3. 验证 Content-Type 是否为 `multipart/form-data`

## 技术实现

- **插件类型**：Vite 中间件插件
- **依赖**：`parse-multipart-data`（用于文件上传）
- **路径验证**：基于白名单的权限控制
- **错误处理**：统一的错误响应格式
