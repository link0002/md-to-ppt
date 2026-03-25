/**
 * 文本工具 + 图片计算
 */

/**
 * 判断字符是否为 CJK 字符
 */
function isCJK(ch) {
    const code = ch.charCodeAt(0);
    return (code >= 0x4E00 && code <= 0x9FFF) ||   // CJK统一汉字
           (code >= 0x3000 && code <= 0x303F) ||   // CJK标点
           (code >= 0xFF00 && code <= 0xFFEF) ||   // 全角字符
           (code >= 0x3400 && code <= 0x4DBF) ||   // CJK扩展A
           (code >= 0xF900 && code <= 0xFAFF);     // CJK兼容
}

/**
 * CJK 感知的文本宽度测量
 */
function measureText(str, cjkW = 0.166, latinW = 0.08) {
    let w = 0;
    for (const ch of str) {
        w += isCJK(ch) ? cjkW : latinW;
    }
    return w;
}

/**
 * 文本换行计算
 */
function wrapText(text, width, cjkW = 0.166, latinW = 0.08) {
    if (typeof text !== 'string') {
        console.warn(`wrapText: expected string, got ${typeof text}`, text);
        return [''];
    }

    if (measureText(text, cjkW, latinW) <= width) {
        return [text];
    }

    const lines = [];
    let lineStart = 0;
    let lineWidth = 0;
    for (let i = 0; i < text.length; i++) {
        const charW = isCJK(text[i]) ? cjkW : latinW;
        if (lineWidth + charW > width && i > lineStart) {
            lines.push(text.substring(lineStart, i));
            lineStart = i;
            lineWidth = charW;
        } else {
            lineWidth += charW;
        }
    }
    if (lineStart < text.length) {
        lines.push(text.substring(lineStart));
    }
    return lines;
}

/**
 * 计算图片在 PPT 中的最佳显示尺寸
 */
function calculateBestImageSize(imgWidth, imgHeight, maxContentWidth, maxContentHeight) {
    const MAX_WIDTH_RATIO = 0.8;
    const MAX_HEIGHT_RATIO = 2/3;

    const maxAllowedWidth = maxContentWidth * MAX_WIDTH_RATIO;
    const maxAllowedHeight = maxContentHeight * MAX_HEIGHT_RATIO;

    const imgAspectRatio = imgWidth / imgHeight;

    // 方案A：固定宽度
    const widthBasedHeight = maxAllowedWidth / imgAspectRatio;
    const widthBasedValid = widthBasedHeight <= maxAllowedHeight;

    // 方案B：固定高度
    const heightBasedWidth = maxAllowedHeight * imgAspectRatio;
    const heightBasedValid = heightBasedWidth <= maxAllowedWidth;

    if (widthBasedValid && heightBasedValid) {
        const widthBasedArea = maxAllowedWidth * widthBasedHeight;
        const heightBasedArea = heightBasedWidth * maxAllowedHeight;
        if (widthBasedArea >= heightBasedArea) {
            return { w: maxAllowedWidth, h: widthBasedHeight, strategy: "fixedWidth" };
        } else {
            return { w: heightBasedWidth, h: maxAllowedHeight, strategy: "fixedHeight" };
        }
    } else if (widthBasedValid) {
        return { w: maxAllowedWidth, h: widthBasedHeight, strategy: "fixedWidth" };
    } else if (heightBasedValid) {
        return { w: heightBasedWidth, h: maxAllowedHeight, strategy: "fixedHeight" };
    } else {
        const widthOverflow = widthBasedHeight / maxAllowedHeight;
        const heightOverflow = heightBasedWidth / maxAllowedWidth;
        if (widthOverflow <= heightOverflow) {
            return { w: maxAllowedWidth, h: widthBasedHeight, strategy: "fixedWidth" };
        } else {
            return { w: heightBasedWidth, h: maxAllowedHeight, strategy: "fixedHeight" };
        }
    }
}

