const { MathRenderer } = require('../scripts/math_renderer');
const fs = require('fs');

describe('MathRenderer', () => {
    const testOutputDir = 'test/output/math-renderer';

    beforeAll(() => {
        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }
    });

    test('渲染简单行内公式', async () => {
        const renderer = new MathRenderer();
        const result = await renderer.render('x^2', 'inline');
        expect(result.format).toBe('svg');
        expect(result.data).toMatch(/^data:image\/svg\+xml;base64,/);
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
    });

    test('渲染块级公式', async () => {
        const renderer = new MathRenderer();
        const result = await renderer.render('\\frac{a}{b}', 'block');
        expect(result.format).toBe('svg');
        expect(result.data).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    test('无效 LaTeX 返回占位符', async () => {
        const renderer = new MathRenderer();
        const result = await renderer.render('', 'inline');
        expect(result.isPlaceholder).toBe(true);
        expect(result.format).toBe('placeholder');
    });

    test('设置不同缩放比例', async () => {
        const renderer = new MathRenderer({ scale: 3 });
        const result = await renderer.render('x', 'inline');
        expect(result.format).toBe('svg');
    });
});
