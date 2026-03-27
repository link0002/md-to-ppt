# Markdown 转 PPT 使用指南

本文档提供详细的使用示例和高级模式。

## 目录

1. [基础用法](#基础用法)
2. [布局配置](#布局配置)
3. [Mermaid 图表处理](#mermaid-图表处理)
4. [内联格式](#内联格式)
5. [引述格式](#引述格式)
6. [高级示例](#高级示例)
7. [故障排除](#故障排除)

## 基础用法

### 最简单的转换

```bash
node scripts/md_to_ppt.js -i input.md -o output.pptx
```

这将使用默认设置：

- **竖版布局** (7.5" × 10.83")
- **微软雅黑** 字体
- 标题为 "技术文档"
- 自动渲染 Mermaid 图表（如果 mmdc 可用）

### 指定标题

```bash
node scripts/md_to_ppt.js \
  -i 项目文档.md \
  -o 项目演示.pptx \
  -t "项目技术方案"
```

## 布局配置

### 竖版布局（默认）

适用于技术报告、详细文档：

```bash
node scripts/md_to_ppt.js \
  -i 技术文档.md \
  -o 技术报告.pptx \
  -l portrait \
  -w 7.5 \
  -h 10.83
```

竖版布局特点：

- 4 行母版布局结构
- 第 1 行：主标题框 + 页码框
- 第 2 行：三级标题框
- 第 3 行：内容正文区域
- 第 4 行：底部三列（可选）

### 横版布局

适用于会议演示、培训材料：

```bash
node scripts/md_to_ppt.js \
  -i document.md \
  -o presentation.pptx \
  -l landscape \
  -w 10 \
  -h 7.5
```

### 自定义尺寸

A4 纸张比例（竖版）：

```bash
node scripts/md_to_ppt.js \
  -i document.md \
  -o output.pptx \
  -w 8.27 \
  -h 11.69
```

16:9 宽屏：

```bash
node scripts/md_to_ppt.js \
  -i document.md \
  -o output.pptx \
  -w 10 \
  -h 5.625
```

## Mermaid 图表处理

### 支持的图表类型（7 种）

| 图表类型 | 关键词                                | 示例               |
| -------- | ------------------------------------- | ------------------ |
| 流程图   | `graph TD`, `graph LR`            | 系统流程、决策树   |
| 时序图   | `sequenceDiagram`                   | 多方交互、API 调用 |
| 类图     | `classDiagram`                      | 类结构、关系图     |
| 状态图   | `stateDiagram`, `stateDiagram-v2` | 状态机、生命周期   |
| 甘特图   | `gantt`                             | 项目计划、里程碑   |
| 饼图     | `pie`                               | 数据占比分析       |
| 思维导图 | `mindmap`                           | 层级结构、脑图     |

### 渲染格式

**支持三种输出格式**：

| 格式          | 说明                      | 可编辑性                       | 依赖     |
| ------------- | ------------------------- | ------------------------------ | -------- |
| **EMF** | 默认格式，最佳 PPT 兼容性 | ✅ 原生可编辑（取消组合）      | Inkscape |
| **SVG** | 矢量图，作为图片嵌入      | ⚠️ 可在 PPT 中手动转换为形状 | 无       |
| **PNG** | 光栅图，最高兼容性        | ❌                             | 无       |

**安装依赖**：

```bash
# mermaid-cli（必需）
npm install -g @mermaid-js/mermaid-cli

# Inkscape（EMF 格式需要）
# Windows: 从 https://inkscape.org 下载安装
# macOS: brew install --cask inkscape
# Linux: sudo apt install inkscape
```

**占位符模式**（使用 `--no-mermaid`）：
生成灰色背景框，包含图表类型和关键节点描述。

### 流程图示例

```markdown
### 系统流程

\`\`\`mermaid
graph TD
    A[用户请求] --> B{验证}
    B -->|成功| C[处理请求]
    B -->|失败| D[返回错误]
    C --> E[返回结果]
\`\`\`
```

### 时序图示例

```markdown
\`\`\`mermaid
sequenceDiagram
    participant 客户端
    participant 服务器
    participant 数据库

    客户端->>服务器: 发送请求
    服务器->>数据库: 查询数据
    数据库-->>服务器: 返回数据
    服务器-->>客户端: 返回响应
\`\`\`
```

### 类图示例

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
    class View {
        +render()
    }
    Controller --> Model : 使用
    Controller --> View : 更新
\`\`\`
```

### 状态图示例

```markdown
\`\`\`mermaid
stateDiagram-v2
    [*] --> 待机: 上电
    待机 --> 运行: 启动
    运行 --> 暂停: 暂停
    运行 --> 故障: 异常
    故障 --> 待机: 复位
    暂停 --> 运行: 恢复
    运行 --> [*]: 关机
\`\`\`
```

### 甘特图示例

```markdown
\`\`\`mermaid
gantt
    title 项目开发计划
    dateFormat  YYYY-MM-DD
    section 设计阶段
    需求分析 :done, des1, 2024-01-01, 5d
    方案设计 :active, des2, after des1, 5d
    section 开发阶段
    核心开发 :dev1, 2024-01-11, 15d
    接口开发 :dev2, after dev1, 10d
    section 测试阶段
    单元测试 :test1, after dev2, 5d
    集成测试 :test2, after test1, 7d
\`\`\`
```

## 内联格式

支持在段落、列表和表格中使用内联格式：

| 格式     | 语法                             | 效果                 |
| -------- | -------------------------------- | -------------------- |
| 加粗     | `**文本**` 或 `__文本__`     | **粗体**       |
| 斜体     | `*文本*` 或 `_文本_`         | *斜体*             |
| 加粗斜体 | `***文本***` 或 `___文本___` | ***粗斜体*** |
| 行内代码 | `` `代码` ``                     | `代码`             |

### 段落和列表中的内联格式

```markdown
这是包含 **加粗文本**、*斜体文本* 和 `行内代码` 的段落。

- **重要**：这是加粗的列表项
- *提示*：这是斜体的列表项
- `代码`：这是包含代码的列表项
```

### 表格中的内联格式

表格单元格支持内联格式：

```markdown
| 功能 | 状态 | 说明 |
|------|------|------|
| **加粗** | ✅ | 测试加粗 |
| *斜体* | ✅ | 测试斜体 |
| `代码` | ✅ | 测试代码 |
```

## 引述格式

使用 `>` 开头的行创建引述块，支持多行和内联格式：

### 基础引述

```markdown
> 这是一段引述内容。
```

效果：浅蓝背景框 + 💡 图标

### 多行引述

```markdown
> 这是第一行引述。
> 这是第二行引述。
> 这是第三行引述。
```

### 引述中的内联格式

```markdown
> 这段引述包含 **加粗**、*斜体* 和 `代码` 格式。
```

## 高级示例

### 示例 1: 完整的技术文档转换

使用竖版布局转换技术文档：

```bash
node scripts/md_to_ppt.js \
  -i 技术文档.md \
  -o 技术演示.pptx \
  -l portrait \
  -w 7.5 \
  -h 10.83 \
  -f 微软雅黑 \
  -t "技术文档"
```

### 示例 2: 指定 Mermaid 输出格式

**EMF 格式（默认，推荐）**：

```bash
node scripts/md_to_ppt.js \
  -i document.md \
  -o output.pptx \
  --mermaid-format emf
```

**SVG 格式（作为图片嵌入）**：

```bash
node scripts/md_to_ppt.js \
  -i document.md \
  -o output.pptx \
  --mermaid-format svg
```

**PNG 格式（最高兼容性）**：

```bash
node scripts/md_to_ppt.js \
  -i document.md \
  -o output.pptx \
  --mermaid-format png
```

### 示例 3: 不渲染 Mermaid 图表

仅生成占位符，加快生成速度：

```bash
node scripts/md_to_ppt.js \
  -i document.md \
  -o output.pptx \
  --no-mermaid
```

### 示例 4: 多文档批量转换

使用 bash 脚本批量转换：

```bash
#!/bin/bash
for file in docs/*.md; do
    basename=$(basename "$file" .md)
    node scripts/md_to_ppt.js \
        -i "$file" \
        -o "output/${basename}.pptx" \
        -l portrait \
        -w 7.5 \
        -h 10.83
done
```

### 示例 5: 并行批量处理

```bash
#!/bin/bash
for file in docs/*.md; do
    (
        basename=$(basename "$file" .md)
        node scripts/md_to_ppt.js \
            -i "$file" \
            -o "output/${basename}.pptx"
    ) &
done
wait
```

## Markdown 编写技巧

### 标题层级

```markdown
# 主标题 - 生成封面页

## 第一章节 - 第1行主标题框
内容会出现在这里

### 1.1 小节 - 第2行副标题框
- 要点 1
- 要点 2

#### 详细说明 - 内容区【标题】
具体内容
```

### 表格格式

基础表格：

```markdown
| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| width | number | 7.5 | 幻灯片宽度(英寸) |
| height | number | 10.83 | 幻灯片高度(英寸) |
| layout | string | portrait | 布局方向 |
| font | string | 微软雅黑 | 字体名称 |
```

表格内联格式：

```markdown
| 功能 | 状态 | 说明 |
|------|------|------|
| **加粗** | ✅ | 重要功能 |
| *斜体* | ⚠️ | 注意事项 |
| `代码` | 🔧 | 配置项 |
```

### 代码块

支持语法高亮的代码块：

```markdown
\`\`\`python
def convert_md_to_ppt(input_file, output_file):
    converter = MarkdownToPptConverter({
        'input': input_file,
        'output': output_file
    })
    await converter.generate()
\`\`\`
```

### 智能分页

v2.0 自动计算内容高度，当内容超过可用空间时自动创建新幻灯片。

无需手动分页，以下情况会自动触发分页：

- 列表项过多
- 多个代码块
- 多个 Mermaid 图表
- 表格内容过长

## 故障排除

### 问题 1: Mermaid 图表未渲染

**原因**: 未安装 mermaid-cli

**解决方案**:

```bash
# 检查 mmdc 是否可用
mmdc --version

# 如果提示命令不存在，执行安装
npm install -g @mermaid-js/mermaid-cli

# 或使用 --no-mermaid 禁用渲染
node scripts/md_to_ppt.js -i doc.md -o out.pptx --no-mermaid
```

### 问题 2: 内容溢出

**原因**: 单页内容过多

**解决方案**:

- v2.0 已支持智能分页，会自动创建新幻灯片
- 如仍有问题，考虑手动添加二级标题(##)来分页

### 问题 3: 中文字体显示为方框

**原因**: 系统未安装指定字体

**解决方案**:

- 使用系统已安装的字体
- 常见中文字体: 微软雅黑、宋体、黑体、楷体
- 检查字体是否已安装: 在 PowerPoint 中查看可用字体

### 问题 4: 临时文件未清理

**原因**: 脚本被中断

**解决方案**:

- 手动清理临时目录: `%TEMP%\md-to-ppt-mermaid\`
- Windows: `C:\Users\<用户名>\AppData\Local\Temp\md-to-ppt-mermaid\`
- macOS/Linux: `/tmp/md-to-ppt-mermaid/`

### 问题 5: 图表显示不清晰

**原因**: 渲染缩放比例过小

**解决方案**:

```bash
# 使用更大的缩放比例（默认是 2）
node scripts/md_to_ppt.js -i doc.md -o out.pptx --mermaid-scale 3
```

### 问题 6: EMF 格式降级为 SVG

**原因**: Inkscape 未正确安装或不在 PATH 中

**解决方案**:

```bash
# 检查 Inkscape 是否可用
inkscape --version

# 如果不可用，安装 Inkscape：
# Windows: 从 https://inkscape.org 下载安装
# macOS: brew install --cask inkscape
# Linux: sudo apt install inkscape

# 或禁用 PNG 降级，使用 SVG 格式
node scripts/md_to_ppt.js -i doc.md -o out.pptx --mermaid-format svg --no-fallback
```

## 性能优化

### 大文档处理

对于超过 100 页的大文档：

1. **分段处理**: 将文档拆分为多个小文件
2. **减少图表**: Mermaid 渲染会消耗时间
3. **简化表格**: 复杂表格会影响生成速度
4. **使用 --no-mermaid**: 快速生成占位符，后期手动添加图表

### 批量转换优化

```bash
# 限制并行数量，避免系统过载
#!/bin/bash
MAX_PARALLEL=4
count=0

for file in docs/*.md; do
    (
        basename=$(basename "$file" .md)
        node scripts/md_to_ppt.js -i "$file" -o "output/${basename}.pptx"
    ) &

    ((count++))
    if ((count >= MAX_PARALLEL)); then
        wait
        count=0
    fi
done
wait
```

## 最佳实践

1. **组织 Markdown 结构**: 使用清晰的标题层级 (# → ## → ### → ####)
2. **保持内容简洁**: 幻灯片适合简短、聚焦的内容
3. **控制图表数量**: 每页建议不超过 2 个 Mermaid 图表
4. **测试不同布局**: 尝试横版和竖版，选择适合的布局
5. **验证字体兼容性**: 确保目标系统安装了所需字体
6. **预览后再分发**: 在 PowerPoint 中预览效果，确认无误后分发

## 常见问题

**Q: 可以转换 GitHub Flavored Markdown 吗?**
A: 是的，支持大部分 GFM 特性，包括表格、代码块、列表等。

**Q: 支持本地图片吗?**
A: 当前版本不支持本地图片。建议使用 PowerPoint 手动添加图片。

**Q: 生成的 PPT 可以编辑吗?**
A: 完全可以，生成的是标准 .pptx 文件，可用 PowerPoint 或其他工具编辑。

**Q: Mermaid 图表可以导出为矢量图吗?**
A: 是的，支持三种格式：

- **EMF**（默认）：矢量格式，可在 PowerPoint 中取消组合编辑，需安装 Inkscape
- **SVG**：矢量格式，作为图片嵌入，可在 PPT 中手动转换为形状
- **PNG**：光栅格式，最高兼容性

使用 `--mermaid-format` 参数指定格式：

```bash
node scripts/md_to_ppt.js -i doc.md -o out.pptx --mermaid-format svg
```

**Q: 可以自定义颜色主题吗?**
A: 可以，修改 `scripts/config.js` 中的样式配置来自定义颜色和边框。

**Q: EMF 格式有什么优势?**
A: EMF 是 Windows 增强型图元文件格式，优势包括：

- 在 PowerPoint 中可直接取消组合，转换为可编辑的矢量形状
- 无限缩放不失真
- 适合需要后续编辑图表的场景
- 需要 Inkscape 进行转换

**Q: SVG 格式如何转换为可编辑形状?**
A: 在 PowerPoint 中：

1. 选中 SVG 图片
2. 右键选择"转换为形状"
3. 取消组合后即可编辑各个元素

**Q: 支持引述格式吗?**
A: 支持，使用 `>` 开头的行创建引述：

```markdown
> 这是引述内容，支持 **加粗**、*斜体* 和 `代码` 格式。
> 支持多行引述。
```

引述会显示为浅蓝背景框 + 💡 图标。

**Q: 支持数学公式吗?**
A: 当前版本不支持 LaTeX 数学公式。建议使用图片或 Unicode 符号代替。
