<p align="center">
  <strong>🌐 <a href="README.md">English</a> | <a href="README_CN.md">中文</a></strong>
</p>

# 🔍 PageFinder — Intelligent Web Link Extractor

> Designed for [NotebookLM](https://notebooklm.google.com/) workflows. Automatically extract all links from any web page — no more manual copy-paste!

![Node.js](https://img.shields.io/badge/Node.js-v18+-green?logo=node.js) ![License](https://img.shields.io/badge/license-MIT-blue) ![Puppeteer](https://img.shields.io/badge/Powered_by-Puppeteer-40B5A4?logo=puppeteer)

## ✨ Features

- 🤖 **Puppeteer-powered** — Uses a real Chrome browser to render pages, fully supports React / Next.js / Vue SPAs
- 📑 **Tab content extraction** — Automatically clicks tabs to reveal hidden content
- 🏷️ **Smart categorization** — Auto-classifies links as YouTube, Google Docs/Drive, GitHub, PDF, Social, Homepage, Internal, or External
- 🌊 **Deep crawl** — Supports depth 1 / 2 / 3 recursive sub-page crawling
- 🔍 **Real-time search & filter** — Quickly filter by title or URL
- 📋 **One-click copy** — Copy a single link, title + link, or all links at once
- 📥 **Markdown export** — Generate structured documents ready for NotebookLM
- 🌐 **Bilingual UI** — Supports both English and Chinese interfaces

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher

### Installation

```bash
git clone https://github.com/bevantu/PageFinder.git
cd PageFinder
npm install
```

> ⚠️ The first `npm install` will download Puppeteer's bundled Chromium (~300MB). Please be patient.

### Run

```bash
node server.js
```

Then open **http://localhost:3737** in your browser.

> 💡 The first request launches the built-in Chrome (~3-5 seconds). Subsequent requests are faster.

## 📖 Usage

1. **Enter a URL** — Paste the page URL you want to extract links from
2. **Choose crawl depth**:
   - **Page only** — Analyze only the current page (fastest)
   - **Depth 2/3** — Recursively enter sub-pages (great for course index or syllabus pages)
3. **Content type filter** — Pre-select which link types you want (multi-select, applied before crawl)
4. **Quick preview** — Single-page fast mode
5. **Deep crawl** — Full multi-level crawl mode

### Export to NotebookLM

Click **Export** to generate a `.md` file for direct upload to NotebookLM, or click **Copy All** to copy all URLs to your clipboard.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Crawler | Puppeteer (Chromium) + Axios + Cheerio |
| Frontend | HTML / Vanilla CSS / Vanilla JS |
| Design | Dark UI + Glassmorphism |

## 📁 Project Structure

```
PageFinder/
├── server.js          # Backend: crawler + API
├── package.json
├── public/
│   ├── index.html     # Frontend page
│   ├── style.css      # Styles
│   └── app.js         # Frontend logic
├── README.md          # English README
└── README_CN.md       # Chinese README
```

## 📄 License

MIT © 2026
