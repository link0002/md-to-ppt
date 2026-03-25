/**
 * SVG 解析器 - 将 SVG 转换为 PPT 可编辑形状
 * 支持处理器架构，支持多种 SVG 元素类型
 */

const fs = require("fs");
const xml2js = require("xml2js");

// 引入处理器架构
const { HandlerRegistry } = require("./svg/handler_registry");
const { RectHandler } = require("./svg/handlers/rect_handler");
const { PolygonHandler } = require("./svg/handlers/polygon_handler");
const { CircleHandler } = require("./svg/handlers/circle_handler");
const { PathHandler } = require("./svg/handlers/path_handler");
const { TextHandler } = require("./svg/handlers/text_handler");

class SvgToPptConverter {
    constructor() {
        this.parser = new xml2js.Parser();
        this.handlerRegistry = new HandlerRegistry();
        this.registerHandlers();
    }

    /**
     * 注册所有处理器
     */
    registerHandlers() {
        this.handlerRegistry.register(new RectHandler());
        this.handlerRegistry.register(new PolygonHandler());
        this.handlerRegistry.register(new CircleHandler());
        this.handlerRegistry.register(new PathHandler());
        this.handlerRegistry.register(new TextHandler());
    }

    /**
     * 解析 SVG 文件
     * @param {string} svgPath - SVG 文件路径
     * @returns {Object} 解析后的元素对象
     */
    async parse(svgPath) {
        const svgContent = fs.readFileSync(svgPath, "utf-8");
        const svgData = await this.parser.parseStringPromise(svgContent);

        const viewBox = this.extractViewBox(svgData);

        return {
            shapes: this.extractShapes(svgData),
            texts: this.extractTexts(svgData),
            lines: this.extractLines(svgData),
            viewBox: viewBox
        };
    }

    /**
     * 判断 SVG 是否为简单图表
     * @param {string} svgPath - SVG 文件路径
     * @returns {boolean} 是否为简单图表
     */
    async isSimpleChart(svgPath) {
        const complexity = await this.getComplexity(svgPath);
        return complexity < 50;
    }

    /**
     * 计算 SVG 图表的复杂度分数
     * @param {string} svgPath - SVG 文件路径
     * @returns {number} 复杂度分数
     */
    async getComplexity(svgPath) {
        const svgContent = fs.readFileSync(svgPath, "utf-8");

        // 统计所有形状元素
        const counts = {
            rect: (svgContent.match(/<rect\s/g) || []).length,
            circle: (svgContent.match(/<circle\s/g) || []).length,
            ellipse: (svgContent.match(/<ellipse\s/g) || []).length,
            polygon: (svgContent.match(/<polygon\s/g) || []).length,
            path: (svgContent.match(/<path\s/g) || []).length,
            line: (svgContent.match(/<line\s/g) || []).length,
            text: (svgContent.match(/<text\s/g) || []).length,
            foreignObject: (svgContent.match(/<foreignObject\s/g) || []).length
        };

        // 计算加权复杂度分数
        // 矩形和圆形权重较低（简单），路径权重较高（复杂）
        return counts.rect * 1 +
               counts.circle * 0.8 +
               counts.ellipse * 0.8 +
               counts.polygon * 0.5 +
               counts.path * 1.5 +
               counts.line * 0.3 +
               counts.text * 0.3 +
               counts.foreignObject * 0.5;
    }

    /**
     * 提取 ViewBox 信息
     */
    extractViewBox(svgData) {
        const svg = svgData.svg;
        if (!svg || !svg.$) {
            return { x: 0, y: 0, width: 800, height: 600 };
        }

        if (svg.$.viewBox) {
            const parts = svg.$.viewBox.split(/\s+/);
            return {
                x: parseFloat(parts[0]) || 0,
                y: parseFloat(parts[1]) || 0,
                width: parseFloat(parts[2]) || 800,
                height: parseFloat(parts[3]) || 600
            };
        }

        return {
            x: 0,
            y: 0,
            width: parseFloat(svg.$.width) || 800,
            height: parseFloat(svg.$.height) || 600
        };
    }

    /**
     * 解析 transform 属性，提取 translate 值
     */
    parseTransform(transformStr) {
        if (!transformStr) return { x: 0, y: 0 };

        const translateMatch = transformStr.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (translateMatch) {
            return {
                x: parseFloat(translateMatch[1]) || 0,
                y: parseFloat(translateMatch[2]) || 0
            };
        }
        return { x: 0, y: 0 };
    }

