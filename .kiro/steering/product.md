---
inclusion: always
---

# 产品概述

PPT Engineering 是一个基于 Vue 的框架，用于以编程方式构建演示文稿幻灯片，旨在降低生成 PPT 内容时对 AI 上下文的依赖。

## 核心理念

不使用传统的 .ppt 文件，而是直接用 Vue 组件构建演示页面。系统采用配置驱动，大多数变更只需修改 YAML 文件，无需改动源码。

## 主要功能

- **配置驱动**：核心设置集中在 `public/config/*.yaml`（app、routes、themes、icons）
- **组件化页面**：标准页面容器（`DefaultContentPage`、`DefaultCoverPage`、`DefaultContainer`）确保尺寸和布局一致
- **降低上下文依赖**：页面自包含，专注于单个 Vue 文件
- **统一主题系统**：扩展 Tailwind CSS，集中管理颜色和字体
- **全屏演示**：支持键盘导航（PageUp/Down、空格、方向键）
- **PDF 导出**：使用 snapdom 库将演示导出为全图 PDF 文件

## 目标用例

为 AI 辅助 PPT 创建而构建，适用于 LLM 具有强大通用能力但记忆有限的场景。该框架通过分离页面内容和路由配置，并使用标准化组件来最小化上下文需求。

## 许可证

GPL-3.0-or-later
