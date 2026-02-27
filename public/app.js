/* ═══════════════════════════════════════════════
   PageFinder — App Logic
═══════════════════════════════════════════════ */

const $ = id => document.getElementById(id);
const API = '';

// ── State ────────────────────────────────────────
let allLinks = [];       // raw results from API
let baseLinks = [];       // allLinks after pre-crawl type filter
let filteredLinks = [];   // baseLinks after category tab + search
let activeCategory = 'all';
let searchQuery = '';
let currentDepth = 1;
let sameDomainOnly = true;
let preFilterCats = new Set(['all']); // pre-crawl type selection
let currentLang = localStorage.getItem('pf_lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en');

// ── i18n ─────────────────────────────────────────
const I18N = {
    zh: {
        pageTitle: 'PageFinder — 智能网页链接提取器',
        logoSub: '智能网页链接提取器',
        badge: '专为 NotebookLM 设计',
        searchLabel: '输入网页地址',
        urlPlaceholder: 'https://example.com/course',
        clear: '清除',
        depthLabel: '爬取深度',
        depth1: '仅首页',
        depth2: '深度 2',
        depth3: '深度 3',
        scopeLabel: '深度爬取范围',
        toggleText: '递进时只跟踪同域名链接',
        toggleHint: '仅对深度 2 / 3 生效',
        toggleHintDisabled: '深度为 1 时无效（无需跟踪子页面）',
        toggleHintOn: '深度 {d} 爬取时，只跟踪同域名子页面',
        toggleHintOff: '深度 {d} 爬取时，会跨域追踪外部链接（较慢）',
        typeLabel: '爬取内容类型',
        multiSelect: '· 可多选',
        catAll: '全部',
        catInternal: '站内页面',
        catExternal: '外部链接',
        catGoogle: 'Google文档',
        catSocial: '社交主页',
        catHomepage: '品牌首页',
        crawlBtn: '深度爬取',
        previewBtn: '快速预览',
        errorTitle: '爬取失败',
        retryBtn: '重试',
        statLinks: '条链接',
        statPages: '个页面',
        searchPlaceholder: '搜索链接标题或URL…',
        copyAll: '复制全部',
        exportBtn: '导出',
        emptyFilter: '没有找到匹配的链接',
        loadingPreview: '正在快速预览首页…',
        loadingPreviewSub: '仅提取首层链接，速度更快',
        loadingCrawl: '正在深度爬取 (深度 {d})…',
        loadingCrawlSub: '正在递归分析所有链接，请耐心等待',
        toastCopied: '✅ 已复制 {n} 条链接',
        toastCopiedOne: '✅ 已复制链接',
        toastCopiedBoth: '✅ 已复制标题+链接',
        toastExported: '📥 已导出 Markdown 文件',
        toastNoUrl: '请输入网页地址',
        toastBadUrl: '网址格式不正确',
        toastCrawlFail: '爬取失败，请检查网址或网络连接',
        filterNote: '（共爬取 {r} 条，已按类型过滤）',
        exportTitle: '# PageFinder 导出结果',
        exportSource: '来源',
        exportTime: '时间',
        exportCount: '共 {n} 条链接',
        exportLink: '链接',
        exportType: '类型',
        copyTitle: '复制链接',
        copyBothTitle: '复制 标题 + 链接',
        openTitle: '在新标签中打开',
        allTab: '🗂 全部',
    },
    en: {
        pageTitle: 'PageFinder — Intelligent Web Link Extractor',
        logoSub: 'Web Link Extractor',
        badge: 'Built for NotebookLM',
        searchLabel: 'Enter Page URL',
        urlPlaceholder: 'https://example.com/course',
        clear: 'Clear',
        depthLabel: 'Crawl Depth',
        depth1: 'Page Only',
        depth2: 'Depth 2',
        depth3: 'Depth 3',
        scopeLabel: 'Deep Crawl Scope',
        toggleText: 'Follow same-domain links only',
        toggleHint: 'Applies to depth 2 / 3 only',
        toggleHintDisabled: 'No effect at depth 1 (no sub-pages to follow)',
        toggleHintOn: 'Depth {d}: only follows same-domain sub-pages',
        toggleHintOff: 'Depth {d}: will cross domains to external sites (slower)',
        typeLabel: 'Content Types',
        multiSelect: '· multi-select',
        catAll: 'All',
        catInternal: 'Internal',
        catExternal: 'External',
        catGoogle: 'Google Docs',
        catSocial: 'Social',
        catHomepage: 'Homepage',
        crawlBtn: 'Deep Crawl',
        previewBtn: 'Quick Preview',
        errorTitle: 'Crawl Failed',
        retryBtn: 'Retry',
        statLinks: 'links',
        statPages: 'pages',
        searchPlaceholder: 'Search title or URL…',
        copyAll: 'Copy All',
        exportBtn: 'Export',
        emptyFilter: 'No matching links found',
        loadingPreview: 'Previewing page…',
        loadingPreviewSub: 'Extracting first-level links only',
        loadingCrawl: 'Deep crawling (depth {d})…',
        loadingCrawlSub: 'Recursively analyzing all links, please wait',
        toastCopied: '✅ Copied {n} links',
        toastCopiedOne: '✅ Link copied',
        toastCopiedBoth: '✅ Title + link copied',
        toastExported: '📥 Markdown file exported',
        toastNoUrl: 'Please enter a URL',
        toastBadUrl: 'Invalid URL format',
        toastCrawlFail: 'Crawl failed. Check URL or network.',
        filterNote: '({r} total, filtered by type)',
        exportTitle: '# PageFinder Export',
        exportSource: 'Source',
        exportTime: 'Time',
        exportCount: '{n} links total',
        exportLink: 'Link',
        exportType: 'Type',
        copyTitle: 'Copy link',
        copyBothTitle: 'Copy title + link',
        openTitle: 'Open in new tab',
        allTab: '🗂 All',
    }
};

