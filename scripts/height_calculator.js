/**
 * 内容高度计算器
 */

const { wrapText } = require('./utils');

class HeightCalculator {
    constructor(layout) {
        this.layout = layout;
    }

    calculateHeight(item) {
        switch (item.type) {
            case "subtitle":
                return 0.4;

            case "subsubtitle":
                return 0.35;

            case "subsubsubtitle":
                return 0.3;

            case "bullet": {
                const lines = wrapText(item.text, this.layout.row3.contentArea.w - 0.2);
                const bulletLineHeight = 18 / 72;
                return Math.max(0.3, lines.length * bulletLineHeight);
            }

            case "number": {
                const numLines = wrapText(item.text, this.layout.row3.contentArea.w - 0.2);
                const numLineHeight = 18 / 72;
                return Math.max(0.3, numLines.length * numLineHeight);
            }

            case "listGroup": {
                const listFontSize = 12;
                const listLineSpacingPt = 18;
                const listParagraphSpacingPt = 8;
                const listPaddingPt = 2;
                const listContentWidth = this.layout.row3.contentArea.w - 0.2;

                let totalPt = listPaddingPt;
                for (let i = 0; i < item.items.length; i++) {
                    const subItem = item.items[i];
                    const subLines = wrapText(subItem.text, listContentWidth);
                    const itemPt = listFontSize + (subLines.length - 1) * listLineSpacingPt;
                    if (i > 0) totalPt += listParagraphSpacingPt;
                    totalPt += itemPt;
                }
                return totalPt / 72;
            }

            case "text": {
                const textLines = wrapText(item.text, this.layout.row3.contentArea.w);
                const textLineHeight = 18 / 72;
                return Math.max(0.3, textLines.length * textLineHeight + 7 / 72);
            }

            case "code": {
                const codeLines = item.code.split("\n");
                const displayLines = Math.min(codeLines.length, 10);
                return 0.3 + displayLines * 0.12 + 0.2;
            }

            case "table": {
                const cells = item.text.split("|").filter(c => c.trim() !== "");
                return cells.length > 0 ? 0.25 : 0;
            }

            case "mermaid":
                if (item._actualHeight) {
                    return item._actualHeight;
                }
                return 3.0;

            default:
                return 0.2;
        }
    }
}

module.exports = { HeightCalculator };
