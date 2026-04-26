# md-to-ppt

一个让 AI Agent 生成技术规格书 PPT 的 Skill。

## 这是什么？

当你用 Claude Code、Cursor 等 AI Agent 写技术文档时，Agent 擅长生成 Markdown，但不擅长输出 PPT 格式。

这个 Skill 让 Agent 只需生成 Markdown，就能自动转换成符合规格书格式的 PPT。

```mermaid
graph LR
    A[你提需求] --> B[AI Agent 生成 MD]
    B --> C[md-to-ppt skill]
    C --> D[技术规格书 PPT]
```

## 特性

- **Mermaid 图表** — 流程图、时序图、类图、状态图、甘特图、饼图、思维导图
- **LaTeX 公式** — 块级数学公式自动渲染为 SVG
- **智能分页** — 内容超长自动分页
- **表格支持** — 支持单元格内联格式
- **竖版/横版** — 适配打印和演示两种场景

## 安装

### 方式一：通过 npx skills 安装（推荐）

```bash
# 安装到全局
npx skills add https://github.com/link0002/md-to-ppt -g -a claude-code
```

### 方式二：直接使用

```bash
git clone https://github.com/link0002/md-to-ppt.git
cd md-to-ppt
npm install
node scripts/md_to_ppt.js -i input.md -o output.pptx
```

## 使用方式

安装后，直接告诉 AI Agent：

```
帮我写一份空调产品规格书，输出为 PPT
```

Agent 会自动调用这个 Skill，生成 Markdown 并转换为 PPT。

## 支持的 Markdown 元素

| 语法 | PPT 效果 |
|------|----------|
| `# 标题` | 封面页 |
| `## 标题` | 幻灯片主标题 |
| `### 标题` | 幻灯片副标题 |
| `- 项目` | 项目符号列表 |
| `1. 项目` | 编号列表 |
| ` ```lang ` | 灰底代码框 |
| ` ```mermaid ` | Mermaid 图表 |
| `| 列1 | 列2 |` | 表格 |
| `> 内容` | 浅蓝引述框 |
| `$$...$$` | 数学公式（SVG） |
| `[text](url)` | 超链接 |

## 命令行选项

| 选项 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--input` | `-i` | 输入 markdown 文件 | 必需 |
| `--output` | `-o` | 输出 pptx 文件 | 必需 |
| `--layout` | `-l` | `portrait` / `landscape` | `portrait` |
| `--width` | `-w` | 幻灯片宽度（英寸） | 7.5(竖) / 10(横) |
| `--height` | `-h` | 幻灯片高度（英寸） | 10.83(竖) / 7.5(横) |
| `--font` | `-f` | 字体名称 | 微软雅黑 |
| `--title` | `-t` | 演示文稿标题 | 技术文档 |
| `--mermaid-format` | - | `svg` / `emf` / `png` | `svg` |
| `--mermaid-scale` | - | Mermaid 渲染缩放 | `2` |
| `--math-scale` | - | 公式渲染缩放 | `2` |
| `--no-mermaid` | - | 禁用 Mermaid 渲染 | - |
| `--no-math` | - | 禁用数学公式渲染 | - |
| `--no-fallback` | - | 禁用 PNG 降级 | - |

## 快速开始

```bash
# 转换你的 Markdown 为 PPT
node scripts/md_to_ppt.js -i input.md -o output.pptx

# 试试内置示例
node scripts/md_to_ppt.js -i example/integration-test.md -o example/integration-test.pptx -l portrait --mermaid-format svg
```

## 依赖

- Node.js 18+
- PptxGenJS
- @mermaid-js/mermaid-cli
- mathjax-full

## License

Apache-2.0
