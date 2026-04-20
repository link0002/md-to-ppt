# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Markdown to PowerPoint converter that supports:
- Markdown parsing with headings, lists, tables, code blocks, blockquotes
- Mermaid diagram rendering (via `@mermaid-js/mermaid-cli`)
- Math formula rendering via MathJax SVG (`$$...$$` block only)
- Inline text formatting (bold, italic, code)
- Portrait (7.5" x 10.83") and landscape (10" x 7.5") layouts
- SVG-based Mermaid diagrams embedded as base64 images

## Development Commands

```bash
# Basic conversion (portrait, SVG format for mermaid)
node scripts/md_to_ppt.js -i <input.md> -o <output.pptx>

# Quick test
node scripts/md_to_ppt.js -i test/test.md -o test/quick-test.pptx -l portrait --mermaid-format svg

# Integration test
node scripts/md_to_ppt.js -i test/integration-test.md -o test/integration-test.pptx -l portrait --mermaid-format svg

# Show help
node scripts/md_to_ppt.js --help
```

## Architecture

The converter follows a pipeline architecture:

```
md_to_ppt.js (CLI)
    ↓
MarkdownToPptConverter (converter.js)
    ├── parse() → parses markdown into slide objects
    └── generate() → renders slides to PPT
        ↓
LayoutEngine (layout_engine.js)
    ├── manages slide creation and pagination
    ├── delegates to MasterSlideManager for layout
    └── uses HeightCalculator for content sizing
        ↓
Content Renderers
    ├── addCodeBlock() - gray background boxes
    ├── addBlockquote() - blue background boxes with icon
    ├── addMathFormula() - MathJax-rendered SVG images
    └── addMermaidDiagram() - via MermaidRenderer
        ↓
Output: .pptx file
```

### Key Modules

**converter.js** - Main orchestrator. Parses markdown line-by-line, handling:
- Heading levels (# = cover, ## = section start, ### = new slide)
- Code blocks (```) - detects type (mermaid vs regular code)
- Blockquotes (>) - multi-line support
- Tables, lists, inline formatting

**layout_engine.js** - Slide layout and pagination:
- `addTable()` - parses inline markdown in cells using `parseInlineMarkdown()`
- `addElement()` - handles auto-pagination when content exceeds slide height
- Creates slides using master templates from `MasterSlideManager`

**config.js** - Defines two layouts (portrait/landscape) with 4-row structure:
- row1: title box + page number
- row2: subtitle box
- row3: main content area
- row4: footer columns

**utils.js** - Core utilities:
- `parseInlineMarkdown()` - converts `**bold**`, `*italic*`, `` `code` `` to PptxGenJS format arrays
- `calculateBestImageSize()` - fits images within content bounds

**mermaid_renderer.js** - Renders mermaid via `mmdc` CLI:
- Supports EMF (via Inkscape), SVG, PNG formats
- SVGs are embedded as base64 data URLs
- Falls back to PNG if EMF/SVG fails

**math_formula_parser.js** - LaTeX formula detection:
- `detectFormulas()` - regex-based detection of `$$...$$` block syntax
- Handles escaped `\$` characters

**math_renderer.js** - Formula rendering via MathJax SVG (mathjax-full):
- `render()` - converts LaTeX to pure SVG using MathJax (no browser needed)
- Returns base64-encoded SVG data URLs for PPT embedding
- Strips `<mjx-container>` wrapper, replaces `currentColor` with `#000000`
- Fallback placeholder for invalid/empty formulas

## Important Implementation Details

### Table Cell Formatting
Tables use `parseInlineMarkdown()` for each cell. PptxGenJS expects:
```javascript
// Simple text: just string
"Cell Text"

// With formatting: object with text array
{ text: [{ text: "Bold", options: { bold: true } }], options: {} }
```

### Blockquote Styling
- Background: `E8F4FD` (light blue)
- Border: `4A90E2` (blue)
- Icon: 💡
- Differs from code blocks (gray `F5F5F5`, black border)

### Content Pagination
The `LayoutEngine.addElement()` method checks if content fits:
- If `currentY + height > maxY`, calls `startNewSlide()`
- Each content type has height calculated in `height_calculator.js`

### Mermaid Format Handling
- EMF: requires Inkscape, best for PPT editing
- SVG: embedded as base64, good for vector quality
- PNG: fallback option, highest compatibility
