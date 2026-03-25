/**
 * 主转换器 - MarkdownToPptConverter
 */

const PptxGenJS = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const { LAYOUT_CONFIG, STYLE_CONFIG } = require('./config');

/**
 * 将 SVG 文件转换为 base64 编码的 data URL
 * @param {string} svgPath - SVG 文件路径
 * @returns {string} base64 编码的 data URL
 */
function svgToBase64(svgPath) {
    const svgContent = fs.readFileSync(svgPath, "utf-8");
    // 将 SVG 内容转换为 base64
    const base64 = Buffer.from(svgContent).toString("base64");
    return `data:image/svg+xml;base64,${base64}`;
}
const { calculateBestImageSize, parseInlineMarkdown, wrapText } = require('./utils');
const { MasterSlideManager } = require('./master_slide');
const { MermaidRenderer } = require('./mermaid_renderer');
const { LayoutEngine } = require('./layout_engine');
const { SvgToPptConverter } = require('./svg_parser');

class MarkdownToPptConverter {
    constructor(options = {}) {
        this.mdFile = options.input;
        this.outputFile = options.output;
        this.layoutType = options.layout || "portrait";
        this.width = options.width || (this.layoutType === "portrait" ? 7.5 : 10);
        this.height = options.height || (this.layoutType === "portrait" ? 10.83 : 7.5);
        this.font = options.font || "微软雅黑";
        this.title = options.title || "技术文档";

        // 获取布局配置
        this.layout = LAYOUT_CONFIG[this.layoutType];

        // 读取内容
        this.content = fs.readFileSync(this.mdFile, "utf-8");

        // 初始化 PPT
        this.pres = new PptxGenJS();
        this.pres.defineLayout({
            name: "CUSTOM_LAYOUT",
            width: this.width,
            height: this.height
        });
        this.pres.layout = "CUSTOM_LAYOUT";

        this.slideNumber = 0;
        this.mermaidCounter = 0;

        // 初始化母版管理器
        this.masterManager = new MasterSlideManager(this.pres, LAYOUT_CONFIG);

        // 初始化 Mermaid 渲染器
        this.mermaidRenderer = new MermaidRenderer({
            mermaidEnabled: options.mermaidEnabled !== false,
            scale: options.mermaidScale || 2,
            outputFormat: options.mermaidFormat || "emf",  // 默认 EMF
            fallbackToPng: options.fallbackToPng !== false
        });

        // 初始化 SVG 解析器
        this.svgParser = new SvgToPptConverter();

        // SVG 转可编辑形状选项（null=不转换，数字=复杂度阈值，Infinity=全部转换）
        this.convertSvgToShapes = options.convertSvgToShapes || null;
    }

