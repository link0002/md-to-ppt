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
                            console.warn(`Mermaid rendering failed: file not found after delay`);
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
