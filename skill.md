---
name: md-to-ppt
description: 将 Markdown 技术文档转换为 PowerPoint 演示文稿。支持：(1) MD 转 PPT，(2) 7 种 Mermaid 图表渲染，(3) EMF/SVG/PNG 多格式输出，(4) 可编辑形状转换，(5) 4 行母版布局结构，(6) 智能内容分页，(7) 内联格式支持，(8) 自定义横竖版布局
---
# Markdown 转 PowerPoint 转换器 v1.0

将 Markdown 技术文档转换为专业的 PowerPoint 演示文稿，支持 **Mermaid 图表渲染**、**EMF 矢量格式**、**可编辑形状转换**、**母版布局结构** 和 **智能内容分页**。

## 功能特性

### 1. Mermaid 图表渲染 (7 种类型)

使用 mermaid-cli (mmdc) 渲染 Mermaid 代码，支持 **EMF/SVG/PNG** 三种输出格式：

| 图表类型 | 关键词                                | 说明                    |
| -------- | ------------------------------------- | ----------------------- |
| 流程图   | `graph TD`, `graph LR`            | 自上而下/自左而右流程图 |
| 时序图   | `sequenceDiagram`                   | 多参与者时序交互        |
| 类图     | `classDiagram`                      | 类结构与关系            |
| 状态图   | `stateDiagram`, `stateDiagram-v2` | 状态转换图              |
| 甘特图   | `gantt`                             | 项目时间计划            |
| 饼图     | `pie`                               | 数据占比展示            |
| 思维导图 | `mindmap`                           | 层级思维结构            |

### 2. 多格式输出支持

| 格式          | 说明                      | 可编辑性                                                                                                                                      | 依赖     |
| ------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **EMF** | 默认格式，最佳 PPT 兼容性 | ✅ 原生可编辑（取消组合）                                                                                                                     | Inkscape |
| **SVG** | 矢量图，可作为图片嵌入    | ⚠️ 需要参数（--convert-svg-to-shapes）启用转换。不建议启用该参数，当前效果不好，建议在ppt中打开后后选中svg图右键手动转换为ppt的可编辑对象。 | 无       |
| **PNG** | 光栅图，最高兼容性        | ❌                                                                                                                                            | 无       |

### 3. 可编辑形状转换

SVG 格式可选转换为 PPT 原生形状（矩形、线条、文本）：

```bash
# 全部转换
--mermaid-format svg --convert-svg-to-shapes

# 按复杂度阈值转换（只转换简单图表）
--mermaid-format svg --convert-svg-to-shapes 50
```

**复杂度计算**：综合考虑矩形、路径、文本、圆形等元素数量。

### 4. 内联格式支持

| 格式     | 语法                             | 效果                 |
| -------- | -------------------------------- | -------------------- |
| 加粗     | `**text**` 或 `__text__`     | **粗体**       |
| 斜体     | `*text*` 或 `_text_`         | *斜体*             |
| 加粗斜体 | `***text***` 或 `___text___` | ***粗斜体*** |
| 行内代码 | `` `code` ``                     | `代码`             |

### 5. 母版布局结构

基于 4 行布局设计：

```
┌─────────────────────────────────────────────┐
│ ┌──────────┐  标题  ┌────────┐             │ 第1行 (y=0.17")
│ │ ## 标题  │        │  页码  │             │   主标题框 + 页码框
│ └──────────┘        └────────┘             │
├─────────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐  │ 第2行 (y=0.54")
│ │ ### 副标题                           │  │   三级标题框
│ └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│                                             │
│  内容正文区域                               │ 第3行 (y=0.89")
│  - 项目符号  【四级标题】                   │   内容区
│                                             │
└─────────────────────────────────────────────┘
```

### 6. 智能内容分页

自动计算内容高度，当内容超过可用空间时创建新幻灯片：

- 支持文本、列表、代码块、表格、Mermaid 图表的高度计算
- 避免内容溢出或截断

### 7. Markdown 元素支持