function t(key, vars) {
    let s = I18N[currentLang]?.[key] || I18N.zh[key] || key;
    if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.replace(`{${k}}`, v); });
    return s;
}

function applyI18n() {
    document.title = t('pageTitle');
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
    // data-i18n → textContent
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    // data-i18n-placeholder → placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    // data-i18n-title → title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.dataset.i18nTitle);
    });
    // Update language button label
    const langLabel = $('langLabel');
    if (langLabel) langLabel.textContent = currentLang === 'zh' ? 'EN' : '中';
}

function toggleLang() {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('pf_lang', currentLang);
    applyI18n();
    updateToggleState(); // refresh hint text in new language
}

// ── Category icons & colors ──────────────────────
const CAT_ICONS = {
    Internal: '🔗',
    External: '🌐',
    YouTube: '▶️',
    'Google Drive/Docs': '📄',
    GitHub: '🐙',
    PDF: '📕',
    Dynamic: '⚡',
    Social: '👤',
    Homepage: '🏠',
    Link: '🔗',
    default: '🔗',
};
const CAT_CLASS = {
    Internal: 'cat-Internal',
    External: 'cat-External',
    YouTube: 'cat-YouTube',
    'Google Drive/Docs': 'cat-Google',
    GitHub: 'cat-GitHub',
    PDF: 'cat-PDF',
    Dynamic: 'cat-Dynamic',
    Social: 'cat-Social',
    Homepage: 'cat-Homepage',
    default: 'cat-Internal',
};
const BADGE_CLASS = {
    Internal: 'badge-Internal',
    External: 'badge-External',
    YouTube: 'badge-YouTube',
    'Google Drive/Docs': 'badge-Google',
    GitHub: 'badge-GitHub',
    PDF: 'badge-PDF',
    Dynamic: 'badge-Dynamic',
    Social: 'badge-Social',
    Homepage: 'badge-Homepage',
    default: 'badge-Internal',
};

