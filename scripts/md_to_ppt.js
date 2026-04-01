#!/usr/bin/env node
/**
 * Markdown to PowerPoint Converter v1.0 - CLI Entry Point
 *
 * Usage:
 *   node md_to_ppt.js -i input.md -o output.pptx -l portrait -w 7.5 -h 10.83
 */

const { MarkdownToPptConverter } = require('./converter');

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        input: null,
        output: null,
        layout: "portrait",
        width: null,
        height: null,
        font: null,
        title: "技术文档",
        mermaidEnabled: true,
        mermaidScale: 2,
        mermaidFormat: "emf",  // emf, svg 或 png，默认 emf
        fallbackToPng: true,   // EMF/SVG 失败时降级为 PNG
        mathEnabled: true,
        mathScale: 2,
        mathEngine: 'katex'
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case "--input":
            case "-i":
                options.input = args[++i];
                break;
            case "--output":
            case "-o":
                options.output = args[++i];
                break;
            case "--layout":
            case "-l":
                options.layout = args[++i];
                break;
            case "--width":
            case "-w":
                options.width = parseFloat(args[++i]);
                break;
            case "--height":
            case "-h":
                options.height = parseFloat(args[++i]);
                break;
            case "--font":
            case "-f":
                options.font = args[++i];
                break;
            case "--title":
            case "-t":
                options.title = args[++i];
                break;
            case "--no-mermaid":
                options.mermaidEnabled = false;
                break;
            case "--mermaid-scale":
                options.mermaidScale = parseFloat(args[++i]);
                break;
            case "--mermaid-format":
                options.mermaidFormat = args[++i];  // emf, svg 或 png
                break;
            case "--no-fallback":
                options.fallbackToPng = false;  // 禁用 PNG 降级
                break;
            case "--no-math":
                options.mathEnabled = false;
                break;
            case "--math-scale":
                options.mathScale = parseFloat(args[++i]);
                break;
            case "--math-engine":
                options.mathEngine = args[++i];
                break;
            case "--help":
                printHelp();
                process.exit(0);
        }
    }

    return options;
}

function printHelp() {
    console.log(`
Markdown to PowerPoint Converter v1.0

Usage: node md_to_ppt.js [options]

Options:
  -i, --input <file>        Input markdown file (required)
  -o, --output <file>       Output PowerPoint file (required)
  -l, --layout <type>       Layout type: landscape or portrait (default: portrait)
  -w, --width <inches>      Slide width in inches
  -h, --height <inches>     Slide height in inches
  -f, --font <name>         Font name (default: 微软雅黑)
  -t, --title <text>        Presentation title (default: 技术文档)
  --no-mermaid              Disable mermaid rendering
  --mermaid-scale <number>  Mermaid rendering scale (default: 2)
  --mermaid-format <format> Mermaid output format: emf, svg or png (default: emf)
  --no-fallback             Disable PNG fallback when EMF/SVG fails
  --no-math                 Disable math formula rendering
  --math-scale <number>     Math rendering scale (default: 2)
  --math-engine <name>      Math engine: katex or mathjax (default: katex)
  --help                    Show this help message

Examples:
  # Basic usage (default EMF format)
  node md_to_ppt.js -i doc.md -o output.pptx

  # SVG format as images
  node md_to_ppt.js -i doc.md -o output.pptx --mermaid-format svg

  # PNG format (highest compatibility)
  node md_to_ppt.js -i doc.md -o output.pptx --mermaid-format png
`);
}

async function main() {
    const options = parseArgs();

    if (!options.input || !options.output) {
        console.error("Error: Input and output files are required");
        printHelp();
        process.exit(1);
    }

    const fs = require("fs");
    if (!fs.existsSync(options.input)) {
        console.error(`Error: File not found - ${options.input}`);
        process.exit(1);
    }

    const converter = new MarkdownToPptConverter(options);
    await converter.generate();
}

if (require.main === module) {
    main().catch(err => {
        console.error("Error:", err.message);
        process.exit(1);
    });
}

module.exports = { MarkdownToPptConverter };