    /**
     * 递归提取所有节点（正确处理嵌套结构）
     */
    extractNodesRecursive(element, parentTransform = { x: 0, y: 0, scale: 1 }, depth = 0) {
        const nodes = [];

        if (!element) return nodes;

        // 获取当前元素的 transform
        const currentTransform = this.parseTransform(element.$ && element.$.transform);
        const absoluteTransform = {
            x: parentTransform.x + currentTransform.x,
            y: parentTransform.y + currentTransform.y,
            scale: (parentTransform.scale || 1) * (currentTransform.scale || 1),
            rotate: currentTransform.rotate || 0
        };

        // 特殊处理：g 元素且 class 包含 "node"（Mermaid 节点容器）
        const classList = (element.$ && element.$.class || '').split(/\s+/);
        const isNodeContainer = classList.includes('node') || (element.$ && element.$['data-node'] === 'true');

        if (isNodeContainer) {
            // 对于节点容器，提取所有形状和文本
            const allDescendants = this.getAllDescendants(element);

            // 先查找文本
            let nodeText = null;
            for (const child of allDescendants) {
                if (child.name === 'foreignObject') {
                    nodeText = this.extractTextFromForeignObject(child);
                    if (nodeText) break;
                } else if (child.name === 'text') {
                    nodeText = this.getTextContent(child);
                    if (nodeText) break;
                }
            }

            // 处理形状元素（跳过文本）
            for (const child of allDescendants) {
                if (child.name === 'text' || child.name === 'foreignObject') continue;

                const handler = this.handlerRegistry.getHandler(child);
                if (handler) {
                    const shape = handler.parse(child, { transform: absoluteTransform });
                    if (shape) {
                        // 附加文本
                        if (nodeText) {
                            shape.text = nodeText;
                        }
                        nodes.push(shape);
                        break; // 每个节点只取一个主要形状
                    }
                }
            }
        } else {
            // 对于非节点容器，直接使用处理器处理
            const handler = this.handlerRegistry.getHandler(element);
            if (handler) {
                const shape = handler.parse(element, { transform: absoluteTransform });
                if (shape) {
                    nodes.push(shape);
                }
            }
        }

        // 递归处理子元素（g 元素）
        if (element.g) {
            const groups = Array.isArray(element.g) ? element.g : [element.g];
            groups.forEach(g => {
                nodes.push(...this.extractNodesRecursive(g, absoluteTransform, depth + 1));
            });
        }

        return nodes;
    }

    /**
     * 获取元素的所有后代元素（扁平化）
     */
    getAllDescendants(element) {
        const descendants = [];
        const childTags = ['rect', 'circle', 'ellipse', 'polygon', 'path', 'line', 'text', 'foreignObject'];

        for (const tag of childTags) {
            if (element[tag]) {
                const items = Array.isArray(element[tag]) ? element[tag] : [element[tag]];
                items.forEach(item => {
                    if (item) {
                        item.name = tag;  // 设置名称属性
                        descendants.push(item);
                    }
                });
            }
        }

        // 递归处理子 g 元素
        if (element.g) {
            const groups = Array.isArray(element.g) ? element.g : [element.g];
            for (const g of groups) {
                descendants.push(...this.getAllDescendants(g));
            }
        }

        return descendants;
    }

    /**
     * 提取形状元素
     */
    extractShapes(svgData) {
        // 从根 svg 元素的子 g 元素开始递归提取
        const svg = svgData.svg || svgData;
        const nodes = [];

        // 直接处理 svg 下的 g 元素，跳过根 svg 本身
        if (svg.g) {
            const groups = Array.isArray(svg.g) ? svg.g : [svg.g];
            groups.forEach(g => {
                nodes.push(...this.extractNodesRecursive(g, { x: 0, y: 0, scale: 1 }, 0));
            });
        }

        return nodes;
    }

    /**
     * 获取元素的直接子元素（不包括深层嵌套）
     */
    getDirectChildren(element) {
        const children = [];
        const childTags = ['rect', 'circle', 'ellipse', 'polygon', 'path', 'line', 'text', 'foreignObject'];

        for (const tag of childTags) {
            if (element[tag]) {
                const items = Array.isArray(element[tag]) ? element[tag] : [element[tag]];
                children.push(...items);
            }
        }

        return children;
    }

    /**
     * 从 foreignObject 中提取文本
     */
    extractTextFromForeignObject(foreignObject) {
        try {
            // foreignObject 包含 HTML 结构
            if (foreignObject.div) {
                const divs = Array.isArray(foreignObject.div) ? foreignObject.div : [foreignObject.div];
                for (const div of divs) {
                    if (!div) continue;

                    // 尝试从 span 获取文本
                    if (div.span) {
                        const spans = Array.isArray(div.span) ? div.span : [div.span];
                        for (const span of spans) {
                            if (span && span._) {
                                return span._;
                            }
                            if (span && typeof span === 'string') {
                                return span;
                            }
                        }
                    }

                    // 直接从 div 获取
                    if (div._ && typeof div._ === 'string') {
                        return div._;
                    }
                }
            }
        } catch (e) {
            // 解析失败，返回空
        }
        return '';
    }