// ── Elements ─────────────────────────────────────
const urlInput = $('urlInput');
const clearBtn = $('clearBtn');
const crawlBtn = $('crawlBtn');
const previewBtn = $('previewBtn');
const loadingSection = $('loadingSection');
const loadingTitle = $('loadingTitle');
const loadingSub = $('loadingSub');
const errorSection = $('errorSection');
const errorMsg = $('errorMsg');
const retryBtn = $('retryBtn');
const resultsSection = $('resultsSection');
const linkList = $('linkList');
const catTabs = $('catTabs');
const statTotal = $('statTotal');
const statPages = $('statPages');
const pageTitle = $('pageTitle');
const searchInput = $('searchInput');
const copyAllBtn = $('copyAllBtn');
const exportBtn = $('exportBtn');
const emptyFilter = $('emptyFilter');
const toast = $('toast');

// ── Depth selector ───────────────────────────────
document.querySelectorAll('.depth-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.depth-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDepth = parseInt(btn.dataset.depth);
        updateToggleState();
    });
});

function updateToggleState() {
    const hint = $('toggleHint');
    if (currentDepth <= 1) {
        document.querySelector('.toggle-wrap').classList.add('disabled-toggle');
        if (hint) {
            hint.textContent = t('toggleHintDisabled');
            hint.classList.remove('active-hint');
        }
    } else {
        document.querySelector('.toggle-wrap').classList.remove('disabled-toggle');
        if (hint) {
            hint.textContent = sameDomainOnly
                ? t('toggleHintOn', { d: currentDepth })
                : t('toggleHintOff', { d: currentDepth });
            hint.classList.add('active-hint');
        }
    }
}

// ── URL input ────────────────────────────────────
urlInput.addEventListener('input', () => {
    clearBtn.style.display = urlInput.value ? 'flex' : 'none';
});
urlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') doCrawl(false);
});
clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    clearBtn.style.display = 'none';
    urlInput.focus();
    hideAll();
});
$('sameDomainToggle').addEventListener('change', e => {
    sameDomainOnly = e.target.checked;
    updateToggleState();
});

// ── Filter chips — 爬取前多选预设 ────────────────
// 默认「全部」选中；选具体类型时「全部」自动取消；
// 所有具体类型都取消时自动回到「全部」。
document.querySelectorAll('#filterChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const cat = chip.dataset.cat;
        if (cat === 'all') {
            preFilterCats = new Set(['all']);
        } else {
            preFilterCats.delete('all');
            if (preFilterCats.has(cat)) {
                preFilterCats.delete(cat);
                if (preFilterCats.size === 0) preFilterCats.add('all'); // 全部取消 → 回到「全部」
            } else {
                preFilterCats.add(cat);
            }
        }
        updateChipStates();
    });
});

function updateChipStates() {
    document.querySelectorAll('#filterChips .chip').forEach(chip => {
        chip.classList.toggle('active', preFilterCats.has(chip.dataset.cat));
    });
}

function applyPreFilter(links) {
    if (preFilterCats.has('all')) return links;
    return links.filter(l => preFilterCats.has(l.category));
}

// ── Crawl triggers ───────────────────────────────
crawlBtn.addEventListener('click', () => doCrawl(false));
previewBtn.addEventListener('click', () => doCrawl(true));
retryBtn.addEventListener('click', () => doCrawl(false));

// ── Search ───────────────────────────────────────
searchInput.addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase();
    applyFilters();
});

// ── Copy all / Export ────────────────────────────
copyAllBtn.addEventListener('click', () => {
    if (!filteredLinks.length) return;
    const text = filteredLinks.map(l => l.url).join('\n');
    copyText(text);
    showToast(t('toastCopied', { n: filteredLinks.length }), 'success');
});

