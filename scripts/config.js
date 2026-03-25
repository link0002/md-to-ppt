/**
 * 布局和样式配置
 */

const LAYOUT_CONFIG = {
    // 竖版布局 (7.5" x 10.83") - 基于 CC法.pptx 分析
    portrait: {
        row1: {
            y: 0.17, h: 0.37,
            titleBox: {
                x: 0.55, y: 0.17, w: 3.15, h: 0.37,
                fontSize: 16, borderColor: "000000", borderWidth: 1, fillColor: null
            },
            pageNumberBox: {
                x: 6.29, y: 0.17, w: 0.67, h: 0.37,
                fontSize: 12, borderColor: "000000", borderWidth: 1, fillColor: null
            }
        },
        row2: {
            y: 0.54, h: 0.35,
            subtitleBox: {
                x: 0.55, y: 0.54, w: 6.41, h: 0.35,
                fontSize: 14, borderColor: "000000", borderWidth: 1, fillColor: null
            }
        },
        row3: {
            y: 0.89, h: 9.49,
            contentBox: {
                x: 0.55, y: 0.89, w: 6.41, h: 9.49,
                borderColor: "000000", borderWidth: 1
            },
            contentArea: {
                x: 0.60, y: 0.95, w: 6.31, h: 9.30,
                fontSize: 10, lineSpacing: 1.2
            }
        },
        row4: {
            y: 10.38, h: 0.35,
            col1Box: { x: 0.55, y: 10.38, w: 1.98, h: 0.35, borderColor: "000000", borderWidth: 1 },
            col2Box: { x: 2.53, y: 10.38, w: 2.88, h: 0.35, borderColor: "000000", borderWidth: 1 },
            col3Box: { x: 5.41, y: 10.38, w: 1.55, h: 0.35, borderColor: "000000", borderWidth: 1 }
        }
    },
    // 横版布局 (10" x 7.5")
    landscape: {
        row1: {
            y: 0.15, h: 0.30,
            titleBox: {
                x: 0.50, y: 0.15, w: 3.50, h: 0.30,
                fontSize: 16, borderColor: "000000", borderWidth: 1, fillColor: null
            },
            pageNumberBox: {
                x: 8.90, y: 0.15, w: 0.60, h: 0.30,
                fontSize: 12, borderColor: "000000", borderWidth: 1, fillColor: null
            }
        },
        row2: {
            y: 0.45, h: 0.30,
            subtitleBox: {
                x: 0.50, y: 0.45, w: 9.00, h: 0.30,
                fontSize: 14, borderColor: "000000", borderWidth: 1, fillColor: null
            }
        },
        row3: {
            y: 0.75, h: 6.15,
            contentBox: {
                x: 0.50, y: 0.75, w: 9.00, h: 6.15,
                borderColor: "000000", borderWidth: 1
            },
            contentArea: {
                x: 0.55, y: 0.80, w: 8.90, h: 6.00,
                fontSize: 10, lineSpacing: 1.2
            }
        },
        row4: {
            y: 6.90, h: 0.30,
            col1Box: { x: 0.50, y: 6.90, w: 2.65, h: 0.30, borderColor: "000000", borderWidth: 1 },
            col2Box: { x: 3.15, y: 6.90, w: 3.70, h: 0.30, borderColor: "000000", borderWidth: 1 },
            col3Box: { x: 6.85, y: 6.90, w: 2.65, h: 0.30, borderColor: "000000", borderWidth: 1 }
        }
    }
};

const STYLE_CONFIG = {
    borderStyle: {
        type: "solid",
        color: "000000",
        width: 9525  // 1pt in EMU
    },
    fontConfig: {
        latin: "Times New Roman",
        ea: "MS PGothic",
        fallback: "微软雅黑"
    },
    sizes: {
        title1: 18,
        title2: 14,
        body: 10,
        code: 9
    }
};

module.exports = { LAYOUT_CONFIG, STYLE_CONFIG };
