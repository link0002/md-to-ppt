class MathFormulaParser {
    constructor() {
        this.inlineRegex = /\$([^\$\n]+?)\$/g;
        this.blockRegex = /\$\$([\s\S]+?)\$\$/g;
    }

    detectFormulas(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        const formulas = [];
        let processedText = text;

        // 处理转义美元符号
        const escapedMap = new Map();
        let escapeIndex = 0;
        processedText = processedText.replace(/\\\$/g, () => {
            const placeholder = `__ESCAPED_DOLLAR_${escapeIndex}__`;
            escapedMap.set(placeholder, '\\$');
            escapeIndex++;
            return placeholder;
        });

        // 检测块级公式
        let blockMatch;
        const blockRegex = new RegExp(this.blockRegex);
        while ((blockMatch = blockRegex.exec(processedText)) !== null) {
            formulas.push({
                type: 'block',
                latex: blockMatch[1].trim(),
                position: blockMatch.index,
                endIndex: blockMatch.index + blockMatch[0].length
            });
        }

        // 移除已匹配的块级公式
        let textWithoutBlocks = processedText;
        for (const formula of [...formulas].reverse()) {
            textWithoutBlocks = textWithoutBlocks.slice(0, formula.position) +
                ' '.repeat(formula.endIndex - formula.position) +
                textWithoutBlocks.slice(formula.endIndex);
        }

        // 检测行内公式
        let inlineMatch;
        const inlineRegex = new RegExp(this.inlineRegex);
        while ((inlineMatch = inlineRegex.exec(textWithoutBlocks)) !== null) {
            if (inlineMatch[0].trim()) {
                formulas.push({
                    type: 'inline',
                    latex: inlineMatch[1],
                    position: inlineMatch.index,
                    endIndex: inlineMatch.index + inlineMatch[0].length
                });
            }
        }

        formulas.sort((a, b) => a.position - b.position);
        return formulas;
    }

    hasFormulas(text) {
        return this.detectFormulas(text).length > 0;
    }
}

module.exports = { MathFormulaParser };
