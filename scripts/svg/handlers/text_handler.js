const { SvgElementHandler } = require('../element_handler');

/**
 * 文本处理器
 * 处理 <text> 和 <foreignObject> 元素
 */
class TextHandler extends SvgElementHandler {
    constructor() {
        super();
        this.priority = 20; // 最高优先级
    }

    /**
     * 判断是否能处理该元素
     */
    canHandle(element) {
        return (element.name === 'text' || element.name === 'foreignObject' || element.name === 'tspan') && element.$;
    }

    /**
     * 解析文本元素
     */
    parse(element, context) {
        if (element.name === 'foreignObject') {
            return this.parseForeignObject(element, context);
        }

        return this.parseText(element, context);
    }

    /**
     * 解析 text 元素
     */
    parseText(element, context) {
        const $ = element.$;

        // 获取文本内容
        const content = this.getTextContent(element);
        if (!content || content.trim() === '') return null;

        // 解析位置
        const x = parseFloat($.x || 0);
        const y = parseFloat($.y || 0);

        // 解析样式
        const fontSize = this.parseFontSize($.style || $['font-size']);
        const fontFamily = $['font-family'] || 'Arial';
        const fontWeight = $['font-weight'] || 'normal';
        const fontStyle = $['font-style'] || 'normal';
        const fill = $.fill || '#000000';

        // 解析对齐方式
        const textAlign = this.parseTextAlign($.style || $['text-anchor']);
        const textAnchor = $['text-anchor'] || 'start';

        // 应用变换：先应用元素自身的变换，再加上父元素的累积变换
        const ownTransform = this.parseTransform($.transform);
        const parentTransform = context?.transform || { x: 0, y: 0, scale: 1 };

        const totalTransform = {
            x: ownTransform.x + parentTransform.x,
            y: ownTransform.y + parentTransform.y,
            scale: ownTransform.scale * parentTransform.scale,
            rotate: ownTransform.rotate
        };

        return {
            type: 'text',
            content: content.trim(),
            x: x + totalTransform.x,
            y: y + totalTransform.y,
            fontSize: fontSize,
            fontFamily: fontFamily,
            fontWeight: fontWeight,
            fontStyle: fontStyle,
            fill: fill,
            align: textAlign,
            textAnchor: textAnchor,
            w: this.estimateTextWidth(content, fontSize) * totalTransform.scale,
            h: fontSize * 1.2 * totalTransform.scale,
            transform: totalTransform
        };
    }

    /**
     * 解析 foreignObject 元素（Mermaid 使用它包裹节点文本）
     */
    parseForeignObject(element, context) {
        try {
            // 应用变换：先应用元素自身的变换，再加上父元素的累积变换
            const ownTransform = this.parseTransform(element.$.transform);
            const parentTransform = context?.transform || { x: 0, y: 0, scale: 1 };

            const totalTransform = {
                x: ownTransform.x + parentTransform.x,
                y: ownTransform.y + parentTransform.y,
                scale: ownTransform.scale * parentTransform.scale,
                rotate: ownTransform.rotate
            };

            // foreignObject 包含 HTML 结构
            if (element.div && element.div[0]) {
                const div = element.div[0];

                // 尝试从 span 获取文本
                if (div.span && div.span[0]) {
                    const span = div.span[0];
                    const content = span._ || span;
                    if (content && typeof content === 'string' && content.trim()) {
                        const x = parseFloat(element.$.x || 0);
                        const y = parseFloat(element.$.y || 0);
                        return {
                            type: 'text',
                            content: content.trim(),
                            x: x + totalTransform.x,
                            y: y + totalTransform.y,
                            w: parseFloat(element.$.width || 100) * totalTransform.scale,
                            h: parseFloat(element.$.height || 50) * totalTransform.scale,
                            fontSize: 14,
                            fontFamily: 'Arial',
                            fill: '#000000',
                            align: 'center',
                            valign: 'middle',
                            isForeignObject: true,
                            transform: totalTransform
                        };
                    }
                }

                // 直接从 div 获取
                const content = div._ || '';
                if (content && typeof content === 'string' && content.trim()) {
                    const x = parseFloat(element.$.x || 0);
                    const y = parseFloat(element.$.y || 0);
                    return {
                        type: 'text',
                        content: content.trim(),
                        x: x + totalTransform.x,
                        y: y + totalTransform.y,
                        w: parseFloat(element.$.width || 100) * totalTransform.scale,
                        h: parseFloat(element.$.height || 50) * totalTransform.scale,
                        fontSize: 14,
                        fontFamily: 'Arial',
                        fill: '#000000',
                        align: 'center',
                        valign: 'middle',
                        isForeignObject: true,
                        transform: totalTransform
                    };
                }
            }
        } catch (e) {
            // 解析失败，返回 null
        }

        return null;
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

        // 从 style 属性解析
        const match = String(styleOrSize).match(/font-size:\s*([\d.]+)/);
        if (match) {
            return parseFloat(match[1]);
        }

        // 直接解析数字
        const sizeMatch = String(styleOrSize).match(/([\d.]+)/);
        if (sizeMatch) {
            return parseFloat(sizeMatch[1]);
        }

        return 12;
    }

    /**
     * 解析文本对齐
     */
    parseTextAlign(styleOrAnchor) {
        if (!styleOrAnchor) return 'left';

        const str = String(styleOrAnchor);

        if (str.includes('text-align:center') || str.includes('middle')) {
            return 'center';
        }
        if (str.includes('text-align:right') || str.includes('end')) {
            return 'right';
        }

        return 'left';
    }

    /**
     * 估算文本宽度（简化版）
     */
    estimateTextWidth(text, fontSize) {
        // 简单估算：每个字符约 0.6 * fontSize
        // 中文约等于 fontSize
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const otherChars = text.length - chineseChars;

        return Math.ceil(chineseChars * fontSize + otherChars * fontSize * 0.6);
    }

    /**
     * 获取文本选项（用于 PPTXGenJS）
     */
    getTextOptions(shape) {
        return {
            x: shape.x,
            y: shape.y,
            w: shape.w || this.estimateTextWidth(shape.content, shape.fontSize),
            h: shape.h || shape.fontSize * 1.5,
            fontSize: shape.fontSize,
            fontFace: shape.fontFamily,
            color: this.normalizeColor(shape.fill),
            align: shape.align || 'left',
            valign: shape.valign || 'top',
            bold: shape.fontWeight === 'bold',
            italic: shape.fontStyle === 'italic'
        };
    }
}

module.exports = { TextHandler };
