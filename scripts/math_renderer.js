const katex = require('katex');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

class MathRenderer {
    constructor(options = {}) {
        this.scale = options.scale || 2;
        this.throwOnError = options.throwOnError || false;
        this.fontSize = options.fontSize || 24;
        this._katexCss = null;
        this._browser = null;
        this._katexFontsDir = null;
    }

    /**
     * Get KaTeX CSS content (cached)
     */
    _getKatexCss() {
        if (!this._katexCss) {
            const katexDir = path.dirname(require.resolve('katex'));
            this._katexFontsDir = path.join(katexDir, '..', 'dist', 'fonts');
            const cssPath = path.join(katexDir, '..', 'dist', 'katex.min.css');
            this._katexCss = fs.readFileSync(cssPath, 'utf-8');
        }
        return this._katexCss;
    }

    /**
     * Get or launch browser instance (cached)
     */
    async _getBrowser() {
        if (!this._browser) {
            this._browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        return this._browser;
    }

    /**
     * Close browser (call when done)
     */
    async close() {
        if (this._browser) {
            await this._browser.close();
            this._browser = null;
        }
    }

    /**
     * Render a LaTeX formula to PNG (base64 data URL)
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

            const css = this._getKatexCss();
            const fontsDir = this._katexFontsDir.replace(/\\/g, '/');

            // Build complete HTML page with KaTeX CSS and font references
            const fullHtml = `<!DOCTYPE html>
<html><head>
<style>
    * { margin: 0; padding: 0; }
    body { display: inline-block; }
    .formula-container {
        display: inline-block;
        padding: 0;
        font-size: ${this.fontSize * this.scale}px;
    }
    @font-face {
        font-family: 'KaTeX_AMS';
        src: url('file:///${fontsDir}/KaTeX_AMS-Regular.woff2') format('woff2'),
             url('file:///${fontsDir}/KaTeX_AMS-Regular.woff') format('woff'),
             url('file:///${fontsDir}/KaTeX_AMS-Regular.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
    }
</style>
<style>${css}</style>
</head><body>
<div class="formula-container">${html}</div>
</body></html>`;

            const browser = await this._getBrowser();
            const page = await browser.newPage();

            try {
                await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

                const container = await page.$('.formula-container');
                const box = await container.boundingBox();

                if (!box) {
                    return this._createPlaceholder(latex);
                }

                // Screenshot with device scale factor for crisp rendering
                const screenshot = await container.screenshot({
                    type: 'png',
                    scale: 1
                });

                const base64 = screenshot.toString('base64');
                const dataUrl = 'data:image/png;base64,' + base64;

                return {
                    format: 'png',
                    data: dataUrl,
                    width: box.width,
                    height: box.height,
                    isPlaceholder: false
                };
            } finally {
                await page.close();
            }

        } catch (error) {
            console.warn('Math render failed: ' + latex, error.message);
            return this._createPlaceholder(latex);
        }
    }

    /**
     * Create a placeholder for failed renderings
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
