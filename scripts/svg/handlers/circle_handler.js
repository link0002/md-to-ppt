const { SvgElementHandler } = require('../element_handler');

/**
 * 圆形/椭圆处理器
 * 处理 <circle> 和 <ellipse> 元素
 */
class CircleHandler extends SvgElementHandler {
    constructor() {
        super();
        this.priority = 40; // 较高优先级
    }

    /**
     * 判断是否能处理该元素
     */
    canHandle(element) {
        return (element.name === 'circle' || element.name === 'ellipse') && element.$;
    }

    /**
     * 解析圆形/椭圆元素
     */
    parse(element, context) {
        const $ = element.$;
        let cx, cy, rx, ry;

        if (element.name === 'circle') {
            // 圆形: cx, cy, r
            cx = parseFloat($.cx || 0);
            cy = parseFloat($.cy || 0);
            const r = parseFloat($.r || 0);
            rx = ry = r;
        } else {
            // 椭圆: cx, cy, rx, ry
            cx = parseFloat($.cx || 0);
            cy = parseFloat($.cy || 0);
            rx = parseFloat($.rx || 0);
            ry = parseFloat($.ry || 0);
        }

        if (rx <= 0 || ry <= 0) return null;

        // 解析样式
        const fill = $.fill || 'none';
        const stroke = $.stroke || 'none';
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

        // 计算左上角坐标和尺寸
        const x = cx - rx;
        const y = cy - ry;
        const w = rx * 2;
        const h = ry * 2;

        return {
            type: 'oval',
            x: x + totalTransform.x,
            y: y + totalTransform.y,
            w: w * totalTransform.scale,
            h: h * totalTransform.scale,
            cx: cx + totalTransform.x,  // 中心点
            cy: cy + totalTransform.y,
            fill: fill,
            stroke: stroke,
            strokeWidth: strokeWidth,
            isCircle: Math.abs(rx - ry) < 0.1,  // 判断是否为正圆
            transform: totalTransform
        };
    }

    /**
     * 判断圆形/椭圆类型
     */
    getCircleType(shape) {
        if (!shape) return 'unknown';

        if (shape.isCircle) {
            return 'circle';
        }
        return 'ellipse';
    }
}

module.exports = { CircleHandler };
