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
    const toggleWrap = $('sameDomainToggle').closest('label') || document.querySelector('.toggle-wrap');
    const hint = $('toggleHint');
    if (currentDepth <= 1) {
        // Toggle has no effect at depth 1 — disable it visually
        document.querySelector('.toggle-wrap').classList.add('disabled-toggle');
        if (hint) {
            hint.textContent = '深度为 1 时无效（无需跟踪子页面）';
            hint.classList.remove('active-hint');
        }
    } else {
        document.querySelector('.toggle-wrap').classList.remove('disabled-toggle');
        if (hint) {
            hint.textContent = sameDomainOnly
                ? `深度 ${currentDepth} 爬取时，只跟踪同域名子页面`
                : `深度 ${currentDepth} 爬取时，会跨域追踪外部链接（较慢）`;
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
    showToast(`✅ 已复制 ${filteredLinks.length} 条链接`, 'success');
});

exportBtn.addEventListener('click', () => {
    if (!filteredLinks.length) return;
    const lines = ['# PageFinder 导出结果', '', `来源: ${urlInput.value}`, `时间: ${new Date().toLocaleString('zh-CN')}`, `共 ${filteredLinks.length} 条链接`, '', '---', ''];
    for (const l of filteredLinks) {
        lines.push(`## ${l.title}`);
        lines.push(`- 链接: ${l.url}`);
        lines.push(`- 类型: ${l.category}`);
        lines.push('');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pagefinder_${Date.now()}.md`;
    a.click();
    showToast('📥 已导出 Markdown 文件', 'success');
});

// ── Core: Crawl ──────────────────────────────────
async function doCrawl(preview = false) {
    let url = urlInput.value.trim();
    if (!url) { showToast('请输入网页地址', 'error'); urlInput.focus(); return; }
    if (!url.startsWith('http')) url = 'https://' + url;

    // Validate
    try { new URL(url); } catch { showToast('网址格式不正确', 'error'); return; }

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
        showError(err.message || '爬取失败，请检查网址或网络连接');
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
    tabAll.innerHTML = `🗂 全部 <span class="cat-count">${links.length}</span>`;
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
        <button class="action-btn" title="复制链接" data-url="${esc(link.url)}">
          <svg viewBox="0 0 20 20" fill="none"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" fill="currentColor"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" fill="currentColor"/></svg>
        </button>
        <button class="action-btn" title="复制 标题 + 链接" data-title="${esc(link.title)}" data-url="${esc(link.url)}" data-both="1">
          <svg viewBox="0 0 20 20" fill="none"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" fill="currentColor" clip-rule="evenodd"/></svg>
        </button>
        <a class="action-btn" href="${esc(link.url)}" target="_blank" rel="noopener" title="在新标签中打开">
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
                showToast('✅ 已复制标题+链接', 'success');
            } else {
                copyText(btn.dataset.url);
                showToast('✅ 已复制链接', 'success');
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
    loadingTitle.textContent = preview ? '正在快速预览首页…' : `正在深度爬取 (深度 ${currentDepth})…`;
    loadingSub.textContent = preview ? '仅提取首层链接，速度更快' : '正在递归分析所有链接，请耐心等待';
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
            filterNote.textContent = `（共爬取 ${rawTotal} 条，已按类型过滤）`;
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

// ── Init: paste URL from clipboard if available ───
window.addEventListener('DOMContentLoaded', () => {
    urlInput.focus();
    updateToggleState(); // set initial hint based on depth=1 default
    // Check if there's a URL-like thing in clipboard (user might have just copied one)
    if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(text => {
            if (text && text.startsWith('http') && !text.includes('\n') && text.length < 300) {
                urlInput.value = text.trim();
                clearBtn.style.display = 'flex';
            }
        }).catch(() => { });
    }
});
