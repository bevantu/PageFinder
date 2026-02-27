const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');
const iconv = require('iconv-lite');
const https = require('https');

const app = express();
const PORT = 3737;

// Fix SSL cert issues on Windows
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Lazy load puppeteer ─────────────────────────────────────────────────────
let puppeteerBrowser = null;
async function getBrowser() {
    if (!puppeteerBrowser || !puppeteerBrowser.connected) {
        const puppeteer = require('puppeteer');
        puppeteerBrowser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--ignore-certificate-errors',
                '--disable-features=IsolateOrigins,site-per-process',
            ],
        });
    }
    return puppeteerBrowser;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveUrl(base, href) {
    try {
        if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href === '#') return null;
        const url = new URL(href, base);
        // Skip anchor-only
        const baseNoHash = base.replace(/#.*$/, '');
        const targetNoHash = url.href.replace(/#.*$/, '');
        if (targetNoHash === baseNoHash && url.hash) return null;
        url.hash = '';
        return url.href;
    } catch {
        return null;
    }
}

function isSameDomain(baseUrl, targetUrl) {
    try {
        return new URL(baseUrl).hostname === new URL(targetUrl).hostname;
    } catch {
        return false;
    }
}

const ASSET_RE = /\.(png|jpg|jpeg|gif|svg|ico|webp|bmp|mp4|mp3|avi|mov|pdf|zip|tar|gz|css|js|woff|woff2|ttf|eot|otf|map)(\?.*)?$/i;

function isAsset(url) {
    // Allow PDFs but block other assets
    const u = url.replace(/\?.*$/, '').toLowerCase();
    const ext = u.split('.').pop();
    const assetExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'bmp', 'mp4', 'mp3', 'avi', 'mov', 'zip', 'tar', 'gz', 'css', 'woff', 'woff2', 'ttf', 'eot', 'otf', 'map'];
    return assetExts.includes(ext);
}

function cleanText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

function categorize(url, baseUrl) {
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com/') || lower.includes('youtu.be/')) return 'YouTube';
    if (lower.includes('drive.google.com') || lower.includes('docs.google.com') || lower.includes('sheets.google.com') || lower.includes('slides.google.com')) return 'Google Drive/Docs';
    if (lower.includes('github.com')) return 'GitHub';
    if (lower.endsWith('.pdf') || lower.includes('.pdf?')) return 'PDF';
    if (isSameDomain(baseUrl, url)) return 'Internal';
    return 'External';
}

// ─── Fetch via Puppeteer (JS-rendered) ──────────────────────────────────────

async function fetchWithPuppeteer(url) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 900 });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait a bit more for SPAs
        await new Promise(r => setTimeout(r, 2000));

        // Try clicking tab-like elements to reveal hidden content
        const tabSelectors = [
            '[role="tab"]', '.tab', '.nav-item', '.nav-link',
            '[data-tab]', '[data-toggle="tab"]', '.menu-item'
        ];
        for (const sel of tabSelectors) {
            try {
                const tabs = await page.$$(sel);
                for (const tab of tabs.slice(0, 10)) {
                    try { await tab.click(); await new Promise(r => setTimeout(r, 400)); } catch { }
                }
            } catch { }
        }

        const html = await page.content();
        const title = await page.title();
        return { html, title };
    } finally {
        await page.close();
    }
}

// ─── Fetch via Axios (static HTML) ──────────────────────────────────────────

