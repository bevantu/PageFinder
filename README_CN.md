<p align="center">
  <strong>🌐 <a href="README.md">English</a> | <a href="README_CN.md">中文</a></strong>
</p>

# 🔍 PageFinder — 智能网页链接提取器

> 专为 [NotebookLM](https://notebooklm.google.com/) 工作流设计，自动提取网页中所有链接，再也不用一个一个手动复制！

![Node.js](https://img.shields.io/badge/Node.js-v18+-green?logo=node.js) ![License](https://img.shields.io/badge/license-MIT-blue) ![Puppeteer](https://img.shields.io/badge/Powered_by-Puppeteer-40B5A4?logo=puppeteer)

## ✨ 功能特性

- 🤖 **Puppeteer 驱动** — 使用真实 Chrome 浏览器渲染，完美支持 React / Next.js / Vue 等现代 SPA 应用
- 📑 **分页内容提取** — 自动点击标签页，提取切换后才显示的隐藏内容
- 🏷️ **智能分类** — 自动将链接分为 YouTube、Google文档/Drive、GitHub、PDF、社交主页、品牌首页、站内、外部
- 🌊 **深度爬取** — 支持深度 1 / 2 / 3 递归爬取子页面
- 🔍 **实时搜索过滤** — 按标题或 URL 快速筛选
- 📋 **一键复制** — 复制单条链接、标题+链接，或一键复制全部
- 📥 **导出 Markdown** — 直接生成结构化文档，可粘贴进 NotebookLM
- 🌐 **中英文界面** — 支持切换中文和英文界面

## 🚀 快速开始

### 前置要求

- [Node.js](https://nodejs.org/) v18 或更高版本

### 安装

```bash
git clone https://github.com/bevantu/PageFinder.git
cd PageFinder
npm install
```

> ⚠️ 首次 `npm install` 会自动下载 Puppeteer 内置的 Chromium，约 300MB，请耐心等待。

### 启动

```bash
node server.js
```

然后在浏览器访问 **http://localhost:3737**

> 💡 第一次请求会启动内置 Chrome（约 3-5 秒），之后速度更快。

## 📖 使用说明

1. **输入网页地址** — 粘贴你想要提取链接的页面 URL
2. **选择爬取深度**：
   - **仅首页** — 只分析当前页面（速度最快）
   - **深度 2/3** — 递归进入子页面继续提取（适合目录/课程索引页）
3. **爬取内容类型** — 预选需要提取的链接类型（支持多选，在爬取前指定）
4. **快速预览** — 单页快速模式，适合先看看效果
5. **深度爬取** — 完整多层爬取模式

### 导出到 NotebookLM

点击 **导出** 按钮，生成 `.md` 文件，直接上传到 NotebookLM 作为知识源；或点击 **复制全部** 直接粘贴链接列表。

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js + Express |
| 爬虫 | Puppeteer (Chromium) + Axios + Cheerio |
| 前端 | HTML / Vanilla CSS / Vanilla JS |
| 设计 | Dark UI + Glassmorphism |

## 📁 项目结构

```
PageFinder/
├── server.js          # 后端：爬虫 + API 服务
├── package.json
├── public/
│   ├── index.html     # 前端页面
│   ├── style.css      # 样式
│   └── app.js         # 前端逻辑
├── README.md          # 英文 README
└── README_CN.md       # 中文 README
```

## 📄 License

MIT © 2026