exportBtn.addEventListener('click', () => {
    if (!filteredLinks.length) return;
    const lines = [t('exportTitle'), '', `${t('exportSource')}: ${urlInput.value}`, `${t('exportTime')}: ${new Date().toLocaleString(currentLang === 'zh' ? 'zh-CN' : 'en-US')}`, t('exportCount', { n: filteredLinks.length }), '', '---', ''];
    for (const l of filteredLinks) {
        lines.push(`## ${l.title}`);
        lines.push(`- ${t('exportLink')}: ${l.url}`);
        lines.push(`- ${t('exportType')}: ${l.category}`);
        lines.push('');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pagefinder_${Date.now()}.md`;
    a.click();
    showToast(t('toastExported'), 'success');
});

// ── Core: Crawl ──────────────────────────────────
async function doCrawl(preview = false) {
    let url = urlInput.value.trim();
    if (!url) { showToast(t('toastNoUrl'), 'error'); urlInput.focus(); return; }
    if (!url.startsWith('http')) url = 'https://' + url;

    // Validate
    try { new URL(url); } catch { showToast(t('toastBadUrl'), 'error'); return; }

    urlInput.value = url;
    showLoading(preview);

    try {
        const endpoint = preview ? '/api/preview' : '/api/crawl';
        const body = preview
            ? { url }
            : { url, depth: currentDepth, sameDomainOnly };

        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${resp.status}`);
        }

        const data = await resp.json();
        allLinks = data.links || [];

        // Apply pre-crawl type filter → baseLinks
        baseLinks = applyPreFilter(allLinks);

        // Build category tabs from baseLinks
        renderCatTabs(baseLinks);

        activeCategory = 'all';
        searchQuery = '';
        searchInput.value = '';

        applyFilters();
        // Show adjusted total (pre-filtered)
        showResults(data, baseLinks.length);
    } catch (err) {
        showError(err.message || t('toastCrawlFail'));
    }
}

// ── Filters ──────────────────────────────────────
function applyFilters() {
    // Filter within baseLinks (already pre-filtered by type chips)
    filteredLinks = baseLinks.filter(l => {
        const matchCat = activeCategory === 'all' || l.category === activeCategory;
        const matchSearch = !searchQuery ||
            l.title.toLowerCase().includes(searchQuery) ||
            l.url.toLowerCase().includes(searchQuery);
        return matchCat && matchSearch;
    });
    renderLinks(filteredLinks);
    emptyFilter.style.display = (filteredLinks.length === 0 && baseLinks.length > 0) ? 'flex' : 'none';
}

// ── Render: Category tabs ─────────────────────────
function renderCatTabs(links) {
    catTabs.innerHTML = '';
    const counts = {};
    for (const l of links) counts[l.category] = (counts[l.category] || 0) + 1;

    const tabAll = document.createElement('button');
    tabAll.className = 'cat-tab active';
    tabAll.dataset.cat = 'all';
    tabAll.innerHTML = `${t('allTab')} <span class="cat-count">${links.length}</span>`;
    tabAll.addEventListener('click', () => setCatTab('all'));
    catTabs.appendChild(tabAll);

    const catNames = [...new Set(links.map(l => l.category))];
    for (const cat of catNames) {
        const tab = document.createElement('button');
        tab.className = 'cat-tab';
        tab.dataset.cat = cat;
        tab.innerHTML = `${CAT_ICONS[cat] || '🔗'} ${cat} <span class="cat-count">${counts[cat] || 0}</span>`;
        tab.addEventListener('click', () => setCatTab(cat));
        catTabs.appendChild(tab);
    }
}

function setCatTab(cat) {
    activeCategory = cat;
    document.querySelectorAll('.cat-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.cat === cat);
    });
    applyFilters();
}

// ── Render: Link items ────────────────────────────
function renderLinks(links) {
    linkList.innerHTML = '';
    if (!links.length) return;

    const frag = document.createDocumentFragment();
    links.forEach((l, i) => {
        const item = buildLinkItem(l, i);
        frag.appendChild(item);
    });
    linkList.appendChild(frag);
}

