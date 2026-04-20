---
name: md-to-ppt
description: |
  将 Markdown 技术文档转换为 PowerPoint 演示文稿。
  当用户提到 .pptx、演示文稿、幻灯片、PPT 时使用此 skill。
  支持 Mermaid 图表（流程图、时序图、类图、状态图、甘特图、饼图、思维导图）、
  LaTeX 块级数学公式（MathJax SVG）、表格（含内联格式）、引述、代码块、
  智能分页、竖版/横版布局。
  触发场景：用户要求将 .md 转为 .pptx，或提到"生成 PPT"、"转换演示文稿"。
---

# Markdown 转 PowerPoint 转换器

## 基本用法

```bash
node scripts/md_to_ppt.js -i <input.md> -o <output.pptx> [options]
```

## 选项决策指引

| 场景 | 推荐选项 |
|------|----------|
| 默认转换（无需任何额外选项） | 直接 `-i` `-o` 即可 |
| 用户要求可编辑的 Mermaid 图表 | `--mermaid-format emf`（需安装 Inkscape） |
| 用户要求横版演示 | `-l landscape` |
| 用户报告公式太小/太大 | `--math-scale 3` 或 `--math-scale 1`（默认 2） |
| 用户报告 Mermaid 图表太小/太大 | `--mermaid-scale 3` 或 `--mermaid-scale 1`（默认 2） |
| 无需 Mermaid 图表（加速转换） | `--no-mermaid` |
| 无需数学公式 | `--no-math` |

## 完整选项

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--input` | `-i` | 输入 markdown 文件（必需） | - |
| `--output` | `-o` | 输出 pptx 文件（必需） | - |
| `--layout` | `-l` | `portrait` / `landscape` | `portrait` |
| `--width` | `-w` | 幻灯片宽度（英寸） | 7.5(竖) / 10(横) |
| `--height` | `-h` | 幻灯片高度（英寸） | 10.83(竖) / 7.5(横) |
| `--font` | `-f` | 字体名称 | 微软雅黑 |
| `--title` | `-t` | 演示文稿标题 | 技术文档 |
| `--mermaid-format` | - | `svg` / `emf` / `png` | `svg` |
| `--mermaid-scale` | - | Mermaid 渲染缩放 | `2` |
| `--no-mermaid` | - | 禁用 Mermaid 渲染 | - |
| `--no-fallback` | - | 禁用 PNG 降级 | - |
| `--no-math` | - | 禁用数学公式渲染 | - |
| `--math-scale` | - | 公式渲染缩放比例 | `2` |

## 输入规范

### 支持的 Markdown 元素

| 语法 | PPT 效果 |
|------|----------|
| `# 标题` | 封面页 |
| `## 标题` | 幻灯片主标题（row1） |
| `### 标题` | 幻灯片副标题（row2） |
| `#### 标题` | 内容区小标题 |
| `- 项目` / `* 项目` | 项目符号列表 |
| `1. 项目` | 编号列表 |
| `` ```lang `` | 灰底代码框 |
| `` ```mermaid `` | Mermaid 图表（svg/emf/png） |
| `| 列1 | 列2 |` | 表格（支持单元格内联格式） |
| `> 内容` | 浅蓝引述框（`E8F4FD`） |
| `$$...$$` | MathJax 渲染为 SVG，居中显示 |

### 不支持的语法

- **行内公式** `$...$` — 不渲染，原样输出为文本
- **图片** `![]()` — 不支持
- **链接** `[text](url)` — 不支持
- **HTML** — 不支持

### Mermaid 图表类型

支持：`graph TD/LR`、`sequenceDiagram`、`classDiagram`、`stateDiagram`、`gantt`、`pie`、`mindmap`

### Mermaid 输出格式

| 格式 | 可编辑性 | 依赖 |
|------|----------|------|
| **SVG**（默认） | 可手动转换为形状 | 无 |
| **EMF** | PPT 中取消组合可编辑 | Inkscape |
| **PNG** | 不可编辑 | 无 |

降级链：EMF → SVG → PNG（可通过 `--no-fallback` 禁用）

## 输出说明

- 竖版 7.5"×10.83"，横版 10"×7.5"
- 每页 3 行布局：标题 → 副标题 → 内容区
- 内容超出自动分页
- 数学公式为 SVG 图片，在 PPT 中可右键"转换为形状"
- 默认字体：微软雅黑

## 参考

- 架构与代码结构见 `CLAUDE.md`
- 详细使用示例和故障排除见 `references/usage-guide.md`
