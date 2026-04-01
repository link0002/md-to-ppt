const katex = require('katex');
const fs = require('fs');
const path = require('path');

class MathRenderer {
    constructor(options = {}) {
        this.scale = options.scale || 2;
        this.throwOnError = options.throwOnError || false;
        this.fontSize = options.fontSize || 24; // base font size in px
        this._katexCss = null;
    }

    /**
     * Get KaTeX CSS content (cached)
     */
    _getKatexCss() {
        if (!this._katexCss) {
            const cssPath = path.join(
                path.dirname(require.resolve('katex')),
                '..',
                'dist',
                'katex.min.css'
            );
            this._katexCss = fs.readFileSync(cssPath, 'utf-8');
        }
        return this._katexCss;
    }

    /**
     * Render a LaTeX formula to SVG (base64 data URL)
     * @param {string} latex - The LaTeX formula string
     * @param {string} type - 'inline' or 'block'
     * @returns {Object} Render result with format, data, width, height
     */
    async render(latex, type = 'inline') {
        if (!latex || typeof latex !== 'string' || latex.trim() === '') {
            return this._createPlaceholder(latex || '');
        }

        const displayMode = type === 'block';

        try {
            const html = katex.renderToString(latex, {
                displayMode: displayMode,
                throwOnError: this.throwOnError,
                output: 'html',
                trust: true
            });

            // Extract height from KaTeX's strut style (in em units)
            const strutMatch = html.match(/height:([\d.]+)em/);
            const emHeight = strutMatch ? parseFloat(strutMatch[1]) : 1.2;

            // Estimate width based on formula complexity and display mode
            // KaTeX uses em-based sizing; we approximate width from content
            const estimatedEmWidth = displayMode
                ? Math.max(latex.length * 0.3, 2)
                : Math.max(latex.length * 0.25, 1.5);

            const baseWidth = estimatedEmWidth * this.fontSize;
            const baseHeight = emHeight * this.fontSize;

            const width = Math.ceil(baseWidth * this.scale);
            const height = Math.ceil((baseHeight + 0.5) * this.scale); // add padding

            const css = this._getKatexCss();

            // Build SVG with foreignObject to embed KaTeX HTML
            const svg =
                '<svg xmlns="http://www.w3.org/2000/svg" ' +
                'width="' + width + '" ' +
                'height="' + height + '">' +
                '<style><![CDATA[' + css + ']]></style>' +
                '<foreignObject x="0" y="0" width="' + width + '" height="' + height + '">' +
                '<div xmlns="http://www.w3.org/1999/xhtml" ' +
                'style="display:flex;align-items:center;justify-content:center;' +
                'width:100%;height:100%;font-size:' + (this.fontSize * this.scale) + 'px;">' +
                html +
                '</div>' +
                '</foreignObject>' +
                '</svg>';

            const base64 = Buffer.from(svg).toString('base64');
            const dataUrl = 'data:image/svg+xml;base64,' + base64;

            return {
                format: 'svg',
                data: dataUrl,
                width: width,
                height: height,
                isPlaceholder: false
            };

        } catch (error) {
            console.warn('Math render failed: ' + latex, error.message);
            return this._createPlaceholder(latex);
        }
    }

    /**
     * Create a placeholder SVG for failed renderings
     * @param {string} latex - The original LaTeX that failed
     * @returns {Object} Placeholder result
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

    /**
     * Escape HTML special characters
     * @param {string} text
     * @returns {string}
     */
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