function buildLinkItem(link, index) {
    const catClass = CAT_CLASS[link.category] || CAT_CLASS.default;
    const badgeClass = BADGE_CLASS[link.category] || BADGE_CLASS.default;
    const icon = CAT_ICONS[link.category] || CAT_ICONS.default;

    const div = document.createElement('div');
    div.className = `link-item ${catClass}`;
    div.style.animationDelay = `${Math.min(index * 0.03, 0.5)}s`;

    div.innerHTML = `
    <div class="link-item-icon">${icon}</div>
    <div class="link-item-body">
      <div class="link-item-title" title="${esc(link.title)}">${esc(link.title)}</div>
      <div class="link-item-url" title="${esc(link.url)}">${esc(link.url)}</div>
    </div>
    <div class="link-item-meta">
      <span class="cat-badge ${badgeClass}">${esc(link.category)}</span>
      <div class="link-item-actions">
        <button class="action-btn" title="${esc(t('copyTitle'))}" data-url="${esc(link.url)}">
          <svg viewBox="0 0 20 20" fill="none"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" fill="currentColor"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" fill="currentColor"/></svg>
        </button>
        <button class="action-btn" title="${esc(t('copyBothTitle'))}" data-title="${esc(link.title)}" data-url="${esc(link.url)}" data-both="1">
          <svg viewBox="0 0 20 20" fill="none"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" fill="currentColor" clip-rule="evenodd"/></svg>
        </button>
        <a class="action-btn" href="${esc(link.url)}" target="_blank" rel="noopener" title="${esc(t('openTitle'))}">
          <svg viewBox="0 0 20 20" fill="none"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" fill="currentColor"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" fill="currentColor"/></svg>
        </a>
      </div>
    </div>
  `;

    // Copy URL button
    div.querySelectorAll('.action-btn[data-url]').forEach(btn => {
        btn.addEventListener('click', e => {
            if (btn.tagName === 'A') return;
            e.stopPropagation();
            if (btn.dataset.both) {
                copyText(`${btn.dataset.title}\n${btn.dataset.url}`);
                showToast(t('toastCopiedBoth'), 'success');
            } else {
                copyText(btn.dataset.url);
                showToast(t('toastCopiedOne'), 'success');
            }
            btn.classList.add('success');
            setTimeout(() => btn.classList.remove('success'), 1500);
        });
    });

    return div;
}

// ── UI States ─────────────────────────────────────
function showLoading(preview) {
    hideAll();
    loadingTitle.textContent = preview ? t('loadingPreview') : t('loadingCrawl', { d: currentDepth });
    loadingSub.textContent = preview ? t('loadingPreviewSub') : t('loadingCrawlSub');
    loadingSection.style.display = 'block';
}

function showError(msg) {
    hideAll();
    errorMsg.textContent = msg;
    errorSection.style.display = 'block';
}

function showResults(data, filteredTotal) {
    hideAll();
    // Show pre-filtered count if a type filter is active
    const total = (filteredTotal !== undefined) ? filteredTotal : (data.totalLinks || 0);
    statTotal.textContent = total;
    statPages.textContent = data.pagesVisited || 1;
    pageTitle.textContent = data.pageTitle || '—';
    // Show a note if pre-filter reduced the count
    const rawTotal = data.totalLinks || 0;
    const filterNote = $('filterNote');
    if (filterNote) {
        if (!preFilterCats.has('all') && rawTotal > total) {
            filterNote.textContent = t('filterNote', { r: rawTotal });
            filterNote.style.display = 'inline';
        } else {
            filterNote.style.display = 'none';
        }
    }
    resultsSection.style.display = 'block';
}

function hideAll() {
    loadingSection.style.display = 'none';
    errorSection.style.display = 'none';
    resultsSection.style.display = 'none';
}

// ── Utilities ─────────────────────────────────────
function esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function copyText(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
}

let toastTimer;
function showToast(msg, type = '') {
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.className = 'toast'; }, 2800);
}

// ── Init ──────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    // Language toggle button
    const langBtn = $('langBtn');
    if (langBtn) langBtn.addEventListener('click', toggleLang);

    // Apply i18n on load
    applyI18n();

    urlInput.focus();
    updateToggleState();

    // Paste URL from clipboard if available
    if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(text => {
            if (text && text.startsWith('http') && !text.includes('\n') && text.length < 300) {
                urlInput.value = text.trim();
                clearBtn.style.display = 'flex';
            }
        }).catch(() => { });
    }
});
