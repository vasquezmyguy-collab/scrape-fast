# 🚀 scrape-fast

> Lightning-fast web scraper CLI — extract text, links, images, metadata, and structured data from any URL

[![npm version](https://img.shields.io/npm/v/scrape-fast.svg)](https://www.npmjs.com/package/scrape-fast)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **One command scraping** — Extract all data from any URL in a single command
- **Anti-detection** — Built-in stealth mode to bypass bot detection
- **Multiple output formats** — JSON, CSV, Markdown, or plain text
- **Smart extraction** — Pull specific data types (links, images, tables, forms, headings)
- **CSS selectors** — Target specific elements on the page
- **JavaScript rendering** — Handles SPAs and dynamic content via Puppeteer
- **Screenshots & PDFs** — Save visual snapshots alongside data
- **Infinite scroll** — Auto-scroll pages before extraction
- **Proxy support** — Route through proxy servers
- **Custom headers & cookies** — Authenticate and bypass restrictions

## Install

```bash
npm install -g scrape-fast
```

## Quick Start

```bash
# Scrape all data from a page (outputs JSON)
scrape-fast https://example.com

# Extract just links and save as CSV
scrape-fast https://example.com -e links -f csv -o links.csv

# Take a screenshot
scrape-fast https://example.com --screenshot page.png

# Extract text from specific elements
scrape-fast https://news.ycombinator.com -s ".title a" -e text -f text

# Save page as PDF
scrape-fast https://example.com --pdf page.pdf

# Scrape with custom viewport and wait time
scrape-fast https://spa-app.com --viewport 1920x1080 --wait 5000

# Export as Markdown
scrape-fast https://example.com -f markdown -o page.md
```

## Options

| Flag | Alias | Description | Default |
|------|-------|-------------|---------|
| `--format` | `-f` | Output format: `json`, `csv`, `markdown`, `text` | `json` |
| `--output` | `-o` | Output file path | stdout |
| `--extract` | `-e` | What to extract: `all`, `text`, `links`, `images`, `meta`, `headings`, `tables`, `forms` | `all` |
| `--selector` | `-s` | CSS selector to target | all elements |
| `--viewport` | | Viewport size (e.g., `1920x1080`) | `1280x720` |
| `--wait` | `-w` | Wait time in ms for JS rendering | `2000` |
| `--screenshot` | | Save screenshot to file | off |
| `--pdf` | | Save page as PDF to file | off |
| `--scroll` | | Auto-scroll page before extracting | `false` |
| `--user-agent` | | Custom User-Agent string | stealth UA |
| `--headers` | | Custom headers as JSON string | none |
| `--cookie` | | Cookie as `name=value` (repeatable) | none |
| `--proxy` | | Proxy server URL | none |
| `--stealth` | | Use stealth mode (default: true) | `true` |
| `--timeout` | | Navigation timeout in ms | `30000` |
| `--no-headless` | | Show browser window for debugging | `false` |

## Programmatic API

```javascript
const { scrape } = require('scrape-fast');

const data = await scrape('https://example.com', {
  format: 'json',
  extract: 'all',
  wait: 3000,
  stealth: true,
  screenshot: 'screenshot.png',
});

console.log(data.title);
console.log(data.links);
console.log(data.text);
```

## Use Cases

- **SEO Analysis** — Extract meta tags, headings, and content structure
- **Lead Generation** — Scrape contact info and links from directories
- **Content Archiving** — Save pages as Markdown/PDF for offline reading
- **Competitive Research** — Monitor competitor pages for changes
- **Data Extraction** — Pull tables and structured data from any webpage
- **Accessibility Auditing** — Extract images (with alt text) and form structures

## License

MIT © [Vasquez Ventures](https://vasquezventures.surge.sh)
