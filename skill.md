---
name: md-to-ppt
description: 将 Markdown 技术文档转换为 PowerPoint 演示文稿。支持 Mermaid 图表渲染、内联格式、表格、引述、代码块、智能分页、横竖版布局
---
# Markdown 转 PowerPoint 转换器 v1.0

将 Markdown 技术文档转换为 PowerPoint 演示文稿。

## 核心功能

- **Mermaid 图表**：流程图、时序图、类图、状态图、甘特图、饼图、思维导图
- **内联格式**：`**加粗**`、`*斜体*`、`` `代码` ``
- **表格**：支持单元格内联格式
- **引述**：`> 内容`（浅蓝背景 + 💡 图标）
- **代码块**：语法高亮，灰底显示
- **智能分页**：内容超页自动新建幻灯片
- **布局**：竖版 7.5"×10.83" / 横版 10"×7.5"

## 快速开始

```bash
# 竖版布局（默认）
node scripts/md_to_ppt.js -i input.md -o output.pptx

# 竖版 + SVG 格式
node scripts/md_to_ppt.js -i input.md -o output.pptx --mermaid-format svg

# 竖版 + PNG 格式
node scripts/md_to_ppt.js -i input.md -o output.pptx --mermaid-format png

# 横版布局
node scripts/md_to_ppt.js -i input.md -o output.pptx -l landscape
```

## 命令选项

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--input` | `-i` | 输入 markdown 文件（必需） | - |
| `--output` | `-o` | 输出 pptx 文件（必需） | - |
| `--layout` | `-l` | 布局：`portrait`/`landscape` | `portrait` |
| `--width` | `-w` | 幻灯片宽度（英寸） | 7.5(竖) / 10(横) |
| `--height` | `-h` | 幻灯片高度（英寸） | 10.83(竖) / 7.5(横) |
| `--font` | `-f` | 字体名称 | 微软雅黑 |
| `--title` | `-t` | 演示文稿标题 | 技术文档 |
| `--mermaid-format` | - | Mermaid 输出格式：`emf`/`svg`/`png` | `emf` |
| `--no-mermaid` | - | 禁用 Mermaid 渲染 | - |
| `--no-fallback` | - | 禁用 PNG 降级 | - |
| `--help` | - | 显示帮助 | - |

## Markdown 元素映射

| 元素 | 语法 | PPT 映射 |
|------|------|----------|
| 封面 | `# 标题` | 封面页 |
| 主标题 | `## 标题` | 第1行标题框 |
| 副标题 | `### 标题` | 第2行副标题框 |
| 小标题 | `#### 标题` | 内容区【标题】 |
| 无序列表 | `- 项目` | 项目符号 |
| 编号列表 | `1. 项目` | 编号列表 |
| 代码块 | ` ```lang ` ` | 灰底代码框 |
| Mermaid | ` ```mermaid ` ` | 渲染为图表 |
| 表格 | `\| 列1 \| 列2 \|` | 表格（支持内联格式） |
| 引述 | `> 内容` | 浅蓝引述框 + 💡 |

## 内联格式

| 格式 | 语法 | 效果 |
|------|------|------|
| 加粗 | `**text**` 或 `__text__` | **粗体** |
| 斜体 | `*text*` 或 `_text_` | *斜体* |
| 加粗斜体 | `***text***` 或 `___text___` | ***粗斜体*** |
| 行内代码 | `` `code` `` | `代码` |

## Mermaid 输出格式

| 格式 | 可编辑性 | 依赖 | 说明 |
|------|----------|------|------|
| **EMF** | ✅ 取消组合可编辑 | Inkscape | 默认格式，PPT 中可编辑 |
| **SVG** | ❌ 图片嵌入 | 无 | 矢量图，可在 PPT 中手动转换为形状 |
| **PNG** | ❌ 光栅图 | 无 | 最高兼容性 |

## 支持的 Mermaid 图表

| 类型 | 关键词 | 说明 |
|------|--------|------|
| 流程图 | `graph TD`, `graph LR` | 自上而下/自左而右 |
| 时序图 | `sequenceDiagram` | 多参与者时序交互 |
| 类图 | `classDiagram` | 类结构与关系 |
| 状态图 | `stateDiagram` | 状态转换 |
| 甘特图 | `gantt` | 项目时间计划 |
| 饼图 | `pie` | 数据占比 |
| 思维导图 | `mindmap` | 层级结构 |

## 布局结构

```
┌─────────────────────────────────┐
│ [## 标题]          [页码]       │ 第1行
├─────────────────────────────────┤
│ [### 副标题]                   │ 第2行
├─────────────────────────────────┤
│                                 │
│  内容正文区                     │ 第3行
│  - 列表  表格  引述  图表      │
│                                 │
└─────────────────────────────────┘
```

## 依赖

```bash
npm install

# Mermaid 渲染（可选）
npm install -g @mermaid-js/mermaid-cli

# EMF 格式需要 Inkscape
# Windows: https://inkscape.org
# macOS: brew install --cask inkscape
# Linux: sudo apt install inkscape
```

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| Mermaid 未渲染 | 运行 `mmdc --version` 检查，或用 `--no-mermaid` |
| EMF 降级为 SVG | 检查 Inkscape 是否正确安装 |
| 临时文件未清理 | 清理 `%TEMP%\md-to-ppt-mermaid\` |