    /**
     * 提取文本元素
     */
    extractTexts(svgData) {
        const texts = [];
        const textElements = this.findElements(svgData, "text");

        textElements.forEach(text => {
            if (!text.$) return;
            const content = this.getTextContent(text);
            if (!content) return;

            texts.push({
                content: content,
                x: parseFloat(text.$.x || 0),
                y: parseFloat(text.$.y || 0),
                fontSize: this.parseFontSize(text.$.style || text.$["font-size"]),
                color: text.$.fill || "#000000",
                fontFamily: text.$["font-family"] || "Arial"
            });
        });

        return texts;
    }

    /**
     * 提取线条元素（增强版：支持箭头和贝塞尔曲线）
     */
    extractLines(svgData) {
        const lines = [];
        const paths = this.findElements(svgData, "path");

        paths.forEach(path => {
            if (!path.$ || !path.$.d) return;
            const d = path.$.d;

            // 跳过非连接线的 path（如形状、marker 定义）
            if (!d.includes('M') || !d.includes('L')) return;

            // 提取起点（M 命令）
            const startMatch = d.match(/M\s*([\d.-]+)\s+([\d.-]+)/);
            if (!startMatch) return;

            // 提取终点（最后一个 L 命令或 C 命令的终点）
            let endMatch = d.match(/L\s*([\d.-]+)\s+([\d.-]+)(?!.*[LC])/);
            if (!endMatch) {
                // 尝试匹配贝塞尔曲线的终点（C x1 y1 x2 y2 x3 y3）
                endMatch = d.match(/C\s*[\d.-]+\s+[\d.-]+\s+[\d.-]+\s+[\d.-]+\s+([\d.-]+)\s+([\d.-]+)(?!.*C)/);
            }
            if (!endMatch) return;

            // 检查箭头标记
            const hasArrow = path.$['marker-end'] &&
                            (path.$['marker-end'].includes('arrow') ||
                             path.$['marker-end'].includes('pointEnd'));

            lines.push({
                type: "line",
                x1: parseFloat(startMatch[1]),
                y1: parseFloat(startMatch[2]),
                x2: parseFloat(endMatch[1]),
                y2: parseFloat(endMatch[2]),
                stroke: path.$.stroke || "#333333",
                strokeWidth: parseFloat(path.$["stroke-width"] || 2),
                hasArrow: hasArrow
            });
        });

        return lines;
    }

    /**
     * 递归查找 SVG 元素
     */
    findElements(obj, tagName, results = []) {
        if (!obj) return results;

        if (Array.isArray(obj)) {
            obj.forEach(item => this.findElements(item, tagName, results));
        } else if (typeof obj === "object") {
            if (obj[tagName]) {
                if (Array.isArray(obj[tagName])) {
                    results.push(...obj[tagName]);
                } else {
                    results.push(obj[tagName]);
                }
            }
            Object.keys(obj).forEach(key => {
                if (key !== "$" && key !== "_") {
                    this.findElements(obj[key], tagName, results);
                }
            });
        }

        return results;
    }

    /**
     * 获取文本内容
     */
    getTextContent(textElement) {
        if (textElement._) {
            return textElement._;
        }
        if (textElement.tspan) {
            const tspans = Array.isArray(textElement.tspan) ? textElement.tspan : [textElement.tspan];
            return tspans.map(t => t._ || "").join("");
        }
        return "";
    }

    /**
     * 解析字体大小
     */
    parseFontSize(styleOrSize) {
        if (!styleOrSize) return 12;

        if (typeof styleOrSize === "number") {
            return styleOrSize;
        }

        const match = String(styleOrSize).match(/font-size:\s*([\d.]+)/);
        if (match) {
            return parseFloat(match[1]);
        }

        const sizeMatch = String(styleOrSize).match(/([\d.]+)/);
        if (sizeMatch) {
            return parseFloat(sizeMatch[1]);
        }

        return 12;
    }

    /**
     * SVG 坐标转 PPT 坐标
     * 注意：svgX/svgY 已经是通过 transform 累加后的绝对坐标
     * 只需要将坐标从 viewBox 坐标系转换到 PPT 坐标系
     */
    svgToPptCoords(svgX, svgY, viewBox, targetWidth, targetHeight) {
        const scaleX = targetWidth / viewBox.width;
        const scaleY = targetHeight / viewBox.height;

        // 将 SVG 绝对坐标转换为相对于 viewBox 的坐标，然后缩放
        return {
            x: (svgX - viewBox.x) * scaleX,
            y: (svgY - viewBox.y) * scaleY
        };
    }

    /**
     * SVG 尺寸转 PPT 尺寸
     */
    svgSizeToPpt(width, height, viewBox, targetWidth, targetHeight) {
        const scaleX = targetWidth / viewBox.width;
        const scaleY = targetHeight / viewBox.height;

        return {
            w: width * scaleX,
            h: height * scaleY
        };
    }