| 元素     | 语法               | 映射到 PPT         |
| -------- | ------------------ | ------------------ |
| 一级标题 | `# 标题`         | 封面页             |
| 二级标题 | `## 标题`        | 第1行主标题框      |
| 三级标题 | `### 标题`       | 第2行副标题框      |
| 四级标题 | `#### 标题`      | 内容区【标题】     |
| 无序列表 | `- 项目`         | 项目符号           |
| 编号列表 | `1. 项目`        | 编号列表           |
| 代码块   | ` ```python ` `  | 代码块（语法高亮） |
| Mermaid  | ` ```mermaid ` ` | 渲染为 EMF/SVG/PNG |
| 表格     | `\| 列1 \| 列2 \|`  | 表格               |

## 快速开始

### 基础转换（默认 EMF 格式）

```bash
node scripts/md_to_ppt.js -i test.md -o test.pptx
```

### SVG 格式（作为图片嵌入）

```bash
node scripts/md_to_ppt.js -i doc.md -o output.pptx --mermaid-format svg
```

### SVG 格式 + 可编辑转换

```bash
# 全部转换为可编辑形状
node scripts/md_to_ppt.js -i doc.md -o output.pptx --mermaid-format svg --convert-svg-to-shapes

# 只转换简单图表（复杂度 ≤ 50）
node scripts/md_to_ppt.js -i doc.md -o output.pptx --mermaid-format svg --convert-svg-to-shapes 50
```

### PNG 格式（最高兼容性）

```bash
node scripts/md_to_ppt.js -i doc.md -o output.pptx --mermaid-format png
```

### 横版布局

```bash
node scripts/md_to_ppt.js -i doc.md -o output.pptx -l landscape
```

## 命令行选项

| 选项                                | 简写   | 说明                                   | 默认值                  |
| ----------------------------------- | ------ | -------------------------------------- | ----------------------- |
| `--input`                         | `-i` | 输入 markdown 文件 (必需)              | -                       |
| `--output`                        | `-o` | 输出 PowerPoint 文件 (必需)            | -                       |
| `--layout`                        | `-l` | 布局类型:`landscape` 或 `portrait` | `portrait`            |
| `--width`                         | `-w` | 幻灯片宽度 (英寸)                      | 7.5(竖版) / 10(横版)    |
| `--height`                        | `-h` | 幻灯片高度 (英寸)                      | 10.83(竖版) / 7.5(横版) |
| `--font`                          | `-f` | 字体名称                               | 微软雅黑                |
| `--title`                         | `-t` | 演示文稿标题                           | 技术文档                |
| `--no-mermaid`                    | -      | 禁用 mermaid 渲染                      | -                       |
| `--mermaid-scale`                 | -      | Mermaid 渲染缩放比例                   | 2                       |
| `--mermaid-format`                | -      | 输出格式:`emf`, `svg`, `png`     | `emf`                 |
| `--convert-svg-to-shapes` `[n]` | -      | SVG 转可编辑形状（可选复杂度阈值）     | 不转换                  |
| `--no-fallback`                   | -      | 禁用 PNG 降级                          | -                       |
| `--help`                          | -      | 显示帮助信息                           | -                       |

## 格式选择指南

### EMF 格式（推荐）

- **优势**：在 PowerPoint 中可直接取消组合编辑，最佳兼容性
- **依赖**：需要安装 Inkscape
- **适用**：需要后续编辑图表的场景

### SVG 格式

- **优势**：矢量图，无 Inkscape 依赖
- **限制**：作为图片嵌入，不可直接编辑
- **适用**：不需要编辑图表，或使用 `--convert-svg-to-shapes` 参数

### PNG 格式

- **优势**：最高兼容性，所有软件都能打开
- **限制**：光栅图，缩放会模糊
- **适用**：兼容性优先的场景

## 布局预设

### 竖版 (portrait, 默认)

- 尺寸: 7.5" × 10.83"
- 适用: 技术文档、报告

### 横版 (landscape)

- 尺寸: 10" × 7.5"
- 适用: 标准演示文稿

## 使用示例

### 示例 1: 技术文档转 PPT（默认 EMF）

```bash
node scripts/md_to_ppt.js \
  -i CVP2.0控制算法技术文档.md \
  -o CVP2.0演示文稿.pptx \
  -t "CVP2.0控制算法"
```

### 示例 2: SVG 可编辑模式

