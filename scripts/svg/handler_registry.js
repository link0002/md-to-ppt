/**
 * SVG 元素处理器注册中心
 * 负责管理所有处理器，并根据元素类型自动匹配合适的处理器
 */
class HandlerRegistry {
    constructor() {
        this.handlers = [];
    }

    /**
     * 注册处理器
     * @param {SvgElementHandler} handler - 处理器实例
     */
    register(handler) {
        if (!handler || typeof handler.canHandle !== 'function' || typeof handler.parse !== 'function') {
            throw new Error('Invalid handler: must implement canHandle() and parse() methods');
        }
        this.handlers.push(handler);

        // 按优先级排序（数值越小优先级越高）
        this.handlers.sort((a, b) => (a.priority || 100) - (b.priority || 100));
    }

    /**
     * 批量注册处理器
     * @param {Array<SvgElementHandler>} handlers - 处理器数组
     */
    registerAll(handlers) {
        handlers.forEach(handler => this.register(handler));
    }

    /**
     * 获取能处理该元素的处理器
     * @param {Object} element - XML 解析后的 SVG 元素
     * @returns {SvgElementHandler|null} - 返回第一个能处理的处理器，如果没有则返回 null
     */
    getHandler(element) {
        for (const handler of this.handlers) {
            if (handler.canHandle(element)) {
                return handler;
            }
        }
        return null;
    }

    /**
     * 获取所有已注册的处理器
     * @returns {Array<SvgElementHandler>}
     */
    getAllHandlers() {
        return [...this.handlers];
    }

    /**
     * 清空所有已注册的处理器
     */
    clear() {
        this.handlers = [];
    }
}

module.exports = { HandlerRegistry };