/**
 * 解析 Markdown 内联格式为 PptxGenJS 格式化对象数组
 */
function parseInlineMarkdown(text, baseOptions = {}) {
    const defaultOptions = {
        fontSize: 12,
        fontFace: "微软雅黑",
        color: "000000"
    };
    const options = { ...defaultOptions, ...baseOptions };

    const result = [];
    let i = 0;
    const len = text.length;

    while (i < len) {
        // 处理转义字符
        if (text[i] === '\\' && i + 1 < len) {
            const nextChar = text[i + 1];
            if ('\\`*_{}[]()#+-.!'.includes(nextChar)) {
                result.push({ text: nextChar, options: { ...options } });
                i += 2;
                continue;
            }
        }

        // 检查加粗斜体 ***text*** 或 ___text___
        if (i + 6 < len) {
            if (text.slice(i, i + 3) === '***' || text.slice(i, i + 3) === '___') {
                const delimiter = text.slice(i, i + 3);
                let endPos = text.indexOf(delimiter, i + 3);
                if (endPos !== -1 && endPos + 3 <= len) {
                    const content = text.slice(i + 3, endPos);
                    result.push({ text: content, options: { ...options, bold: true, italic: true } });
                    i = endPos + 3;
                    continue;
                }
            }
        }

        // 检查加粗 **text** 或 __text__
        if (i + 4 < len) {
            if (text.slice(i, i + 2) === '**' || text.slice(i, i + 2) === '__') {
                const delimiter = text.slice(i, i + 2);
                let endPos = text.indexOf(delimiter, i + 2);
                if (endPos !== -1 && endPos + 2 <= len) {
                    if ((delimiter === '**' && text.slice(i, i + 3) !== '***') ||
                        (delimiter === '__' && text.slice(i, i + 3) !== '___')) {
                        const content = text.slice(i + 2, endPos);
                        result.push({ text: content, options: { ...options, bold: true } });
                        i = endPos + 2;
                        continue;
                    }
                }
            }
        }

        // 检查斜体 *text* 或 _text_
        if (i + 2 < len) {
            const char = text[i];
            if ((char === '*' || char === '_') && text[i + 1] !== char) {
                let endPos = text.indexOf(char, i + 1);
                if (endPos !== -1 && endPos + 1 <= len) {
                    const isNotBold = (char === '*' && text.slice(i - 1, i + 1) !== '**' && text.slice(endPos, endPos + 2) !== '**') ||
                                      (char === '_' && text.slice(i - 1, i + 1) !== '__' && text.slice(endPos, endPos + 2) !== '__');
                    if (isNotBold) {
                        const content = text.slice(i + 1, endPos);
                        result.push({ text: content, options: { ...options, italic: true } });
                        i = endPos + 1;
                        continue;
                    }
                }
            }
        }

        // 检查行内代码 `code`
        if (text[i] === '`') {
            let endPos = text.indexOf('`', i + 1);
            if (endPos !== -1 && endPos + 1 <= len) {
                const content = text.slice(i + 1, endPos);
                result.push({ text: content, options: { ...options, fontFace: 'Consolas', color: '333333' } });
                i = endPos + 1;
                continue;
            }
        }

        // 普通字符
        result.push({ text: text[i], options: { ...options } });
        i++;
    }

    // 合并连续的普通文本段
    const merged = [];
    for (const item of result) {
        if (merged.length > 0 &&
            merged[merged.length - 1].options.bold === item.options.bold &&
            merged[merged.length - 1].options.italic === item.options.italic &&
            merged[merged.length - 1].options.fontFace === item.options.fontFace &&
            merged[merged.length - 1].options.color === item.options.color) {
            merged[merged.length - 1].text += item.text;
        } else {
            merged.push(item);
        }
    }

    if (merged.length === 0 && text) {
        return [{ text: text, options: { ...options } }];
    }

    return merged;
}

module.exports = { isCJK, measureText, wrapText, calculateBestImageSize, parseInlineMarkdown };
