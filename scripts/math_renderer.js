const { mathjax } = require('mathjax-full/js/mathjax.js');
const { TeX } = require('mathjax-full/js/input/tex.js');
const { SVG } = require('mathjax-full/js/output/svg.js');
const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');

class MathRenderer {
    constructor(options = {}) {
        this.scale = options.scale || 2;
        this.throwOnError = options.throwOnError || false;

        // 初始化 MathJax（一次性）
        const adaptor = liteAdaptor();
        RegisterHTMLHandler(adaptor);
        this._adaptor = adaptor;

        const tex = new TeX({ packages: AllPackages });
        const svgOut = new SVG({ fontCache: 'local' });
        this._doc = mathjax.document('', { InputJax: tex, OutputJax: svgOut });
    }

    /**
     * 渲染 LaTeX 公式为纯 SVG（base64 data URL）
     * @param {string} latex - LaTeX 公式字符串
     * @param {string} type - 'inline' 或 'block'
     * @returns {Object} { format, data, width, height, isPlaceholder }
     */
    render(latex, type = 'inline') {
        if (!latex || typeof latex !== 'string' || latex.trim() === '') {
            return this._createPlaceholder(latex || '');
        }

        const displayMode = type === 'block';

        try {
            const node = this._doc.convert(latex, { display: displayMode });
            let svgStr = this._adaptor.outerHTML(node);

            // 提取纯 <svg> 元素，去掉 <mjx-container> 包裹
            const svgMatch = svgStr.match(/(<svg[\s\S]*<\/svg>)/);
            if (!svgMatch) {
                return this._createPlaceholder(latex);
            }
            svgStr = svgMatch[1];

            // 替换 currentColor 为黑色（PPT 不支持 currentColor）
            svgStr = svgStr.replace(/currentColor/g, '#000000');

            // 从 SVG 属性提取尺寸（MathJax 使用 ex 单位）
            const widthMatch = svgStr.match(/width="([\d.]+)ex"/);
            const heightMatch = svgStr.match(/height="([\d.]+)ex"/);
            const viewBoxMatch = svgStr.match(/viewBox="([\d\s.-]+)"/);

            let widthPx, heightPx;
            if (viewBoxMatch) {
                const parts = viewBoxMatch[1].trim().split(/\s+/);
                const vbWidth = parseFloat(parts[2]);
                const vbHeight = parseFloat(parts[3]);
                // 1ex ≈ 16px，乘以缩放
                const exScale = 16 * this.scale;
                widthPx = (parseFloat(widthMatch?.[1] || vbWidth / 16)) * exScale;
                heightPx = (parseFloat(heightMatch?.[1] || vbHeight / 16)) * exScale;
            } else {
                widthPx = 400 * this.scale;
                heightPx = 100 * this.scale;
            }

            // base64 编码
            const base64 = Buffer.from(svgStr).toString('base64');
            const dataUrl = 'data:image/svg+xml;base64,' + base64;

            return {
                format: 'svg',
                data: dataUrl,
                width: widthPx,
                height: heightPx,
                isPlaceholder: false
            };

        } catch (error) {
            console.warn('Math render failed: ' + latex, error.message);
            return this._createPlaceholder(latex);
        }
    }

    /**
     * 创建占位符
     */
    _createPlaceholder(latex) {
        const width = 200 * this.scale;
        const height = 60 * this.scale;
        const escapedLatex = this._escapeHtml(
            typeof latex === 'string' ? latex.substring(0, 30) : ''
        );

        const svg =
            '<svg xmlns="http://www.w3.org/2000/svg" ' +
            'width="' + width + '" height="' + height + '">' +
            '<rect width="100%" height="100%" fill="#F5F5F5" ' +
            'stroke="#CCCCCC" stroke-width="1"/>' +
            '<text x="50%" y="40%" font-family="monospace" ' +
            'font-size="' + (12 * this.scale) + '" ' +
            'fill="#666666" text-anchor="middle">[公式渲染失败]</text>' +
            '<text x="50%" y="65%" font-family="monospace" ' +
            'font-size="' + (10 * this.scale) + '" ' +
            'fill="#999999" text-anchor="middle">' + escapedLatex + '</text>' +
            '</svg>';

        const base64 = Buffer.from(svg).toString('base64');

        return {
            format: 'placeholder',
            data: 'data:image/svg+xml;base64,' + base64,
            width: width,
            height: height,
            isPlaceholder: true,
            originalLatex: latex
        };
    }

    _escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

module.exports = { MathRenderer };
