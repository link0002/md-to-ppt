const { SvgElementHandler } = require('../element_handler');

/**
 * 路径处理器
 * 处理 <path> 元素，支持：
 * - 简单路径（M + L）→ 转换为线条
 * - 复杂路径 → 转换为自定义几何
 */
class PathHandler extends SvgElementHandler {
    constructor() {
        super();
        this.priority = 60; // 较低优先级，让其他处理器优先匹配
    }

    /**
     * 判断是否能处理该元素
     */
    canHandle(element) {
        return element.name === 'path' && element.$ && element.$.d;
    }

    /**
     * 解析路径元素
     */
    parse(element, context) {
        const $ = element.$;
        const d = $.d;

        if (!d) return null;

        // 解析路径命令
        const commands = this.parsePathCommands(d);

        // 判断路径类型
        const pathType = this.classifyPath(commands);

        let result = null;

        switch (pathType) {
            case 'simple_line':
                result = this.parseSimpleLine(commands, $);
                break;
            case 'rectangle':
                result = this.parseRectangle(commands, $);
                break;
            case 'connector':
                result = this.parseConnector(commands, $);
                break;
            case 'complex':
            default:
                result = this.parseComplexPath(commands, $);
                break;
        }

        if (result) {
            // 应用变换：先应用元素自身的变换，再加上父元素的累积变换
            const ownTransform = this.parseTransform($.transform);
            const parentTransform = context?.transform || { x: 0, y: 0, scale: 1 };

            const totalTransform = {
                x: ownTransform.x + parentTransform.x,
                y: ownTransform.y + parentTransform.y,
                scale: ownTransform.scale * parentTransform.scale,
                rotate: ownTransform.rotate
            };

            // 将变换应用到坐标
            result.x = (result.x || 0) + totalTransform.x;
            result.y = (result.y || 0) + totalTransform.y;
            result.w = (result.w || 0) * totalTransform.scale;
            result.h = (result.h || 0) * totalTransform.scale;
            result.transform = totalTransform;

            // 如果有起点终点信息，也需要更新
            if (result.x1 !== undefined) result.x1 += totalTransform.x;
            if (result.y1 !== undefined) result.y1 += totalTransform.y;
            if (result.x2 !== undefined) result.x2 += totalTransform.x;
            if (result.y2 !== undefined) result.y2 += totalTransform.y;

            // 如果有点数组，需要变换每个点
            if (result.points) {
                result.points = result.points.map(p => ({
                    x: p.x + totalTransform.x,
                    y: p.y + totalTransform.y,
                    type: p.type
                }));
            }

            // 添加箭头信息
            const markerEnd = $['marker-end'];
            result.hasArrow = markerEnd &&
                (markerEnd.includes('arrow') ||
                 markerEnd.includes('pointEnd'));
        }

        return result;
    }

    /**
     * 解析路径命令字符串
     * 支持 M, L, H, V, C, S, Q, T, A, Z 命令
     */
    parsePathCommands(d) {
        const commands = [];
        const regex = /([MLHVCSQTAZ])\s*([^MLHVCSQTAZ]*)/gi;
        let match;

        while ((match = regex.exec(d)) !== null) {
            const cmd = match[1].toUpperCase();
            const paramsStr = match[2].trim();
            const params = paramsStr ? paramsStr.split(/[\s,]+/).map(parseFloat) : [];

            commands.push({
                command: cmd,
                params: params,
                isRelative: match[1] === match[1].toLowerCase()
            });
        }

        return commands;
    }

    /**
     * 路径分类
     */
    classifyPath(commands) {
        if (commands.length === 0) return 'empty';

        const hasOnlyML = commands.every(cmd => cmd.command === 'M' || cmd.command === 'L');

        if (hasOnlyML && commands.length <= 2) {
            return 'simple_line';
        }

        // 检查是否为矩形（M x y L w 0 L w h L 0 h Z）
        if (this.isRectangle(commands)) {
            return 'rectangle';
        }

        // 检查是否为连接线（通常有 C 命令的贝塞尔曲线）
        const hasCurve = commands.some(cmd => ['C', 'S', 'Q'].includes(cmd.command));
        if (hasCurve || hasOnlyML) {
            return 'connector';
        }

        return 'complex';
    }

    /**
     * 判断是否为矩形路径
     */
    isRectangle(commands) {
        // 简化判断：只有 M, L, Z 命令，且有4-5个命令
        if (commands.length < 4 || commands.length > 5) return false;

        const validCommands = ['M', 'L', 'Z'];
        return commands.every(cmd => validCommands.includes(cmd.command));
    }

