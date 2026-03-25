/**
 * 母版布局管理器 (DRY 重构)
 */

const { LAYOUT_CONFIG } = require('./config');

class MasterSlideManager {
    constructor(pptx, layoutConfig) {
        this.pptx = pptx;
        this.layoutConfig = layoutConfig;
        this.masterNames = {
            portrait: 'PORTRAIT_CONTENT_MASTER',
            landscape: 'LANDSCAPE_CONTENT_MASTER'
        };
    }

    defineMasters() {
        this._defineMaster('portrait', this.masterNames.portrait);
        this._defineMaster('landscape', this.masterNames.landscape);
    }

    _defineMaster(configKey, masterName) {
        const config = this.layoutConfig[configKey];
        const { row1, row2, row3, row4 } = config;

        this.pptx.defineSlideMaster({
            title: masterName,
            objects: [
                { rect: { x: row1.titleBox.x, y: row1.titleBox.y, w: row1.titleBox.w, h: row1.titleBox.h,
                          fill: { color: 'FFFFFF' }, line: { color: row1.titleBox.borderColor, width: row1.titleBox.borderWidth } } },
                { rect: { x: row1.pageNumberBox.x, y: row1.pageNumberBox.y, w: row1.pageNumberBox.w, h: row1.pageNumberBox.h,
                          fill: { color: 'FFFFFF' }, line: { color: row1.pageNumberBox.borderColor, width: row1.pageNumberBox.borderWidth } } },
                { rect: { x: row2.subtitleBox.x, y: row2.subtitleBox.y, w: row2.subtitleBox.w, h: row2.subtitleBox.h,
                          fill: { color: 'FFFFFF' }, line: { color: row2.subtitleBox.borderColor, width: row2.subtitleBox.borderWidth } } },
                { rect: { x: row3.contentBox.x, y: row3.contentBox.y, w: row3.contentBox.w, h: row3.contentBox.h,
                          fill: { color: 'FFFFFF' }, line: { color: row3.contentBox.borderColor, width: row3.contentBox.borderWidth } } },
                { rect: { x: row4.col1Box.x, y: row4.col1Box.y, w: row4.col1Box.w, h: row4.col1Box.h,
                          fill: { color: 'FFFFFF' }, line: { color: row4.col1Box.borderColor, width: row4.col1Box.borderWidth } } },
                { rect: { x: row4.col2Box.x, y: row4.col2Box.y, w: row4.col2Box.w, h: row4.col2Box.h,
                          fill: { color: 'FFFFFF' }, line: { color: row4.col2Box.borderColor, width: row4.col2Box.borderWidth } } },
                { rect: { x: row4.col3Box.x, y: row4.col3Box.y, w: row4.col3Box.w, h: row4.col3Box.h,
                          fill: { color: 'FFFFFF' }, line: { color: row4.col3Box.borderColor, width: row4.col3Box.borderWidth } } },
            ]
        });
    }

    getMasterName(layoutType) {
        return layoutType === 'portrait'
            ? this.masterNames.portrait
            : this.masterNames.landscape;
    }
}

module.exports = { MasterSlideManager };
