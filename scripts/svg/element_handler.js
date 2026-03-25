/**
 * SVG 元素处理器基类
 * 所有具体的元素处理器都应继承此类
 */
class SvgElementHandler {
    constructor() {
        // 优先级：数值越小优先级越高
        // 用于多个处理器都能处理同一元素时的排序
        this.priority = 100;
    }

    /**
     * 判断是否能处理该元素
     * @param {Object} element - XML 解析后的 SVG 元素
     * @returns {boolean} - 是否能处理
     */
    canHandle(element) {
        return false;
    }

    /**
     * 解析元素，返回标准化的形状对象
     * @param {Object} element - XML 解析后的 SVG 元素
     * @param {Object} context - 解析上下文（transform, viewBox 等）
     * @returns {Object|null} - 标准化的形状对象，如果不能处理则返回 null
     */
    parse(element, context) {
        throw new Error('Not implemented');
    }

    /**
     * 辅助方法：解析 transform 属性
     */
    parseTransform(transformStr) {
        if (!transformStr) return { x: 0, y: 0, scale: 1, rotate: 0 };

        const result = { x: 0, y: 0, scale: 1, rotate: 0 };

        // 解析 translate
        const translateMatch = transformStr.match(/translate\(([^,]+),?\s*([^)]*)\)/);
        if (translateMatch) {
            result.x = parseFloat(translateMatch[1]) || 0;
            result.y = parseFloat(translateMatch[2]) || 0;
        }

        // 解析 scale
        const scaleMatch = transformStr.match(/scale\(([^)]+)\)/);
        if (scaleMatch) {
            result.scale = parseFloat(scaleMatch[1]) || 1;
        }

        // 解析 rotate
        const rotateMatch = transformStr.match(/rotate\(([^)]+)\)/);
        if (rotateMatch) {
            result.rotate = parseFloat(rotateMatch[1]) || 0;
        }

        return result;
    }

    /**
     * 辅助方法：解析颜色值
     */
    normalizeColor(color) {
        if (!color || color === 'none' || color === 'transparent') {
            return 'FFFFFF';
        }

        let hex = color.replace('#', '');

        // 3位颜色码转6位
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }

        // 移除可能存在的 alpha 通道
        if (hex.length > 6) {
            hex = hex.substring(0, 6);
        }

        return hex.toUpperCase();
    }

    /**
     * 辅助方法：获取样式属性
     */
    getStyleOptions(shape) {
        return {
            fill: { color: this.normalizeColor(shape.fill) },
            line: {
                color: this.normalizeColor(shape.stroke),
                width: Math.max(0.01, shape.strokeWidth / 72)
            }
        };
    }
}

module.exports = { SvgElementHandler };