    /**
     * 解析简单线条
     */
    parseSimpleLine(commands, attrs) {
        const startCmd = commands.find(c => c.command === 'M');
        const endCmd = commands.find(c => c.command === 'L');

        if (!startCmd || !endCmd) return null;

        const x1 = startCmd.params[0] || 0;
        const y1 = startCmd.params[1] || 0;
        const x2 = endCmd.params[0] || x1;
        const y2 = endCmd.params[1] || y1;

        return {
            type: 'line',
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            w: Math.abs(x2 - x1),
            h: Math.abs(y2 - y1),
            fill: 'none',
            stroke: attrs.stroke || '#333333',
            strokeWidth: parseFloat(attrs['stroke-width'] || 2)
        };
    }

    /**
     * 解析矩形路径
     */
    parseRectangle(commands, attrs) {
        // 从 M 命令获取起点
        const mCmd = commands[0];
        const x = mCmd.params[0] || 0;
        const y = mCmd.params[1] || 0;

        // 计算宽高（简化处理）
        let maxX = x, maxY = y;
        commands.forEach(cmd => {
            if (cmd.params.length >= 2) {
                maxX = Math.max(maxX, cmd.params[0]);
                maxY = Math.max(maxY, cmd.params[1]);
            }
        });

        return {
            type: 'rect',
            x: x,
            y: y,
            w: maxX - x,
            h: maxY - y,
            fill: attrs.fill || 'none',
            stroke: attrs.stroke || '#333333',
            strokeWidth: parseFloat(attrs['stroke-width'] || 1),
            rx: 0
        };
    }

    /**
     * 解析连接线（带箭头的线）
     */
    parseConnector(commands, attrs) {
        // 获取起点和终点
        let currentX = 0, currentY = 0;
        let startX, startY, endX, endY;

        commands.forEach((cmd, idx) => {
            if (cmd.command === 'M' && idx === 0) {
                startX = currentX = cmd.params[0] || 0;
                startY = currentY = cmd.params[1] || 0;
            } else if (cmd.command === 'L') {
                endX = currentX = cmd.params[0] || currentX;
                endY = currentY = cmd.params[1] || currentY;
            } else if (cmd.command === 'C') {
                // 贝塞尔曲线终点
                endX = currentX = cmd.params[4] || currentX;
                endY = currentY = cmd.params[5] || currentY;
            }
        });

        // 如果没有明确的终点，使用最后一个点
        if (endX === undefined) endX = startX;
        if (endY === undefined) endY = startY;

        return {
            type: 'line',
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            x1: startX,
            y1: startY,
            x2: endX,
            y2: endY,
            w: Math.abs(endX - startX),
            h: Math.abs(endY - startY),
            fill: 'none',
            stroke: attrs.stroke || '#333333',
            strokeWidth: parseFloat(attrs['stroke-width'] || 2),
            isConnector: true
        };
    }

    /**
     * 解析复杂路径
     */
    parseComplexPath(commands, attrs) {
        // 提取所有关键点
        const points = [];
        let currentX = 0, currentY = 0;

        commands.forEach(cmd => {
            if (cmd.params.length >= 2) {
                if (cmd.command === 'M') {
                    currentX = cmd.params[0];
                    currentY = cmd.params[1];
                    points.push({ x: currentX, y: currentY, type: 'move' });
                } else if (cmd.command === 'L') {
                    currentX = cmd.params[0];
                    currentY = cmd.params[1];
                    points.push({ x: currentX, y: currentY, type: 'line' });
                } else if (cmd.command === 'C') {
                    currentX = cmd.params[4];
                    currentY = cmd.params[5];
                    points.push({ x: currentX, y: currentY, type: 'curve' });
                }
            }
        });

        // 计算包围盒
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);

        return {
            type: 'custom',
            points: points,
            commands: commands,
            x: Math.min(...xs),
            y: Math.min(...ys),
            w: Math.max(...xs) - Math.min(...xs),
            h: Math.max(...ys) - Math.min(...ys),
            fill: attrs.fill || 'none',
            stroke: attrs.stroke || '#333333',
            strokeWidth: parseFloat(attrs['stroke-width'] || 1)
        };
    }

    /**
     * 获取路径的起点和终点
     */
    getPathEndpoints(commands) {
        let startX = 0, startY = 0, endX = 0, endY = 0;

        commands.forEach((cmd, idx) => {
            if (cmd.command === 'M' && idx === 0) {
                startX = endX = cmd.params[0] || 0;
                startY = endY = cmd.params[1] || 0;
            } else if (cmd.params.length >= 2) {
                switch (cmd.command) {
                    case 'L':
                    case 'T':
                        endX = cmd.params[0];
                        endY = cmd.params[1];
                        break;
                    case 'C':
                    case 'S':
                    case 'Q':
                        endX = cmd.params[cmd.params.length - 2];
                        endY = cmd.params[cmd.params.length - 1];
                        break;
                    case 'H':
                        endX = cmd.params[0];
                        break;
                    case 'V':
                        endY = cmd.params[0];
                        break;
                }
            }
        });

        return { startX, startY, endX, endY };
    }
}

module.exports = { PathHandler };
