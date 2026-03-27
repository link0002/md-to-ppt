# 数学公式支持设计文档

**日期**: 2026-03-27
**项目**: md-to-ppt
**版本**: v1.1

## 概述

为 md-to-ppt 转换器添加 LaTeX 数学公式支持，采用两阶段实现策略：
- **第一阶段**: 基于图片的渲染（SVG/PNG）
- **第二阶段**: OMML 原生公式支持（可编辑）

## 需求

### 功能需求
- 支持行内公式语法: `$E = mc^2$`
- 支持块级公式语法: `$$...$$`
- 渲染高质量数学公式
- 无效公式优雅降级

### 非功能需求
- 与现有渲染流程兼容
- 依赖缺失时有降级方案
- 性能：批量渲染不阻塞

## 架构设计

### 第一阶段：图片渲染

```
Markdown → 检测公式 → MathJax/KaTeX → SVG/PNG → 嵌入 PPT
```

**优势**: 立即可用，无 PptxGenJS 限制
**劣势**: 公式不可编辑

### 第二阶段：OMML 原生支持

```
LaTeX → node-latex-to-omml → OMML XML → 直接嵌入 .pptx
```

**优势**: 公式可在 PowerPoint 中编辑
**劣势**: 需绕过 PptxGenJS，直接操作 XML

## 组件设计

### 新增模块

**MathFormulaParser** (`math_formula_parser.js`)
- 正则检测 `$...$` 和 `$$...$$`
- 返回公式对象: `{ type, latex, position }`
- 处理转义字符 `\$`

**MathRenderer** (`math_renderer.js`)
- 使用 MathJax 或 KaTeX 渲染
- 输出 SVG（首选）或 PNG（降级）
- base64 编码返回

### 修改模块

**converter.js**
- 添加公式检测到解析循环
- 委托给 MathFormulaParser

**layout_engine.js**
- 新增 `addMathFormula()` 方法
- 处理行内/块级定位

## 数据流程

### 检测阶段
```
Markdown 文本
    ↓
正则扫描 $...$
    ↓
公式对象提取
```

### 渲染阶段
```
LaTeX 字符串
    ↓
MathJax/KaTeX
    ├── SVG（首选）
    └── PNG（降级）
    ↓
base64 编码
```

### 嵌入阶段
```
图片 Data URL
    ↓
LayoutEngine.addMathFormula()
    ├── 行内：文本段落
    └── 块级：独立元素
    ↓
PptxGenJS slide.addImage()
```

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 无效 LaTeX 语法 | 灰色占位框 + 显示源码 |
| 渲染库未安装 | 占位符 + 控制台警告 |
| SVG 渲染失败 | 降级到 PNG |
| 完全渲染失败 | 占位符而非崩溃 |

### 占位符样式
- 背景: `F5F5F5`
- 边框: `CCCCCC`
- 内容: 原始 LaTeX 代码
- 提示: "[公式渲染失败]"

## 命令行选项

```bash
# 禁用数学公式渲染
node scripts/md_to_ppt.js -i doc.md -o out.pptx --no-math

# 指定渲染引擎
node scripts/md_to_ppt.js -i doc.md -o out.pptx --math-engine katex
node scripts/md_to_ppt.js -i doc.md -o out.pptx --math-engine mathjax

# 禁用 PNG 降级
node scripts/md_to_ppt.js -i doc.md -o out.pptx --no-math-fallback
```

## 测试策略

### 单元测试
- MathFormulaParser: 公式检测逻辑
- MathRenderer: 渲染和降级

### 集成测试
- `test/math-formula-test.md`: 各类公式场景
- 验证行内/块级定位
- 验证占位符显示

### 验收标准
1. 行内公式正确嵌入
2. 块级公式独立居中
3. 渲染清晰无模糊
4. 无效公式显示占位符
5. 依赖缺失时友好降级

## 第二阶段集成路径

### 可用工具
- **node-latex-to-omml**: LaTeX → OMML 直接转换
- **mathml2omml**: MathML → OMML（无需 XSLT）

### 集成方案
1. 将 OMMLConverter 包装为独立模块
2. 绕过 PptxGenJS，直接操作 .pptx XML
3. 提供降级：OMML → 图片（当失败时）

### 依赖
- PptxGenJS 不支持 OMML（已确认）
- 需直接操作 Office Open XML 格式

## 实现优先级

1. **P0**: MathFormulaParser（公式检测）
2. **P0**: MathRenderer（SVG 渲染）
3. **P1**: 行内公式嵌入
4. **P1**: 块级公式嵌入
5. **P2**: 错误处理完善
6. **P3**: OMML 支持（第二阶段）

## 依赖项

```json
{
  "katex": "^0.16.0",
  "mathjax-node": "^2.1.1"
}
```

可选（第二阶段）：
```json
{
  "node-latex-to-omml": "^1.0.0"
}
```