    /**
     * 解析 Markdown 内联格式为 PptxGenJS 格式化对象数组
     * @param {string} text - 原始 Markdown 文本
     * @param {Object} baseOptions - 基础文本选项（fontSize, fontFace, color 等）
     * @returns {Array} - 格式化文本对象数组
     */
    /**
     * 解析 Markdown 内容
     */
    parse() {
        const lines = this.content.split(/\r?\n/);
        const slides = [];

        let currentSlide = null;
        let contentBuffer = [];
        let inCodeBlock = false;
        let codeBlockType = "";
        let codeLines = [];

        lines.forEach((line) => {
            const trimmed = line.trim();

            // 代码块开始/结束
            if (trimmed.startsWith("```")) {
                if (inCodeBlock) {
                    // 代码块结束
                    if (codeBlockType === "mermaid") {
                        contentBuffer.push({
                            type: "mermaid",
                            code: codeLines.join("\n")
                        });
                    } else if (codeBlockType) {
                        contentBuffer.push({
                            type: "code",
                            lang: codeBlockType,
                            code: codeLines.join("\n")
                        });
                    }
                    inCodeBlock = false;
                    codeBlockType = "";
                    codeLines = [];
                } else {
                    // 代码块开始
                    inCodeBlock = true;
                    codeBlockType = trimmed.substring(3).trim();
                }
                return;
            }

            if (inCodeBlock) {
                codeLines.push(line);
                return;
            }

            // 一级标题 # → 封面页
            if (trimmed.match(/^#\s+(.+)$/)) {
                if (currentSlide && contentBuffer.length > 0) {
                    slides.push({...currentSlide, content: contentBuffer});
                }
                // 封面页直接添加，不需要内容
                slides.push({
                    type: "cover",
                    title: trimmed.match(/^#\s+(.+)$/)[1],
                    content: []
                });
                currentSlide = null;
                contentBuffer = [];
            }
            // 二级标题 ## → 章节页（第1行主标题）
            else if (trimmed.match(/^##\s+(.+)$/)) {
                if (currentSlide && contentBuffer.length > 0) {
                    slides.push({...currentSlide, content: contentBuffer});
                }
                const titleText = trimmed.match(/^##\s+(.+)$/)[1];
                currentSlide = {
                    type: "section",
                    title: titleText,
                    subtitle: ""
                };
                contentBuffer = [];
            }
            // 三级标题 ### → 触发分页，继承父级标题作为主标题
            else if (trimmed.match(/^###\s+(.+)$/)) {
                const subtitleText = trimmed.match(/^###\s+(.+)$/)[1];

                // 如果没有当前幻灯片，先创建一个默认的
                if (!currentSlide) {
                    currentSlide = {
                        type: "section",
                        title: "",
                        subtitle: ""
                    };
                }

                // 保存当前幻灯片内容（如果有）
                if (contentBuffer.length > 0) {
                    slides.push({...currentSlide, content: contentBuffer});
                }

                // 创建新幻灯片：继承父级标题，设置新的副标题
                const parentTitle = currentSlide.title;
                currentSlide = {
                    type: "section",
                    title: parentTitle,      // 继承父级（二级）标题
                    subtitle: subtitleText    // 新的副标题是三级标题
                };

                // 清空内容缓冲区
                contentBuffer = [];
            }
            // 四级标题 #### → 【标题】格式
            else if (trimmed.match(/^####\s+(.+)$/)) {
                // 如果没有当前幻灯片，创建一个默认的
                if (!currentSlide) {
                    currentSlide = {
                        type: "section",
                        title: "",
                        subtitle: ""
                    };
                }
                contentBuffer.push({
                    type: "subsubtitle",
                    text: `【${trimmed.match(/^####\s+(.+)$/)[1]}】`
                });
            }
            // 五级标题 ##### → 【标题】格式，字号13
            else if (trimmed.match(/^#####\s+(.+)$/)) {
                if (!currentSlide) {
                    currentSlide = { type: "section", title: "", subtitle: "" };
                }
                contentBuffer.push({
                    type: "subsubsubtitle",
                    text: `【${trimmed.match(/^#####\s+(.+)$/)[1]}】`
                });
            }
            // 分隔符
            else if (trimmed === "---") {
                if (contentBuffer.length > 0) {
                    slides.push({...currentSlide, content: contentBuffer});
                    contentBuffer = [];
                }
            }
            // 内容
            else if (trimmed !== "") {
                // 如果没有当前幻灯片，创建一个默认的
                if (!currentSlide) {
                    currentSlide = {
                        type: "section",
                        title: "",
                        subtitle: ""
                    };
                }
                // 计算缩进级别（每3个空格为一级）
                const indentMatch = line.match(/^(\s*)/);
                const indentSpaces = indentMatch ? indentMatch[1].length : 0;
                const level = Math.floor(indentSpaces / 3);

                if (trimmed.startsWith("- ")) {
                    let text = trimmed.substring(2);
                    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");  // 去除 markdown 链接
                    contentBuffer.push({type: "bullet", text: text, level: level});
                } else if (trimmed.match(/^\d+\./)) {
                    let text = trimmed.replace(/^\d+\.\s*/, "");
                    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");  // 去除 markdown 链接
                    contentBuffer.push({type: "number", text: text, level: level});
                } else if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
                    // 过滤表格分隔符行（如 |---|---|---| 或 |:---:|:---:|）
                    if (!trimmed.match(/^\|[\s\-:]+(\|[\s\-:]+)*\|$/)) {
                        contentBuffer.push({type: "table", text: trimmed});
                    }
                } else {
                    contentBuffer.push({type: "text", text: trimmed});
                }
            }
        });

        // 保存最后一张幻灯片
        if (currentSlide && contentBuffer.length > 0) {
            slides.push({...currentSlide, content: contentBuffer});
        }

        // 过滤掉没有内容的幻灯片（但保留有标题或副标题的幻灯片）
        const filtered = slides.filter(slide =>
            slide.type === "cover" ||
            (slide.content && slide.content.length > 0) ||
            (slide.title || slide.subtitle)
        );
        console.log(`Filter: ${slides.length} slides -> ${filtered.length} slides`);
        filtered.forEach((s, i) => {
            console.log(`  [${i}] type="${s.type}", title="${s.title}", subtitle="${s.subtitle}", content=${s.content?.length || 0}`);
        });
        return filtered;
    }

    /**
     * 生成 PowerPoint 演示文稿
     */
    async generate() {
        console.log(`Generating ${this.layoutType} PPT...`);
        console.log(`- Size: ${this.width}" x ${this.height}"`);
        console.log(`- Font: ${this.font}`);

        // 定义母版布局
        this.masterManager.defineMasters();

        // 检查 mermaid-cli
        const mermaidAvailable = await this.mermaidRenderer.checkAvailability();
        if (mermaidAvailable) {
            console.log(`- Mermaid: enabled (mmdc available)`);
        } else {
            console.log(`- Mermaid: disabled (mmdc not found, using placeholders)`);
        }

        const slides = this.parse();
        console.log(`\nParsed ${slides.length} valid slides`);

        // 创建布局引擎
        const layoutEngine = new LayoutEngine(this, this.layout, this.masterManager);

        for (const slideData of slides) {
            const preview = (slideData.title || "").substring(0, 50);
            console.log(`  [${this.slideNumber + 1}/${slides.length}] ${preview}`);

            if (slideData.type === "cover") {
                this.addCoverSlide(slideData);
            } else {
                await this.addContentSlide(slideData, layoutEngine);
            }
        }

        // 完成布局引擎
        layoutEngine.finish();

        // 写入文件（必须在 cleanup 之前完成，因为图片文件需要被读取）
        await this.pres.writeFile({ fileName: this.outputFile });
        console.log(`\nSuccessfully generated: ${this.outputFile}`);
        console.log(`Total ${this.slideNumber} slides`);

        // 清理临时文件（在 writeFile 完成后）
        this.mermaidRenderer.cleanup();
    }

    /**
     * 添加封面幻灯片
     */
    addCoverSlide(slideData) {
        const slide = this.pres.addSlide();
        this.slideNumber++;

        // 主标题框
        slide.addShape(this.pres.shapes.RECTANGLE, {
            x: this.layout.row1.titleBox.x,
            y: this.layout.row1.titleBox.y,
            w: this.layout.row1.titleBox.w,
            h: this.layout.row1.titleBox.h,
            fill: { color: "FFFFFF" },
            line: { color: this.layout.row1.titleBox.borderColor, width: 1 }
        });

        slide.addText(this.title, {
            x: this.layout.row1.titleBox.x + 0.05,
            y: this.layout.row1.titleBox.y,
            w: this.layout.row1.titleBox.w - 0.1,
            h: this.layout.row1.titleBox.h,
            fontSize: this.layout.row1.titleBox.fontSize,
            fontFace: this.font,
            color: "000000",
            valign: "middle",
            align: "center"
        });

        // 页码框
        slide.addShape(this.pres.shapes.RECTANGLE, {
            x: this.layout.row1.pageNumberBox.x,
            y: this.layout.row1.pageNumberBox.y,
            w: this.layout.row1.pageNumberBox.w,
            h: this.layout.row1.pageNumberBox.h,
            fill: { color: "FFFFFF" },
            line: { color: this.layout.row1.pageNumberBox.borderColor, width: 1 }
        });

        slide.addText(String(this.slideNumber), {
            x: this.layout.row1.pageNumberBox.x,
            y: this.layout.row1.pageNumberBox.y,
            w: this.layout.row1.pageNumberBox.w,
            h: this.layout.row1.pageNumberBox.h,
            fontSize: this.layout.row1.pageNumberBox.fontSize,
            fontFace: this.font,
            color: "000000",
            valign: "middle",
            align: "center"
        });

        // 主标题（居中）
        slide.addText(slideData.title, {
            x: this.width * 0.1,
            y: this.height * 0.4,
            w: this.width * 0.8,
            h: this.height * 0.2,
            fontSize: 28,
            fontFace: this.font,
            color: "000000",
            bold: true,
            align: "center",
            valign: "middle"
        });
    }

    /**
     * 将连续的列表项分组（支持多级列表）
     * @param {Array} content - 内容项数组
     * @returns {Array} - 分组后的内容数组
     */
    groupConsecutiveLists(content) {
        // 处理 undefined 或 null 的情况
        if (!content || !Array.isArray(content)) {
            return [];
        }

        const result = [];
        let currentList = null;

        for (const item of content) {
            if (item.type === "bullet" || item.type === "number") {
                // 如果是连续的列表项（无论类型是否相同），合并到当前列表
                if (currentList) {
                    currentList.items.push(item);
                } else {
                    // 开始新的列表组
                    currentList = {
                        type: "listGroup",
                        listType: item.type,
                        items: [item]
                    };
                }
            } else {
                // 保存之前的列表（如果有）
                if (currentList) {
                    result.push(currentList);
                    currentList = null;
                }
                // 非列表项直接添加
                result.push(item);
            }
        }

        // 保存最后的列表（如果有）
        if (currentList) {
            result.push(currentList);
        }

        return result;
    }

    /**
     * 添加列表组（文本式列表，不使用 bullet 选项，支持多级列表）
     * @param {LayoutEngine} layoutEngine - 布局引擎
     * @param {Object} listGroup - 列表组对象
     */
    addListGroup(layoutEngine, listGroup) {
        const heightCalc = layoutEngine.heightCalc;
        const fontSize = 12;
        const lineSpacingPt = 18;
        const paragraphSpacingPt = 8;
        const paddingPt = 2;
        const contentWidth = this.layout.row3.contentArea.w - 0.2;

        // 计算单个列表项的高度（磅）
        const getItemHeightPt = (item) => {
            const lines = wrapText(item.text, contentWidth);
            // 首行 fontSize，后续行 lineSpacingPt
            return fontSize + (lines.length - 1) * lineSpacingPt;
        };

        // 将列表项拆分为多个批次，每批次不超过可用高度
        const items = listGroup.items;
        let startIdx = 0;

        while (startIdx < items.length) {
            const availableH = layoutEngine.maxY - layoutEngine.currentY;
            const availablePt = availableH * 72;

            // 逐项累加，找到当前页能放下的最大项数
            let batchEndIdx = startIdx;
            let accumulatedPt = paddingPt;  // 文本框内边距

            for (let i = startIdx; i < items.length; i++) {
                const itemPt = getItemHeightPt(items[i]);
                const spacingPt = (i > startIdx) ? paragraphSpacingPt : 0;
                const newTotal = accumulatedPt + spacingPt + itemPt;

                if (newTotal / 72 > availableH && i > startIdx) {
                    // 超出可用高度，停在上一项
                    break;
                }
                accumulatedPt = newTotal;
                batchEndIdx = i + 1;
            }

            // 如果一项都放不下，至少放一项（避免死循环）
            if (batchEndIdx === startIdx) {
                batchEndIdx = startIdx + 1;
                accumulatedPt = paddingPt + getItemHeightPt(items[startIdx]);
            }

            const batchItems = items.slice(startIdx, batchEndIdx);
            const batchHeight = accumulatedPt / 72;

            // 创建批次的虚拟列表组项
            const batchItem = {
                type: "listGroup",
                listType: listGroup.listType,
                items: batchItems
            };

            // 用闭包捕获当前批次的变量
            const renderBatch = (batchItemsRef, batchStartIdx) => {
                layoutEngine.addElement(batchItem, (slide, y, h) => {
                    const allParagraphs = [];

                    for (let i = 0; i < batchItemsRef.length; i++) {
                        const item = batchItemsRef[i];
                        const level = item.level || 0;

                        const formattedTexts = parseInlineMarkdown(item.text, {
                            fontSize: fontSize,
                            fontFace: this.font,
                            color: "000000"
                        });

                        let prefix;
                        if (item.type === "number") {
                            if (level === 0) {
                                prefix = `${this._getNumberIndex(items, batchStartIdx + i, level)}. `;
                            } else {
                                prefix = "• ";
                            }
                        } else {
                            prefix = "• ";
                        }

                        allParagraphs.push(
                            { text: prefix, options: { fontSize, fontFace: this.font, color: "000000" } },
                            ...formattedTexts,
                            { text: "", options: { breakLine: true, paragraphSpacing: paragraphSpacingPt, indentLevel: level } }
                        );
                    }

                    slide.addText(allParagraphs, {
                        x: this.layout.row3.contentArea.x + 0.2,
                        y: y,
                        w: this.layout.row3.contentArea.w - 0.2,
                        h: h,
                        fontSize: fontSize,
                        fontFace: this.font,
                        color: "000000",
                        lineSpacing: lineSpacingPt
                    });
                });
            };

            renderBatch(batchItems, startIdx);
            startIdx = batchEndIdx;

            // 如果还有剩余项，开始新幻灯片
            if (startIdx < items.length) {
                layoutEngine.startNewSlide(layoutEngine.currentMainTitle, layoutEngine.currentSubtitle);
            }
        }
    }

    /**
     * 获取编号列表项的索引（用于多级编号列表）
     * @param {Array} items - 所有列表项
     * @param {number} currentIndex - 当前项的索引
     * @param {number} level - 当前项的级别
     * @returns {number} - 编号索引
     */
    _getNumberIndex(items, currentIndex, level) {
        let count = 0;
        for (let i = 0; i <= currentIndex; i++) {
            const itemLevel = items[i].level || 0;
            if (items[i].type === "number" && itemLevel === level) {
                count++;
            }
        }
        return count;
    }

    /**
     * 添加内容幻灯片（使用布局引擎）
     */
    async addContentSlide(slideData, layoutEngine) {
        // 获取当前章节的标题和副标题
        const mainTitle = slideData.title || "";
        const subtitle = slideData.subtitle || "";

        // 开始新幻灯片
        layoutEngine.startNewSlide(mainTitle, subtitle);

        // 对内容进行列表分组
        const groupedContent = this.groupConsecutiveLists(slideData.content);
        let tableRows = [];

        for (const item of groupedContent) {
            // 遇到非 table 类型时，先渲染已收集的表格
            if (item.type !== "table" && tableRows.length > 0) {
                layoutEngine.addTable(tableRows);
                tableRows = [];
            }

            switch (item.type) {
                case "subtitle":
                    // ### 三级标题 - 已在第2行显示，这里跳过
                    break;

                case "subsubtitle":
                    // #### 四级标题 → 【标题】
                    layoutEngine.addElement(item, (slide, y, h) => {
                        // 解析内联格式
                        const formattedText = parseInlineMarkdown(item.text, {
                            fontSize: 14,
                            fontFace: STYLE_CONFIG.fontConfig.fallback,
                            color: "000000",
                            bold: true
                        });
                        slide.addText(formattedText, {
                            x: this.layout.row3.contentArea.x,
                            y: y,
                            w: this.layout.row3.contentArea.w,
                            h: h
                        });
                    });
                    break;

                case "subsubsubtitle":
                    // ##### 五级标题 → 【标题】，字号13
                    layoutEngine.addElement(item, (slide, y, h) => {
                        const formattedText = parseInlineMarkdown(item.text, {
                            fontSize: 13,
                            fontFace: STYLE_CONFIG.fontConfig.fallback,
                            color: "000000",
                            bold: true
                        });
                        slide.addText(formattedText, {
                            x: this.layout.row3.contentArea.x,
                            y: y,
                            w: this.layout.row3.contentArea.w,
                            h: h
                        });
                    });
                    break;

                case "listGroup":
                    // 连续的列表项 - 使用文本式列表合并显示
                    this.addListGroup(layoutEngine, item);
                    break;

                case "bullet":
                    layoutEngine.addElement(item, (slide, y, h) => {
                        // 解析内联格式
                        const formattedText = parseInlineMarkdown(item.text, {
                            fontSize: 11,
                            fontFace: this.font,
                            color: "000000"
                        });
                        slide.addText(formattedText, {
                            x: this.layout.row3.contentArea.x + 0.2,
                            y: y,
                            w: this.layout.row3.contentArea.w - 0.2,
                            h: h,
                            bullet: true
                        });
                    });
                    break;

                case "number":
                    layoutEngine.addElement(item, (slide, y, h) => {
                        // 解析内联格式
                        const formattedText = parseInlineMarkdown(item.text, {
                            fontSize: 11,
                            fontFace: this.font,
                            color: "000000"
                        });
                        slide.addText(formattedText, {
                            x: this.layout.row3.contentArea.x + 0.2,
                            y: y,
                            w: this.layout.row3.contentArea.w - 0.2,
                            h: h,
                            bullet: { type: "number" }
                        });
                    });
                    break;

                case "text":
                    layoutEngine.addElement(item, (slide, y, h) => {
                        // 解析内联格式
                        const formattedText = parseInlineMarkdown(item.text, {
                            fontSize: 12,
                            fontFace: this.font,
                            color: "000000"
                        });
                        slide.addText(formattedText, {
                            x: this.layout.row3.contentArea.x,
                            y: y,
                            w: this.layout.row3.contentArea.w,
                            h: h
                        });
                    });
                    break;

                case "code":
                    layoutEngine.addElement(item, (slide, y) => {
                        this.addCodeBlock(slide, item.code, y);
                    });
                    break;

                case "table":
                    const cells = item.text.split("|").filter(c => c.trim() !== "");
                    if (cells.length > 0) {
                        tableRows.push(cells);
                    }
                    break;

                case "mermaid":
                    await this.addMermaidDiagram(layoutEngine, item.code);
                    break;
            }
        }

        // 添加表格
        if (tableRows.length > 0) {
            layoutEngine.addTable(tableRows);
        }
    }

    /**
     * 添加代码块
     */
    addCodeBlock(slide, code, y) {
        const maxLines = 10;
        const lines = code.split("\n");
        const displayLines = lines.slice(0, maxLines);
        const hasMore = lines.length > maxLines;

        const boxHeight = 0.3 + displayLines.length * 0.12 + 0.2;

        slide.addShape(this.pres.shapes.RECTANGLE, {
            x: this.layout.row3.contentArea.x,
            y: y,
            w: this.layout.row3.contentArea.w,
            h: boxHeight,
            fill: { color: "F5F5F5" },
            line: { color: "000000", width: 1 }
        });

        const codeText = displayLines.join("\n") + (hasMore ? "\n..." : "");
        slide.addText(codeText, {
            x: this.layout.row3.contentArea.x + 0.1,
            y: y + 0.1,
            w: this.layout.row3.contentArea.w - 0.2,
            h: boxHeight - 0.2,
            fontSize: 9,
            fontFace: "Consolas",
            color: "333333"
        });
    }

    /**
     * 添加 Mermaid 图表
     */
    async addMermaidDiagram(layoutEngine, mermaidCode) {
        this.mermaidCounter++;

        // 尝试渲染 Mermaid
        const renderResult = await this.mermaidRenderer.render(
            mermaidCode,
            `mermaid_${this.mermaidCounter}`
        );

        if (!renderResult) {
            // 渲染失败，使用占位符
            layoutEngine.addElement(
                { type: "mermaid", code: mermaidCode },
                (slide, y) => this.addMermaidPlaceholder(slide, mermaidCode, y)
            );
            return;
        }

        const { path: imagePath, width: imgWidth, height: imgHeight, format } = renderResult;

        // 如果是 SVG 且启用转换，尝试转换为 PPT 形状
        if (format === "svg" && this.convertSvgToShapes !== null && fs.existsSync(imagePath)) {
            try {
                const complexityThreshold = this.convertSvgToShapes;
                const complexity = await this.svgParser.getComplexity(imagePath);
                const isSimple = complexity <= complexityThreshold;

                if (isSimple) {
                    console.log(`Mermaid 图表简单，转换为可编辑形状`);
                    const elements = await this.svgParser.parse(imagePath);

                    // 计算最佳显示尺寸
                    const contentWidth = this.layout.row3.contentArea.w;
                    const contentHeight = this.layout.row3.contentArea.h;
                    const { w: finalWidth, h: finalHeight } = calculateBestImageSize(
                        imgWidth || elements.viewBox.width,
                        imgHeight || elements.viewBox.height,
                        contentWidth,
                        contentHeight
                    );

                    layoutEngine.addElement(
                        {
                            type: "mermaid",
                            code: mermaidCode,
                            _actualHeight: finalHeight
                        },
                        (slide, y) => {
                            const contentArea = this.layout.row3.contentArea;
                            const centeredX = contentArea.x + (contentArea.w - finalWidth) / 2;

                            this.svgParser.addToSlide(slide, elements,
                                { x: centeredX, y: y },
                                { w: finalWidth, h: finalHeight }
                            );
                        }
                    );
                    return;
                }
            } catch (err) {
                console.warn(`SVG 转换失败，使用图片模式: ${err.message}`);
            }
        }

        // 如果无法获取图片尺寸，使用默认处理方式
        if (!imgWidth || !imgHeight) {
            layoutEngine.addElement(
                { type: "mermaid", code: mermaidCode },
                (slide, y) => {
                    if (imagePath && fs.existsSync(imagePath)) {
                        // 计算居中位置（默认宽度为内容区域宽度的 80%）
                        const contentArea = this.layout.row3.contentArea;
                        const defaultWidth = contentArea.w * 0.8;
                        const centeredX = contentArea.x + (contentArea.w - defaultWidth) / 2;

                        // 检查是否为 SVG 文件,转换为 base64
                        const imageData = imagePath.endsWith('.svg')
                            ? { data: svgToBase64(imagePath) }
                            : { path: imagePath };

                        slide.addImage({
                            ...imageData,
                            x: centeredX,  // 居中对齐
                            y: y,
                            w: defaultWidth
                        });
                    } else {
                        this.addMermaidPlaceholder(slide, mermaidCode, y);
                    }
                }
            );
            return;
        }

        // 获取 PPT 内容区域尺寸
        const contentWidth = this.layout.row3.contentArea.w;
        const contentHeight = this.layout.row3.contentArea.h;

        // 计算最佳显示尺寸
        const { w: finalWidth, h: finalHeight, strategy } = calculateBestImageSize(
            imgWidth,
            imgHeight,
            contentWidth,
            contentHeight
        );

        console.log(`Mermaid 尺寸计算: 原始=${imgWidth}x${imgHeight}, ` +
                    `PPT=${finalWidth.toFixed(2)}x${finalHeight.toFixed(2)}" (${strategy}, ${format || 'png'})`);

        layoutEngine.addElement(
            {
                type: "mermaid",
                code: mermaidCode,
                _actualHeight: finalHeight
            },
            (slide, y) => {
                if (imagePath && fs.existsSync(imagePath)) {
                    // 计算居中位置
                    const contentArea = this.layout.row3.contentArea;
                    const centeredX = contentArea.x + (contentArea.w - finalWidth) / 2;

                    // 检查是否为 SVG 文件,转换为 base64
                    const imageData = imagePath.endsWith('.svg')
                        ? { data: svgToBase64(imagePath) }
                        : { path: imagePath };

                    slide.addImage({
                        ...imageData,
                        x: centeredX,  // 居中对齐
                        y: y,
                        w: finalWidth,
                        h: finalHeight
                    });
                } else {
                    this.addMermaidPlaceholder(slide, mermaidCode, y);
                }
            }
        );
    }

    /**
     * 添加 Mermaid 占位符（当渲染失败时）
     */
    addMermaidPlaceholder(slide, mermaidCode, y) {
        // 检测图表类型
        let chartType = "流程图";
        if (mermaidCode.includes("graph")) chartType = "流程图";
        else if (mermaidCode.includes("classDiagram")) chartType = "类图";
        else if (mermaidCode.includes("sequenceDiagram")) chartType = "时序图";
        else if (mermaidCode.includes("stateDiagram")) chartType = "状态图";
        else if (mermaidCode.includes("gantt")) chartType = "甘特图";
        else if (mermaidCode.includes("pie")) chartType = "饼图";
        else if (mermaidCode.includes("mindmap")) chartType = "思维导图";

        // 背景框
        slide.addShape(this.pres.shapes.RECTANGLE, {
            x: this.layout.row3.contentArea.x,
            y: y,
            w: this.layout.row3.contentArea.w,
            h: 2.5,
            fill: { color: "F0F0F0" },
            line: { color: "000000", width: 1 }
        });

        // 标题
        slide.addText(`【${chartType} ${this.mermaidCounter}】`, {
            x: this.layout.row3.contentArea.x + 0.2,
            y: y + 0.2,
            w: this.layout.row3.contentArea.w - 0.4,
            fontSize: 14,
            fontFace: this.font,
            color: "000000",
            bold: true,
            align: "center"
        });

        // 描述
        const description = this.getMermaidDescription(mermaidCode);
        slide.addText(description, {
            x: this.layout.row3.contentArea.x + 0.3,
            y: y + 0.6,
            w: this.layout.row3.contentArea.w - 0.6,
            fontSize: 10,
            fontFace: this.font,
            color: "666666"
        });
    }

    /**
     * 获取 Mermaid 图表描述
     */
    getMermaidDescription(code) {
        const lines = code.split("\n").filter(l => l.trim() !== "");
        const descriptions = [];

        lines.forEach(line => {
            const match = line.trim().match(/\[(.+?)\]|\((.+?)\)|["'](.+?)["']/);
            if (match) {
                const text = match[1] || match[2] || match[3];
                if (text && descriptions.length < 5) {
                    descriptions.push(`• ${text}`);
                }
            }
        });

        return descriptions.length > 0
            ? descriptions.join("\n")
            : "（详细流程图，请参考技术文档）";
    }
}

module.exports = { MarkdownToPptConverter };
