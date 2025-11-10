---
inclusion: always
---

# 技术栈

## 核心技术

- **框架**：Vue 3.4+ 使用 Composition API
- **语言**：TypeScript 5.3+
- **构建工具**：Vite 5.0+
- **路由**：Vue Router 4.2+
- **样式**：Tailwind CSS 3.4+ 带自定义主题扩展
- **包管理器**：pnpm 10.0.0（必需）

## 关键库

- **UI/图标**：lucide-vue-next（图标系统）
- **工具**：clsx、tailwind-merge（类管理）
- **图表**：mermaid、svg-pan-zoom（图表渲染）
- **导出**：jspdf、@zumer/snapdom（PDF 生成）
- **配置**：js-yaml、yaml（YAML 解析）

## 开发工具

- **代码检查**：ESLint 配合 Vue 3 + TypeScript 插件
- **代码格式化**：Prettier（无分号、单引号、2 空格缩进）
- **类型检查**：vue-tsc

## 常用命令

```bash
# 开发
pnpm dev              # 启动开发服务器（http://localhost:5173）

# 构建
pnpm build            # 类型检查 + 构建到 dist/
pnpm preview          # 预览生产构建（http://localhost:4173）

# 代码质量
pnpm check            # 仅类型检查
pnpm lint             # 运行 ESLint
pnpm lint:fix         # 自动修复 ESLint 问题
pnpm format           # 使用 Prettier 格式化
```

## 路径别名

- `@/` → `src/`
- `@components/` → `src/components/`
- `@views/` → `src/views/`
- `@utils/` → `src/utils/`
- `@types/` → `src/types/`
- `@styles/` → `src/styles/`

## 配置文件

- `public/config/app.config.yaml` - 应用设置（baseUrl、title 等）
- `public/config/routes.config.yaml` - 路由定义
- `public/config/themes.config.yaml` - 主题配置
- `public/config/icons.config.yaml` - 图标注册表
- `vite.config.ts` - Vite 构建配置
- `tailwind.config.js` - Tailwind 主题扩展
- `tsconfig.json` - TypeScript 编译器选项

## 浏览器目标

ES2020，支持 CSS 自定义属性的现代浏览器
