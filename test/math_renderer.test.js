const { MathRenderer } = require('../scripts/math_renderer');

describe('MathRenderer', () => {

    test('渲染简单行内公式为 SVG', () => {
        const renderer = new MathRenderer();
        const result = renderer.render('x^2', 'inline');
        expect(result.format).toBe('svg');
        expect(result.data).toMatch(/^data:image\/svg\+xml;base64,/);
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
    });

    test('渲染块级公式为 SVG', () => {
        const renderer = new MathRenderer();
        const result = renderer.render('\\frac{a}{b}', 'block');
        expect(result.format).toBe('svg');
        expect(result.data).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    test('无效 LaTeX 返回占位符', () => {
        const renderer = new MathRenderer();
        const result = renderer.render('', 'inline');
        expect(result.isPlaceholder).toBe(true);
        expect(result.format).toBe('placeholder');
    });

    test('设置不同缩放比例', () => {
        const renderer = new MathRenderer({ scale: 3 });
        const result = renderer.render('x', 'inline');
        expect(result.format).toBe('svg');
    });
});