    /**
     * 标准化颜色格式
     */
    normalizeColor(color) {
        if (!color || color === 'none' || color === 'transparent') {
            return 'FFFFFF';  // 默认白色
        }

        // 移除 # 号
        let hex = color.replace('#', '');

        // 3位颜色码转6位
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }

        return hex.toUpperCase();
    }

    /**
     * 添加元素到幻灯片（支持多种形状类型）
     */
    addToSlide(slide, elements, position, size) {
        const viewBox = elements.viewBox;

        // 添加形状
        elements.shapes.forEach((shape, idx) => {
            const coords = this.svgToPptCoords(
                shape.x, shape.y, viewBox, size.w, size.h
            );
            const shapeSize = this.svgSizeToPpt(
                shape.w, shape.h, viewBox, size.w, size.h
            );

            const finalX = position.x + coords.x;
            const finalY = position.y + coords.y;

            // 根据形状类型添加对应的 PPT 形状
            this.addShapeToSlide(slide, shape, finalX, finalY, shapeSize);

            // 如果有文本，添加文本框
            if (shape.text) {
                slide.addText(shape.text, {
                    x: finalX,
                    y: finalY,
                    w: shapeSize.w,
                    h: shapeSize.h,
                    fontSize: 12,
                    color: '333333',
                    align: 'center',
                    valign: 'middle',
                    fontFace: '微软雅黑'
                });
            }
        });

        // 添加独立文本
        elements.texts.forEach((text, idx) => {
            const coords = this.svgToPptCoords(
                text.x, text.y, viewBox, size.w, size.h
            );

            const textWidth = text.w || size.w * 0.3;
            const textHeight = text.h || (text.fontSize / 72) * 1.5;

            slide.addText(text.content, {
                x: position.x + coords.x - textWidth / 2,
                y: position.y + coords.y - textHeight / 2,
                w: textWidth,
                h: textHeight,
                fontSize: Math.max(8, text.fontSize),
                color: this.normalizeColor(text.color),
                fontFace: text.fontFamily,
                align: text.align || 'center',
                valign: 'middle'
            });
        });

        // 添加线条
        elements.lines.forEach((line, idx) => {
            const start = this.svgToPptCoords(
                line.x1, line.y1, viewBox, size.w, size.h
            );
            const end = this.svgToPptCoords(
                line.x2, line.y2, viewBox, size.w, size.h
            );

            slide.addShape("line", {
                x: position.x + start.x,
                y: position.y + start.y,
                w: end.x - start.x,
                h: end.y - start.y,
                line: {
                    color: this.normalizeColor(line.stroke),
                    width: Math.max(1, line.strokeWidth),
                    endArrowType: line.hasArrow ? "arrow" : "none"
                }
            });
        });
    }

    /**
     * 根据形状类型添加 PPT 形状
     */
    addShapeToSlide(slide, shape, x, y, size) {
        const styleOptions = {
            fill: { color: this.normalizeColor(shape.fill) },
            line: {
                color: this.normalizeColor(shape.stroke),
                width: Math.max(0.01, shape.strokeWidth / 72)
            }
        };

        switch (shape.type) {
            case 'rect':
                slide.addShape("rect", {
                    x: x,
                    y: y,
                    w: size.w,
                    h: size.h,
                    ...styleOptions
                });
                break;

            case 'oval':
            case 'circle':
            case 'ellipse':
                slide.addShape("ellipse", {
                    x: x,
                    y: y,
                    w: size.w,
                    h: size.h,
                    ...styleOptions
                });
                break;

            case 'diamond':
                slide.addShape("diamond", {
                    x: x,
                    y: y,
                    w: size.w,
                    h: size.h,
                    ...styleOptions
                });
                break;

            case 'line':
                slide.addShape("line", {
                    x: x,
                    y: y,
                    w: size.w,
                    h: size.h,
                    line: {
                        color: this.normalizeColor(shape.stroke),
                        width: Math.max(1, shape.strokeWidth),
                        endArrowType: shape.hasArrow ? "arrow" : "none"
                    }
                });
                break;

            case 'triangle':
                slide.addShape("triangle", {
                    x: x,
                    y: y,
                    w: size.w,
                    h: size.h,
                    ...styleOptions
                });
                break;

            case 'polygon':
            case 'custom':
                // 对于复杂多边形，使用自定义几何或降级为矩形
                slide.addShape("rect", {
                    x: x,
                    y: y,
                    w: size.w,
                    h: size.h,
                    ...styleOptions
                });
                break;

            default:
                // 未知类型，降级为矩形
                slide.addShape("rect", {
                    x: x,
                    y: y,
                    w: size.w,
                    h: size.h,
                    ...styleOptions
                });
                break;
        }
    }
}

module.exports = { SvgToPptConverter };
