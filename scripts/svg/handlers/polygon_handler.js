const { SvgElementHandler } = require('../element_handler');

/**
 * 多边形处理器
 * 处理 <polygon> 元素，特别是菱形（Mermaid 条件判断节点）
 */
class PolygonHandler extends SvgElementHandler {
    constructor() {
        super();
        this.priority = 50; // 中等优先级
    }

    /**
     * 判断是否能处理该元素
     */
    canHandle(element) {
        return element.name === 'polygon' && element.$;
    }

    /**
     * 解析多边形元素
     */
    parse(element, context) {
        const $ = element.$;
        const pointsStr = $.points;

        if (!pointsStr) return null;

        const points = this.parsePoints(pointsStr);

        if (points.length < 3) return null;

        // 检测是否为菱形（4个顶点，中心对称）
        const isDiamond = this.isDiamond(points);

        // 获取包围盒
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);

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

        const finalX = minX + totalTransform.x;
        const finalY = minY + totalTransform.y;

        return {
            type: isDiamond ? 'diamond' : 'polygon',
            points: points,
            x: finalX,
            y: finalY,
            w: (maxX - minX) * totalTransform.scale,
            h: (maxY - minY) * totalTransform.scale,
            fill: fill,
            stroke: stroke,
            strokeWidth: strokeWidth,
            vertexCount: points.length,
            transform: totalTransform
        };
    }

    /**
     * 解析 points 字符串
     * 格式: "x1,y1 x2,y2 x3,y3 ..."
     */
    parsePoints(pointsStr) {
        return pointsStr.trim().split(/[\s,]+/).reduce((points, part, index, parts) => {
            if (index % 2 === 0 && index + 1 < parts.length) {
                points.push({
                    x: parseFloat(part) || 0,
                    y: parseFloat(parts[index + 1]) || 0
                });
            }
            return points;
        }, []);
    }

    /**
     * 判断是否为菱形
     * 菱形特征：4个顶点，关于中心对称
     */
    isDiamond(points) {
        if (points.length !== 4) return false;

        // 计算中心点
        const cx = points.reduce((sum, p) => sum + p.x, 0) / 4;
        const cy = points.reduce((sum, p) => sum + p.y, 0) / 4;

        // 计算每个顶点到中心的距离平方
        const distSquares = points.map(p => Math.round(Math.pow(p.x - cx, 2) + Math.pow(p.y - cy, 2)));

        // 菱形应该有2对相等的距离（因为菱形的对角顶点到中心距离相等）
        const uniqueDists = new Set(distSquares);

        // 允许一定误差
        return uniqueDists.size === 2;
    }

    /**
     * 判断多边形类型
     */
    getPolygonType(points) {
        const count = points.length;

        switch (count) {
            case 3:
                return 'triangle';
            case 4:
                if (this.isDiamond(points)) return 'diamond';
                return 'quad';
            case 5:
                return 'pentagon';
            case 6:
                return 'hexagon';
            default:
                return count < 10 ? `polygon_${count}` : 'complex_polygon';
        }
    }
}

module.exports = { PolygonHandler };
