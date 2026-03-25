const { SvgElementHandler } = require('../element_handler');

/**
 * 矩形处理器
 * 处理 <rect> 元素，支持圆角矩形
 */
class RectHandler extends SvgElementHandler {
    constructor() {
        super();
        this.priority = 30; // 高优先级
    }

    /**
     * 判断是否能处理该元素
     */
    canHandle(element) {
        return element.name === 'rect' && element.$;
    }

    /**
     * 解析矩形元素
     */
    parse(element, context) {
        const $ = element.$;

        const x = parseFloat($.x || 0);
        const y = parseFloat($.y || 0);
        const w = parseFloat($.width || 0);
        const h = parseFloat($.height || 0);

        if (w <= 0 || h <= 0) return null;

        // 圆角半径
        const rx = parseFloat($.rx || 0);
        const ry = parseFloat($.ry || rx);

        // 解析样式
        const fill = $.fill || '#ECECFF';
        const stroke = $.stroke || '#9370DB';
        const strokeWidth = parseFloat($['stroke-width'] || 1);

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
            type: 'rect',
            x: x + totalTransform.x,
            y: y + totalTransform.y,
            w: w * totalTransform.scale,
            h: h * totalTransform.scale,
            fill: fill,
            stroke: stroke,
            strokeWidth: strokeWidth,
            rx: rx,
            ry: ry,
            isRounded: rx > 0 || ry > 0,
            transform: totalTransform
        };
    }

    /**
     * 判断矩形类型
     */
    getRectType(shape) {
        if (!shape) return 'unknown';

        if (shape.isRounded) {
            return 'rounded_rect';
        }
        return 'rect';
    }
}

module.exports = { RectHandler };