```bash
node scripts/md_to_ppt.js \
  -i 文档.md \
  -o 演示.pptx \
  --mermaid-format svg \
  --convert-svg-to-shapes
```

### 示例 3: 自定义尺寸和字体

```bash
node scripts/md_to_ppt.js \
  -i 文档.md \
  -o 演示.pptx \
  -l portrait \
  -w 7.5 \
  -h 10.83 \
  -f 微软雅黑
```

## 代码架构

转换器采用模块化设计，包含核心模块和 SVG 处理器：

```
scripts/
├── md_to_ppt.js              # CLI 入口 (~150 行)
├── config.js                  # 布局和样式配置 (~100 行)
├── utils.js                   # 文本工具和图片计算 (~215 行)
├── master_slide.js            # 母版管理器 (~55 行)
├── mermaid_renderer.js        # Mermaid 渲染器 (~295 行)
│   ├── EMF 格式支持
│   ├── Inkscape 集成
│   └── 智能降级策略
├── height_calculator.js       # 高度计算器 (~85 行)
├── layout_engine.js           # 布局引擎 (~200 行)
├── svg_parser.js              # SVG 解析器 (~675 行)
│   ├── 复杂度计算
│   ├── 元素提取
│   └── PPT 形状转换
├── converter.js               # 主转换器类 (~955 行)
└── svg/                       # SVG 处理器模块 (~1070 行)
    ├── element_handler.js     # 处理器基类 (~100 行)
    ├── handler_registry.js   # 注册中心 (~65 行)
    └── handlers/              # 具体处理器
        ├── rect_handler.js    # 矩形 (~85 行)
        ├── polygon_handler.js # 多边形 (~140 行)
        ├── circle_handler.js  # 圆形 (~95 行)
        ├── path_handler.js    # 路径 (~350 行)
        └── text_handler.js    # 文本 (~250 行)
```

## 依赖项

### 基础依赖

```bash
npm install pptxgenjs image-size xml2js
```

### Mermaid 渲染（可选）

如需渲染 Mermaid 图表，需安装 mermaid-cli：

```bash
npm install -g @mermaid-js/mermaid-cli
```

### EMF 格式（可选）

如需使用 EMF 格式，需安装 Inkscape：

- **Windows**: 从 [inkscape.org](https://inkscape.org) 下载安装
- **macOS**: `brew install --cask inkscape`
- **Linux**: `sudo apt install inkscape`

## 故障排除

| 问题               | 解决方案                                              |
| ------------------ | ----------------------------------------------------- |
| Mermaid 图表未渲染 | 运行 `mmdc --version` 检查，或使用 `--no-mermaid` |
| EMF 格式降级为 SVG | 检查 Inkscape 是否正确安装                            |
| 内容溢出           | v2.0 已支持智能分页，自动创建新幻灯片                 |
| 字体显示不正确     | 确保字体已安装在查看 PPT 的系统上                     |
| 临时文件未清理     | 手动清理 `%TEMP%\md-to-ppt-mermaid\`                |

## 最佳实践

1. **组织 Markdown 结构**: 使用清晰的标题层级 (# → ## → ### → ####)
2. **保持内容简洁**: 幻灯片适合简短、聚焦的内容
3. **利用 Mermaid 绘图**: 使用 mermaid 语法创建流程图和图表
4. **选择合适的格式**: EMF 适合编辑，PNG 适合兼容性
5. **测试布局**: 尝试横版和竖版，选择适合的布局
6. **图表数量控制**: 每页建议不超过 2 个 Mermaid 图表

## Mermaid 图示例

### 流程图

```markdown
\`\`\`mermaid
graph TD
    A[开始] --> B{判断}
    B -->|是| C[处理A]
    B -->|否| D[处理B]
    C --> E[结束]
    D --> E
\`\`\`
```

### 时序图

```markdown
\`\`\`mermaid
sequenceDiagram
    participant A as 用户
    participant B as 系统
    A->>B: 发送请求
    B-->>A: 返回响应
\`\`\`
```

### 类图

```markdown
\`\`\`mermaid
classDiagram
    class Controller {
        +update()
        +execute()
    }
    class Model {
        +data
        +save()
    }
    Controller --> Model : 使用
\`\`\`
```

