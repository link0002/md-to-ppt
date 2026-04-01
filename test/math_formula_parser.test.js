const { MathFormulaParser } = require('../scripts/math_formula_parser');

describe('MathFormulaParser', () => {
    test('检测单个行内公式', () => {
        const parser = new MathFormulaParser();
        const result = parser.detectFormulas('公式 $E=mc^2$ 在这里');
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('inline');
        expect(result[0].latex).toBe('E=mc^2');
        expect(result[0].position).toBe(3);
    });

    test('检测块级公式', () => {
        const parser = new MathFormulaParser();
        const result = parser.detectFormulas('$$\n\\int x dx\n$$');
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('block');
        expect(result[0].latex).toBe('\\int x dx');
    });

    test('检测多个公式', () => {
        const parser = new MathFormulaParser();
        const result = parser.detectFormulas('$a+b$ 和 $c-d$');
        expect(result).toHaveLength(2);
    });

    test('转义美元符号不被识别', () => {
        const parser = new MathFormulaParser();
        const result = parser.detectFormulas('价格 \\$5 元');
        expect(result).toHaveLength(0);
    });

    test('空文本返回空数组', () => {
        const parser = new MathFormulaParser();
        const result = parser.detectFormulas('');
        expect(result).toEqual([]);
    });
});
