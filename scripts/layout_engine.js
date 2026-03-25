/**
 * 布局引擎
 */

const { STYLE_CONFIG } = require('./config');
const { isCJK, parseInlineMarkdown } = require('./utils');
const { HeightCalculator } = require('./height_calculator');

class LayoutEngine {
    constructor(converter, layout, masterManager) {
        this.converter = converter;
        this.layout = layout;
        this.masterManager = masterManager;
        this.heightCalc = new HeightCalculator(layout);

        this.currentSlide = null;
        this.currentY = layout.row3.contentArea.y;
        this.maxY = layout.row3.contentArea.y + layout.row3.contentArea.h;
        this.currentMainTitle = "";
        this.currentSubtitle = "";
    }

    startNewSlide(mainTitle, subtitle) {
        if (this.currentSlide && this.hasContent()) {
            this.finalizeSlide();
        }

        const masterName = this.masterManager.getMasterName(this.converter.layoutType);
        this.currentSlide = this.converter.pres.addSlide({ masterName: masterName });
        this.converter.slideNumber++;

        if (mainTitle) this.currentMainTitle = mainTitle;
        this.currentSubtitle = subtitle || "";

        this.addDynamicContent();
        this.currentY = this.layout.row3.contentArea.y;
    }

    addDynamicContent() {
        const slide = this.currentSlide;
        const row1 = this.layout.row1;
        const row2 = this.layout.row2;

        const mainTitleSegments = parseInlineMarkdown(this.currentMainTitle || "", {
            fontSize: row1.titleBox.fontSize,
            fontFace: STYLE_CONFIG.fontConfig.fallback,
            color: "000000",
            bold: true
        });
        slide.addText(mainTitleSegments, {
            x: row1.titleBox.x, y: row1.titleBox.y,
            w: row1.titleBox.w, h: row1.titleBox.h,
            valign: "middle", align: "left"
        });

        slide.addText(String(this.converter.slideNumber), {
            x: row1.pageNumberBox.x, y: row1.pageNumberBox.y,
            w: row1.pageNumberBox.w, h: row1.pageNumberBox.h,
            fontSize: row1.pageNumberBox.fontSize,
            fontFace: STYLE_CONFIG.fontConfig.fallback,
            color: "000000", valign: "middle", align: "center"
        });

        if (this.currentSubtitle) {
            const subtitleSegments = parseInlineMarkdown(this.currentSubtitle, {
                fontSize: row2.subtitleBox.fontSize,
                fontFace: STYLE_CONFIG.fontConfig.fallback,
                color: "000000",
                bold: true
            });
            slide.addText(subtitleSegments, {
                x: row2.subtitleBox.x, y: row2.subtitleBox.y,
                w: row2.subtitleBox.w, h: row2.subtitleBox.h,
                valign: "middle", align: "left"
            });
        }
    }

    hasContent() {
        return this.currentY > this.layout.row3.contentArea.y;
    }

    finalizeSlide() {
        this.currentSlide = null;
    }

    addElement(item, addFn) {
        const height = this.heightCalc.calculateHeight(item);

        if (this.currentY + height > this.maxY) {
            if (item.type === "subsubtitle" && this.hasContent()) {
                this.startNewSlide(this.currentMainTitle, "");
            } else if (this.hasContent()) {
                this.startNewSlide(this.currentMainTitle, this.currentSubtitle);
            }
        }

        addFn(this.currentSlide, this.currentY, height);
        this.currentY += height + 0.1;
    }

    _estimateRowHeight(row, colWidths) {
        const cellFontSize = 10;
        const cellPaddingInch = 0.1;
        const cjkWidth = 0.14;
        const latinWidth = 0.07;

        let maxLines = 1;
        for (let i = 0; i < row.length; i++) {
            const cellText = String(row[i]).trim();
            const usableWidth = (colWidths[i] || 1) - 0.1;
            let lineWidth = 0;
            let lines = 1;
            for (const ch of cellText) {
                const charW = isCJK(ch) ? cjkWidth : latinWidth;
                if (lineWidth + charW > usableWidth && lineWidth > 0) {
                    lines++;
                    lineWidth = charW;
                } else {
                    lineWidth += charW;
                }
            }
            maxLines = Math.max(maxLines, lines);
        }

        const lineHeight = (cellFontSize * 1.2) / 72;
        return Math.max(0.25, maxLines * lineHeight + cellPaddingInch);
    }

    addTable(rows) {
        if (rows.length === 0) return;

        const numCols = rows[0].length;
        const colW = this.layout.row3.contentArea.w / numCols;
        const colWidths = Array(numCols).fill(colW);
        const rowHeights = rows.map(row => this._estimateRowHeight(row, colWidths));

        const hasHeader = rows.length > 1;
        const headerHeight = hasHeader ? rowHeights[0] : 0;
        let startIdx = 0;

        while (startIdx < rows.length) {
            const availableH = this.maxY - this.currentY - 0.2;
            let batchEndIdx = startIdx;
            let accumulatedH = 0;
            const headerReserve = (startIdx > 0 && hasHeader) ? headerHeight : 0;

            for (let i = startIdx; i < rows.length; i++) {
                if (accumulatedH + rowHeights[i] + headerReserve > availableH && i > startIdx) break;
                accumulatedH += rowHeights[i];
                batchEndIdx = i + 1;
            }

            if (batchEndIdx === startIdx) {
                batchEndIdx = startIdx + 1;
                accumulatedH = rowHeights[startIdx];
            }

            let batchRows, batchHeights;
            if (startIdx > 0 && hasHeader) {
                batchRows = [rows[0], ...rows.slice(startIdx, batchEndIdx)];
                batchHeights = [rowHeights[0], ...rowHeights.slice(startIdx, batchEndIdx)];
                accumulatedH += headerHeight;
            } else {
                batchRows = rows.slice(startIdx, batchEndIdx);
                batchHeights = rowHeights.slice(startIdx, batchEndIdx);
            }

            this.currentSlide.addTable(batchRows, {
                x: this.layout.row3.contentArea.x,
                y: this.currentY,
                w: this.layout.row3.contentArea.w,
                fontSize: 10,
                fontFace: STYLE_CONFIG.fontConfig.fallback,
                border: { pt: 1, color: "000000" },
                colW: colWidths,
                rowH: batchHeights
            });

            this.currentY += accumulatedH + 0.2;
            startIdx = batchEndIdx;

            if (startIdx < rows.length) {
                this.startNewSlide(this.currentMainTitle, this.currentSubtitle);
            }
        }
    }

    finish() {
        if (this.currentSlide && this.hasContent()) {
            this.finalizeSlide();
        }
    }
}

module.exports = { LayoutEngine };
