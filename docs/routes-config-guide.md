# 路由配置指南

本文档详细说明了项目中路由配置文件 `public/config/routes.config.yaml` 的使用方法和参数说明。

## 快速开始

### 路由层级说明

本项目的路由系统采用**两级路由架构**：

- **有子路由的父路由**：仅作为菜单分组，不指向具体页面，不配置 `component`
- **无子路由的路由**：作为独立页面，必须配置 `component`
- **子路由**：作为独立的完整页面，必须配置 `component`

```
分组路由: /feature-showcase (仅分组，自动重定向到第一个子路由)
├── 子路由: /feature-showcase/index (独立页面组件)
├── 子路由: /feature-showcase/theme-showcase (独立页面组件)
└── 子路由: /feature-showcase/mermaid-showcase (独立页面组件)

独立路由: /home (独立页面组件，无子路由)
```

> **注意**：访问有子路由的父路由 URL 时，会自动重定向到 `order` 最小的子路由页面。

### 添加新模块和页面

#### 方式一：创建新模块（带子路由，推荐用于新功能模块）

1. **创建模块目录和组件文件**
   ```bash
   # 创建模块目录
   mkdir src/views/my-module
   
   # 创建页面组件（注意：父路由不需要组件）
   src/views/my-module/MyListPage.vue      # 子页面：列表页
   src/views/my-module/MyPreviewPage.vue   # 子页面：预览页
   ```

2. **在配置文件中添加模块路由**
   ```yaml
   # 编辑 public/config/routes.config.yaml
   routes:
     - route: "my-module"                    # 父路由路径（仅分组）
       meta:
         title: "我的模块"                     # 父路由标题
         icon: "Settings"                     # 父路由图标
         order: 10                            # 父路由排序
       children:                              # 子路由配置
         - route: "list"                     # 子路由路径
           component: "@/views/my-module/MyListPage.vue"
           meta:
             title: "列表"
             order: 10
         - route: "preview"                  # 子路由路径
           component: "@/views/my-module/MyPreviewPage.vue"
           meta:
             title: "预览"
             order: 20
   ```

#### 方式二：创建独立页面（无子路由）

```yaml
routes:
  - route: "simple-page"
    component: "@/views/SimplePage.vue"      # 独立页面必须配置组件
    meta:
      title: "简单页面"
      icon: "FileText"
      order: 5
```

#### 方式三：在现有模块下添加页面

1. **创建页面组件文件**
   ```bash
   # 在现有模块目录下创建新页面
   src/views/existing-module/NewPage.vue
   ```

2. **在现有模块的 children 中添加页面配置**
   ```yaml
   # 在现有模块的 children 数组中添加
   - route: "new-page"
     component: "@/views/existing-module/NewPage.vue"
     meta:
       title: "新页面"
       order: 30
   ```

3. **刷新页面**
   配置文件修改后，刷新浏览器页面即可看到新的路由和菜单项。

### 删除模块或页面

#### 删除整个模块

1. **从配置文件中移除模块配置**
2. **删除模块目录**（可选）

#### 删除模块下的单个页面

1. **从模块的 children 中移除页面配置**
2. **删除页面组件文件**（可选）

### 修改现有路由

- **修改标题**: 更改 `meta.title` 值
- **修改图标**: 更改 `meta.icon` 值
- **调整顺序**: 更改 `meta.order` 值
- **隐藏路由**: 添加 `meta.hidden: true`

## 参数详细说明

### 父路由参数

#### `route` (必需)
- **类型**: `string`
- **说明**: 父路由路径，用于构建 URL

#### `component` (条件必需)
- **类型**: `string`
- **说明**: 父路由对应的Vue组件文件路径
- **规则**: 
  - **有子路由时**：不配置此字段（父路由仅作分组）
  - **无子路由时**：必须配置此字段

#### `meta` (必需)
路由元信息对象，包含以下属性：

##### `title` (必需)
- **类型**: `string`
- **说明**: 模块标题，用于导航菜单显示

##### `icon` (可选)
- **类型**: `string`
- **说明**: 图标名称，用于导航菜单显示

##### `order` (必需)
- **类型**: `number`
- **说明**: 排序号，用于控制导航菜单中的显示顺序

##### `hidden` (可选)
- **类型**: `boolean`
- **说明**: 是否在导航菜单中隐藏该路由

#### `children` (可选)
子路由数组，定义该模块下的具体页面。

### 子路由参数

#### `route` (必需)
- **类型**: `string`
- **说明**: 子路由路径

#### `component` (必需)
- **类型**: `string`
- **说明**: 子路由对应的Vue组件文件路径

#### `meta` (必需)
子路由元信息对象：

##### `title` (必需)
- **类型**: `string`

##### `order` (必需)
- **类型**: `number`

##### `hidden` (可选)
- **类型**: `boolean`

## 路由生成规则

### 路径构建
1. **无子路由的路由**：直接使用 `route` 值作为路径
2. **有子路由的父路由**：自动重定向到第一个可见子路由
3. **子路由路径**: 父路径 + "/" + 子路由 `route` 值

### 页码分配规则
- **无子路由的路由**：按 `order` 顺序分配页码
- **有子路由的父路由**：不分配页码（仅作分组）
- **子路由**：按 `order` 顺序继续分配页码

### 导航菜单生成
1. **显示规则**: `hidden: true` 的路由不显示
2. **排序规则**: 按 `order` 值升序排列
3. **层级结构**: 自动根据父子关系构建菜单
4. **点击行为**: 
   - 无子路由的菜单项直接导航
   - 有子路由的菜单项展开/折叠子菜单，并导航到第一个子路由

## 完整配置示例

```yaml
routes:
  # 独立页面（无子路由，必须配置 component）
  - route: "home"
    component: "@/views/HomePage.vue"
    meta:
      title: "首页"
      icon: "Home"
      order: 0

  # 分组路由（有子路由，不配置 component）
  - route: "container-demo"
    meta:
      title: "容器组件演示"
      icon: "Layout"
      order: 2
    children:
      - route: "default-page"
        component: "@/views/container-demo/TestDefaultPage.vue"
        meta:
          title: "默认内容页面"
          order: 1
      - route: "404"
        component: "@/views/container-demo/xxxxx.vue"
        meta:
          title: "未找到页面文件"
          order: 2
          hidden: true

  # 独立页面
  - route: "endpage"
    component: "@/views/EndPage.vue"
    meta:
      title: "末页"
      icon: "Send"
      order: 10
```

## 常见问题

### Q: 父路由需要配置组件吗？
A: 取决于是否有子路由。有子路由时不配置（仅作分组），没有子路由时必须配置。

### Q: 访问有子路由的父路由 URL 会怎样？
A: 会自动重定向到该分组下 `order` 最小的可见子路由页面。

### Q: 页码是如何分配的？
A: 仅为实际页面（无子路由的路由和所有子路由）分配页码，分组路由不占用页码。

### Q: 路由配置修改后需要重启服务吗？
A: 不需要，配置文件位于 `public` 目录下，修改后刷新页面即可生效。

## 技术实现

路由配置的技术实现涉及以下文件：
- `src/core/utils/config.ts`: 配置加载和解析
- `src/core/utils/route-generator.ts`: 路由和菜单生成
- `src/core/types/routes.ts`: 类型定义
- `src/core/router/index.ts`: 路由注册
- `src/core/services/RouteConfigService.ts`: 路由配置CRUD服务