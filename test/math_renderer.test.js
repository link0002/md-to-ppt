const { MathRenderer } = require('../scripts/math_renderer');
const fs = require('fs');

describe('MathRenderer', () => {
    const testOutputDir = 'test/output/math-renderer';

    beforeAll(() => {
        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }
    });

    afterAll(async () => {
        // Cleanup: close browser if any renderer created one
    });

    test('渲染简单行内公式为 PNG', async () => {
        const renderer = new MathRenderer();
        const result = await renderer.render('x^2', 'inline');
        expect(result.format).toBe('png');
        expect(result.data).toMatch(/^data:image\/png;base64,/);
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
        await renderer.close();
    });

    test('渲染块级公式为 PNG', async () => {
        const renderer = new MathRenderer();
        const result = await renderer.render('\\frac{a}{b}', 'block');
        expect(result.format).toBe('png');
        expect(result.data).toMatch(/^data:image\/png;base64,/);
        await renderer.close();
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
        expect(result.format).toBe('png');
        await renderer.close();
    });
});
