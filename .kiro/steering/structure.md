---
inclusion: always
---

# 项目结构

## 目录组织

```
├── public/
│   ├── config/          # YAML 配置文件（app、routes、themes、icons）
│   ├── img/             # 静态图片
│   └── favicon.svg
├── src/
│   ├── components/      # 可复用的 Vue 组件
│   │   ├── common/      # 通用组件（AppIcon、MermaidViewer 等）
│   │   └── layout/      # 布局组件
│   │       ├── contentcommon/  # 内容组件（Icon、MermaidChart 等）
│   │       └── pagecontainer/  # 页面容器（DefaultContentPage 等）
│   ├── core/            # 核心应用逻辑
│   │   ├── composables/ # Vue 组合式函数（useTheme、useIcon、usePageNavigation）
│   │   ├── router/      # 路由配置
│   │   ├── services/    # 服务（PDFExportService、PageCaptureService）
│   │   ├── types/       # TypeScript 类型定义
│   │   └── utils/       # 工具函数（config、route-generator 等）
│   ├── layouts/         # 布局组件（ResponsiveLayout、NestedLayout 等）
│   ├── styles/          # 全局样式
│   ├── views/           # 按模块组织的页面组件
│   ├── App.vue          # 根组件
│   └── main.ts          # 应用入口点
├── docs/                # 文档指南
└── dist/                # 构建输出（生成的）
```

## 关键架构模式

### 配置驱动架构

所有主要功能都通过 `public/config/` 中的 YAML 文件控制：
- 路由从 `routes.config.yaml` 自动生成
- 主题从 `themes.config.yaml` 加载
- 图标从 `icons.config.yaml` 注册

### 组件层次结构

**页面容器**（每个页面选择一个）：
- `DefaultContentPage` - 标准三段式布局（页头、内容、页脚）
- `DefaultCoverPage` - 章节封面页，居中标题
- `DefaultContainer` - 自由形式的自定义布局

**内容组件**（在页面容器内使用）：
- `Icon` - 统一的图标渲染
- `MermaidChart` - Mermaid 图表渲染
- `DrawioChart` - Drawio 图表渲染

### 视图组织

页面在 `src/views/` 中按模块组织：
```
views/
├── defaultpage/         # 默认页面（首页、结束页、目录）
├── feature-showcase/    # 功能展示页面
├── multi-round-dialog/  # 多轮对话示例
└── ppt-presentation/    # 演示文稿专用页面
```

每个模块通常包含：
- 父路由组件（模块概览/索引）
- 子路由组件（具体页面）

### 核心系统文件

- `src/core/utils/config.ts` - 配置加载和解析
- `src/core/utils/route-generator.ts` - 从 YAML 动态生成路由
- `src/core/composables/useTheme.ts` - 主题管理
- `src/core/router/index.ts` - 路由初始化

## 文件命名约定

- **组件**：PascalCase（例如 `DefaultContentPage.vue`）
- **工具函数**：camelCase（例如 `route-generator.ts`）
- **视图**：组件用 PascalCase，目录用 kebab-case
- **配置文件**：kebab-case，带 `.config.yaml` 后缀

## 导入模式

使用路径别名以获得更清晰的导入：
```typescript
import DefaultContentPage from '@/components/layout/pagecontainer/DefaultContentPage.vue'
import { useTheme } from '@/core/composables/useTheme'
import type { RouteConfig } from '@/core/types/routes'
```

## 静态资源

- 放置在 `public/` 目录
- 使用 `@/core/utils/path` 中的 `resolveResourcePath()` 进行正确的路径解析
- 图片通常在 `public/img/`

## 样式写法
- 使用tailwind css,尽可能避免原生css写法