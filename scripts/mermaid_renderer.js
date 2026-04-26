/**
 * Mermaid 图表渲染器
 * 纯 Node.js 实现，通过配置文件禁用 foreignObject，生成 PPT 兼容的 SVG
 * 支持 EMF 格式（需要 Inkscape）
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const os = require("os");
const sizeOf = require("image-size");

class MermaidRenderer {
    constructor(options = {}) {
        this.tempDir = options.tempDir || path.join(os.tmpdir(), "md-to-ppt-mermaid");
        this.enabled = options.mermaidEnabled !== false;
        this.scale = options.scale || 2;
        this.pngScale = options.pngScale || 4;  // PNG 专用 scale
        this.theme = options.theme || "default";
        this.backgroundColor = options.backgroundColor || "transparent";
        this.outputFormat = options.outputFormat || "emf";
        this.fallbackToPng = options.fallbackToPng !== false;
        this.inkscapeAvailable = null;  // 缓存 Inkscape 可用性检测结果

        // Mermaid 配置文件：禁用 foreignObject，生成 PPT 兼容的 SVG（可选）
        this.configFile = options.configFile || path.join(__dirname, "..", "assets", "mermaid_config.json");

        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }

        this.tempFiles = [];
        this.mmdcPath = this.findMmdcPath();
    }

    findMmdcPath() {
        const localBin = path.join(__dirname, "..", "node_modules", ".bin");
        const platform = os.platform();
        const mmdcName = platform === "win32" ? "mmdc.cmd" : "mmdc";
        const localPath = path.join(localBin, mmdcName);

        if (fs.existsSync(localPath)) {
            return localPath;
        }
        return "mmdc";
    }

    findInkscapePath() {
        const platform = os.platform();

        // Windows 平台可能的 Inkscape 路径
        if (platform === "win32") {
            const commonPaths = [
                "C:\\Program Files\\Inkscape\\bin\\inkscape.exe",
                "C:\\Program Files (x86)\\Inkscape\\bin\\inkscape.exe",
                path.join(os.homedir(), "AppData\\Local\\Programs\\Inkscape\\bin\\inkscape.exe")
            ];
            for (const p of commonPaths) {
                if (fs.existsSync(p)) {
                    return p;
                }
            }
            // 尝试从 PATH 查找
            return "inkscape";
        }

        // Linux/macOS
        return "inkscape";
    }

    async checkAvailability() {
        if (!this.enabled) return false;

        return new Promise((resolve) => {
            const mmdc = spawn(this.mmdcPath, ["--version"], { shell: true });
            mmdc.on("error", () => resolve(false));
            mmdc.on("close", (code) => resolve(code === 0));
        });
    }

    /**
     * 检测 Inkscape 是否可用（用于 EMF 转换）
     */
    async checkInkscapeAvailability() {
        if (this.inkscapeAvailable !== null) {
            return this.inkscapeAvailable;
        }

        const inkscapePath = this.findInkscapePath();

        return new Promise((resolve) => {
            const inkscape = spawn(inkscapePath, ["--version"], { shell: true });
            inkscape.on("error", () => {
                this.inkscapeAvailable = false;
                resolve(false);
            });
            inkscape.on("close", (code) => {
                this.inkscapeAvailable = (code === 0);
                resolve(code === 0);
            });
        });
    }

    /**
     * 将 SVG 转换为 EMF 格式（使用 Inkscape）
     */
    async convertSvgToEmf(svgPath, emfPath) {
        const inkscapeAvailable = await this.checkInkscapeAvailability();

        if (!inkscapeAvailable) {
            throw new Error("Inkscape not available for EMF conversion");
        }

        const inkscapePath = this.findInkscapePath();

        return new Promise((resolve, reject) => {
            // Inkscape 1.0+ 命令行语法
            const args = [
                svgPath,
                "--export-type=emf",
                `--export-filename=${emfPath}`
            ];

            const inkscape = spawn(inkscapePath, args, { shell: true });

            let stderr = "";
            inkscape.stderr.on("data", (data) => {
                stderr += data.toString();
            });

            inkscape.on("close", (code) => {
                if (code === 0 && fs.existsSync(emfPath)) {
                    this.tempFiles.push(emfPath);
                    resolve({ path: emfPath, format: "emf" });
                } else {
                    reject(new Error(stderr || "Inkscape EMF conversion failed"));
                }
            });

            inkscape.on("error", (err) => {
                reject(new Error(`Inkscape error: ${err.message}`));
            });
        });
    }

    /**
     * 渲染 Mermaid 图表
     * 支持三种输出格式：
     * - EMF: 最佳 PPT 兼容性（需要 Inkscape）
     * - SVG: 矢量格式（可作为图片嵌入）
     * - PNG: 光栅格式（最高兼容性）
     */
    async render(mermaidCode, outputName) {
        try {
            // EMF 格式：先渲染 SVG，然后转换为 EMF
            if (this.outputFormat === "emf") {
                const inkscapeAvailable = await this.checkInkscapeAvailability();

                if (inkscapeAvailable) {
                    console.log(`  使用 EMF 格式（通过 Inkscape 转换）`);
                    const svgResult = await this._renderWithFormat(mermaidCode, outputName, "svg");
                    if (svgResult && svgResult.path) {
                        const emfPath = svgResult.path.replace('.svg', '.emf');
                        await this.convertSvgToEmf(svgResult.path, emfPath);
                        // 获取 EMF 文件尺寸（使用原 SVG 尺寸）
                        return {
                            path: emfPath,
                            width: svgResult.width,
                            height: svgResult.height,
                            format: "emf"
                        };
                    }
                } else {
                    console.warn(`  Inkscape 不可用，EMF 降级为 SVG 格式`);
                    // 降级为 SVG
                    this.outputFormat = "svg";
                    return await this.render(mermaidCode, outputName);
                }
            }

            // SVG 或 PNG 格式
            return await this._renderWithFormat(mermaidCode, outputName, this.outputFormat);
        } catch (err) {
            // 降级处理
            if (this.fallbackToPng) {
                if (this.outputFormat === "emf") {
                    console.warn(`  EMF 渲染失败，降级为 PNG: ${err.message}`);
                    return await this._renderWithFormat(mermaidCode, outputName, "png");
                } else if (this.outputFormat === "svg") {
                    console.warn(`  SVG 渲染失败，降级为 PNG: ${err.message}`);
                    return await this._renderWithFormat(mermaidCode, outputName, "png");
                }
            }
            throw err;
        }
    }

    async _renderWithFormat(mermaidCode, outputName, format) {
        if (!this.enabled) {
            return null;
        }

        const inputFile = path.join(this.tempDir, `${outputName}.mmd`);
        const ext = format === "svg" ? ".svg" : ".png";
        const outputFile = path.join(this.tempDir, `${outputName}${ext}`);

        fs.writeFileSync(inputFile, mermaidCode, "utf-8");
        this.tempFiles.push(inputFile);

        return new Promise((resolve, reject) => {
            // PNG 使用更高的 scale
            const scale = format === 'png' ? this.pngScale : this.scale;

            const args = [
                "-i", inputFile,
                "-o", outputFile,
                "-e", format,
                "-s", String(scale),
                "-t", this.theme,
                "-b", this.backgroundColor,
            ];

            // 只有配置文件存在时才添加
            if (this.configFile && fs.existsSync(this.configFile)) {
                args.push("-c", this.configFile);
            }

            const mmdc = spawn(this.mmdcPath, args, { shell: true });

            let stderr = "";
            mmdc.stderr.on("data", (data) => {
                stderr += data.toString();
            });

            mmdc.on("close", async (code) => {
                if (code === 0 && fs.existsSync(outputFile)) {
                    setTimeout(async () => {
                        if (fs.existsSync(outputFile)) {
                            const stats = fs.statSync(outputFile);
                            if (stats.size > 0) {
                                // SVG 格式：内联 CSS 样式以兼容 PowerPoint
                                if (format === 'svg') {
                                    try {
                                        this.inlineSvgStyles(outputFile);
                                    } catch (err) {
                                        console.warn(`Failed to inline SVG styles: ${err.message}`);
                                    }
                                }
                                this.tempFiles.push(outputFile);
                                try {
                                    const dimensions = sizeOf(outputFile);
                                    resolve({
                                        path: outputFile,
                                        width: dimensions.width,
                                        height: dimensions.height,
                                        format: format
                                    });
                                } catch (err) {
                                    console.warn(`Failed to get image dimensions: ${err.message}`);
                                    resolve({
                                        path: outputFile,
                                        width: null,
                                        height: null,
                                        format: format
                                    });
                                }
                            } else {
                                console.warn(`Mermaid rendering failed: output file is empty`);
                                reject(new Error("Output file is empty"));
                            }
                        } else {
                            console.warn(`Mermaid渲染失败：延迟后文件未找到`);
                            reject(new Error("File not found after delay"));
                        }
                    }, 100);
                } else {
                    console.warn(`Mermaid rendering failed: ${stderr}`);
                    reject(new Error(stderr || "Rendering failed"));
                }
            });

            mmdc.on("error", (err) => {
                console.warn(`Mermaid-cli not available: ${err.message}`);
                reject(err);
            });
        });
    }

    /**
     * 将 HSL 颜色转换为 HEX 格式
     * PowerPoint 不支持 HSL，需要转换为 RGB
     */
    hslToHex(hslStr) {
        // 匹配 hsl(h, s%, l%) 或 hsla(h, s%, l%, a)
        const match = hslStr.match(/hsla?\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)/i);
        if (!match) {
            return hslStr; // 不是 HSL 格式，返回原值
        }

        const h = parseFloat(match[1]) / 360;
        const s = parseFloat(match[2]) / 100;
        const l = parseFloat(match[3]) / 100;
        const a = match[4] ? parseFloat(match[4]) : 1;

        // HSL to RGB 转换
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        // 转换为 HEX
        const toHex = (c) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        const hex = '#' + toHex(r) + toHex(g) + toHex(b);

        // 如果有 alpha 值，返回 rgba 格式（PowerPoint 可能不支持 rgba，但比 HSL 好）
        if (a !== 1) {
            return `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a})`;
        }

        return hex;
    }

    /**
     * 将 SVG 中的 CSS 样式内联到元素属性中
     * 解决 PowerPoint 不支持 SVG 内联 CSS 的问题
     *
     * 处理内容：
     * 1. 全局转换所有 HSL 颜色为 HEX（适用所有 SVG 类型）
     * 2. 思维导图：处理后代选择器，为节点背景和文字应用 section 颜色
     */
    inlineSvgStyles(svgPath) {
        let svgContent = fs.readFileSync(svgPath, 'utf-8');
        let modified = false;

        // Step 1: 全局转换所有 HSL 颜色为 HEX
        // PowerPoint 不支持 HSL 格式的 fill/stroke
        const hslGlobalRegex = /hsla?\s*\(\s*\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?%\s*,\s*\d+(?:\.\d+)?%\s*(?:,\s*\d+(?:\.\d+)?\s*)?\)/gi;
        const afterHsl = svgContent.replace(hslGlobalRegex, (match) => this.hslToHex(match));
        if (afterHsl !== svgContent) modified = true;
        svgContent = afterHsl;

        // Step 2: 思维导图 - 为后代元素应用 section 样式
        if (svgContent.includes('aria-roledescription="mindmap"')) {
            svgContent = this._applyMindmapStyles(svgContent);
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(svgPath, svgContent, 'utf-8');
        }
    }

    /**
     * 为思维导图 SVG 应用 section-based 样式到后代元素
     * 处理 CSS 后代选择器（如 .section-0 path），PowerPoint 不支持此类选择器
     */
    _applyMindmapStyles(svgContent) {
        const styleMatch = svgContent.match(/<style[^>]*>([\s\S]*?)<\/style>/);
        if (!styleMatch) return svgContent;

        const css = styleMatch[1];

        // 从 CSS 中提取每个 section 的填充色
        // CSS 已经过 HSL→HEX 转换，所以颜色值现在是 #XXXXXX 格式
        const sectionFills = {};
        // 匹配: .section-XXXX tag { ... fill: #XXXX; ... }
        const sectionFillRegex = /\.section-([\w-]+)\s+(?:rect|path|circle|polygon)[^}]*?fill:\s*(#[0-9a-fA-F]+|[a-zA-Z]+)\s*(?:;|})/g;
        let m;
        while ((m = sectionFillRegex.exec(css)) !== null) {
            sectionFills[m[1]] = m[2];
        }

        // 提取文字颜色
        const sectionTextColors = {};
        const textColorRegex = /\.section-([\w-]+)\s+text[^}]*?fill:\s*(#[0-9a-fA-F]+|[a-zA-Z]+)\s*(?:;|})/g;
        while ((m = textColorRegex.exec(css)) !== null) {
            sectionTextColors[m[1]] = m[2];
        }

        let result = svgContent;
        const sectionKeys = Object.keys(sectionFills);

        // 对每个 section，在对应的 mindmap-node 组内应用样式
        for (const sectionKey of sectionKeys) {
            const sectionClass = `section-${sectionKey}`;
            const fillColor = sectionFills[sectionKey];
            const textColor = sectionTextColors[sectionKey] || '#000000';

            // 在当前 SVG 中查找所有此 section 的 mindmap-node 组
            let searchStart = 0;
            while (searchStart < result.length) {
                // 查找包含 mindmap-node 和该 section class 的 g 元素
                const classPattern = `mindmap-node ${sectionClass}`;
                const nodePos = result.indexOf(classPattern, searchStart);
                if (nodePos === -1) break;

                // 找到外层 <g 的开始位置
                const groupOpen = result.lastIndexOf('<g', nodePos);

                // 找到匹配的 </g>（通过深度计数处理嵌套 <g>）
                const tagStart = result.indexOf('>', nodePos) + 1;
                let depth = 1;
                let pos = tagStart;
                while (depth > 0 && pos < result.length) {
                    const nextOpen = result.indexOf('<g', pos);
                    const nextClose = result.indexOf('</g>', pos);

                    if (nextClose === -1) break;
                    if (nextOpen !== -1 && nextOpen < nextClose) {
                        depth++;
                        pos = result.indexOf('>', nextOpen) + 1;
                    } else {
                        depth--;
                        pos = nextClose + 4;
                    }
                }
                const groupContentEnd = pos - 4;

                // 提取组内容并应用样式
                const groupContent = result.slice(tagStart, groupContentEnd);
                let modifiedGroup = groupContent;

                // 为 node-bkg 元素添加 fill
                // 注意处理自闭合标签：<path class="...node-bkg..." .../>
                modifiedGroup = modifiedGroup.replace(
                    /(<(?:path|rect|circle)[^>]*class="[^"]*node-bkg[^"]*")([^>]*?)>/g,
                    (match, tagClass, rest) => {
                        if (match.includes('fill="') && !match.includes('fill=""')) return match;
                        // 自闭合标签：将 / 移到 fill 后面
                        const trimmed = rest.trimEnd();
                        const isSelfClosing = trimmed.endsWith('/');
                        const cleanRest = isSelfClosing ? trimmed.slice(0, -1).trimEnd() : rest;
                        const closing = isSelfClosing ? ' />' : '>';
                        return `${tagClass}${cleanRest} fill="${fillColor}"${closing}`;
                    }
                );

                // 为 text 元素添加 fill（颜色）
                modifiedGroup = modifiedGroup.replace(
                    /<text([^>]*?)>/g,
                    (match, attrs) => {
                        if (attrs.includes('fill="') && !attrs.includes('fill=""')) return match;
                        return `<text${attrs} fill="${textColor}">`;
                    }
                );

                result = result.slice(0, tagStart) + modifiedGroup + result.slice(groupContentEnd);
                searchStart = tagStart + modifiedGroup.length;
            }
        }

        return result;
    }

    cleanup() {
        this.tempFiles.forEach(file => {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            } catch (err) {
                // 忽略清理错误
            }
        });
    }
}

module.exports = { MermaidRenderer };