async function fetchWithAxios(url) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Cache-Control': 'no-cache',
    };
    const resp = await axios.get(url, {
        headers,
        timeout: 15000,
        responseType: 'arraybuffer',
        maxRedirects: 5,
        validateStatus: s => s < 400,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    const contentType = resp.headers['content-type'] || '';
    let encoding = 'utf-8';
    const match = contentType.match(/charset=([^\s;]+)/i);
    if (match) encoding = match[1];
    let html = iconv.decode(Buffer.from(resp.data), encoding);
    const metaMatch = html.match(/<meta[^>]+charset=["']?([^"';\s>]+)/i);
    if (metaMatch && metaMatch[1].toLowerCase() !== encoding.toLowerCase()) {
        html = iconv.decode(Buffer.from(resp.data), metaMatch[1]);
    }
    const $ = cheerio.load(html);
    const title = cleanText($('title').text());
    return { html, title };
}

// ─── Extract links from HTML ─────────────────────────────────────────────────

function extractLinks(html, baseUrl) {
    const $ = cheerio.load(html);
    const links = new Map();

    $('script, style, noscript').remove();

    $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const resolved = resolveUrl(baseUrl, href);
        if (!resolved || isAsset(resolved)) return;

        let title =
            cleanText($(el).attr('aria-label') || '') ||
            cleanText($(el).attr('title') || '') ||
            cleanText($(el).text()) ||
            resolved;

        if (title.length > 200) title = title.slice(0, 200) + '…';
        if (!title) title = resolved;

        if (!links.has(resolved)) {
            links.set(resolved, { title, category: categorize(resolved, baseUrl) });
        }
    });

    // Also look for data-href / data-url
    $('[data-href],[data-url],[data-src],[href]').each((_, el) => {
        const href = $(el).attr('data-href') || $(el).attr('data-url');
        if (!href) return;
        const resolved = resolveUrl(baseUrl, href);
        if (!resolved || isAsset(resolved) || links.has(resolved)) return;
        const title = cleanText($(el).text()) || resolved;
        links.set(resolved, { title, category: categorize(resolved, baseUrl) });
    });

    return links;
}

// ─── Smart fetch with fallback ───────────────────────────────────────────────

async function smartFetch(url, usePuppeteer = false) {
    if (usePuppeteer) {
        return await fetchWithPuppeteer(url);
    }
    // Try axios first, fall back to puppeteer if we get no links
    try {
        return await fetchWithAxios(url);
    } catch (e) {
        console.warn(`Axios failed for ${url}, trying puppeteer: ${e.message}`);
        return await fetchWithPuppeteer(url);
    }
}

// ─── API: Preview (single page, always uses puppeteer for accuracy) ──────────

app.post('/api/preview', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    try {
        const { html, title } = await smartFetch(url, true);
        const links = extractLinks(html, url);
        const result = [];
        for (const [linkUrl, info] of links.entries()) {
            result.push({ url: linkUrl, ...info });
        }
        // Sort: internal first, then by category
        result.sort((a, b) => {
            if (a.category === b.category) return a.title.localeCompare(b.title);
            const order = ['Internal', 'YouTube', 'Google Drive/Docs', 'GitHub', 'PDF', 'External'];
            return order.indexOf(a.category) - order.indexOf(b.category);
        });
        res.json({ rootUrl: url, pageTitle: title, totalLinks: result.length, pagesVisited: 1, links: result });
    } catch (err) {
        console.error('Preview error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── API: Deep crawl ─────────────────────────────────────────────────────────

app.post('/api/crawl', async (req, res) => {
    const { url, depth = 2, sameDomainOnly = true } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    let rootUrl;
    try { rootUrl = new URL(url).href; } catch { return res.status(400).json({ error: 'Invalid URL' }); }

    const visited = new Set();
    const allLinks = new Map();
    const queue = [{ url: rootUrl, level: 0 }];
    let pageTitle = '';
    const errors = [];

    while (queue.length > 0) {
        const { url: currentUrl, level } = queue.shift();
        if (visited.has(currentUrl)) continue;
        visited.add(currentUrl);

        console.log(`Crawling [L${level}]: ${currentUrl}`);

        try {
            const usePuppeteer = level < 2; // Use puppeteer for top levels
            const { html, title: pt } = await smartFetch(currentUrl, usePuppeteer);
            if (level === 0) pageTitle = pt;

            const links = extractLinks(html, currentUrl);

            for (const [linkUrl, info] of links.entries()) {
                if (!allLinks.has(linkUrl)) {
                    allLinks.set(linkUrl, { ...info, foundOn: currentUrl, level: level + 1 });
                }
                if (level + 1 < depth && !visited.has(linkUrl) && !isAsset(linkUrl)) {
                    if (sameDomainOnly && !isSameDomain(rootUrl, linkUrl)) continue;
                    queue.push({ url: linkUrl, level: level + 1 });
                }
            }
        } catch (err) {
            console.warn(`Error crawling ${currentUrl}: ${err.message}`);
            errors.push({ url: currentUrl, error: err.message });
        }
    }

    const result = [];
    for (const [url, info] of allLinks.entries()) {
        result.push({ url, ...info });
    }

    // Sort
    result.sort((a, b) => {
        const levelDiff = (a.level || 0) - (b.level || 0);
        if (levelDiff !== 0) return levelDiff;
        if (a.category === b.category) return a.title.localeCompare(b.title);
        const order = ['Internal', 'YouTube', 'Google Drive/Docs', 'GitHub', 'PDF', 'External'];
        return order.indexOf(a.category) - order.indexOf(b.category);
    });

    res.json({ rootUrl, pageTitle, totalLinks: result.length, pagesVisited: visited.size, errors, links: result });
});

// ─── Serve frontend ──────────────────────────────────────────────────────────

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Graceful shutdown
process.on('SIGINT', async () => {
    if (puppeteerBrowser) await puppeteerBrowser.close();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`\n🔍 PageFinder running at http://localhost:${PORT}\n`);
    console.log('   Puppeteer will be launched on first request.');
    console.log('   First request may take a few seconds to start Chrome.\n');
});
