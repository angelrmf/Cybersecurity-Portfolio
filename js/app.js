/* ============================================
   js/app.js — routing and rendering
   ─────────────────────────────────────────
   Pages (hash routes, so GitHub Pages needs no config):
     #/              home
     #/ctf           write-up list     (data/writeups.js, section "ctf")
     #/sherlocks     write-up list     (section "sherlocks")
     #/malware       write-up list     (section "malware")
     #/techniques    technique notes   (data/techniques.js)
     #/read/<path>   one write-up, rendered from its markdown file
   ============================================ */

(function () {
  'use strict';

  const REPO = 'https://github.com/angelrmf/Cybersecurity-Portfolio';

  const SECTIONS = {
    ctf:       { name: 'CTF',              color: 'm', blurb: 'Boxes and wargames, from the first scan to root.' },
    sherlocks: { name: 'Sherlocks',        color: 'c', blurb: 'Blue-team work: alert triage, threat hunting and reporting.' },
    malware:   { name: 'Malware analysis', color: 'y', blurb: 'Taking samples apart, statically and in a sandbox.' }
  };

  const view = document.getElementById('view');
  let heroHandle = null;

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const inSection = id => WRITEUPS.filter(w => w.section === id);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const readHref = w => '#/read/' + w.path.split('/').map(encodeURIComponent).join('/');

  const touch = window.matchMedia('(hover: none), (pointer: coarse)');
  const heroHintText = () => !FX.enabled ? ''
    : touch.matches ? 'Everything here reacts. Tap the name, then tap around.'
    : 'Everything here reacts. Move over the name, then click around.';

  /* ---------- home ---------- */
  function renderHome() {
    const blocks = Object.keys(SECTIONS).map(id => {
      const s = SECTIONS[id], items = inSection(id);
      const latest = items.slice(0, 3).map(w => `<li>${esc(w.title)}</li>`).join('');
      return `
        <a class="block ${s.color}" href="#/${id}" data-p="section: ${esc(s.name)}">
          <span class="block-name" data-scramble>${esc(s.name)}</span>
          <span class="block-blurb">${esc(s.blurb)}</span>
          ${latest ? `<ul class="block-latest">${latest}</ul>` : `<span class="block-latest">Nothing published yet.</span>`}
          <span class="block-count">${plural(items.length, 'write-up', 'write-ups')}</span>
        </a>`;
    }).join('');

    const techCount = TECHNIQUES.reduce((n, c) => n + c.entries.length, 0);

    view.innerHTML = `
      <section class="hero">
        <h1 class="sr-only">angelrmf, cybersecurity portfolio</h1>
        <canvas class="hero-name" id="heroName" aria-hidden="true"></canvas>
        <p class="hero-line">Write-ups from CTF boxes, blue-team investigations and malware analysis, with the commands and the reasoning left in.</p>
        <p class="hero-hint" id="heroHint"></p>
      </section>
      <div class="blocks">${blocks}</div>
      <a class="strip" href="#/techniques" data-p="section: Techniques">
        <span class="strip-name" data-scramble>Technique notes</span>
        <span>${plural(techCount, 'entry', 'entries')} across ${plural(TECHNIQUES.length, 'category', 'categories')}: commands I keep reaching for</span>
      </a>`;

    document.getElementById('heroHint').textContent =
      heroHintText();
    heroHandle = FX.hero(document.getElementById('heroName'), 'angelrmf');
  }

  /* ---------- write-up lists ---------- */
  function rowHTML(w) {
    const wip = w.status && w.status !== 'complete';
    return `
      <li><a class="row" href="${readHref(w)}" data-p="write-up: ${esc(w.title)}">
        <span class="row-platform">${esc(w.platform)}</span>
        <span>
          <span class="row-title" data-scramble>${esc(w.title)}</span>
          <span class="row-summary" style="display:block">${esc(w.summary)}</span>
          <span class="row-tags">${(w.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</span>
        </span>
        <span class="row-side">${esc(w.level || '')}${wip ? `<span class="status-wip">${esc(w.status)}</span>` : ''}</span>
      </a></li>`;
  }

  function renderList(id) {
    const s = SECTIONS[id], all = inSection(id);

    if (!all.length) {
      view.innerHTML = `
        <h1 class="page-title">${esc(s.name)}</h1>
        <p class="page-lede">${esc(s.blurb)}</p>
        <div class="empty"><strong>Nothing published here yet.</strong>
        The first write-up for this section is still being written. The <a href="#/ctf">CTF</a> and <a href="#/sherlocks">Sherlocks</a> sections have finished work in the meantime.</div>`;
      return;
    }

    const platforms = [...new Set(all.map(w => w.platform))];
    let platform = null, query = '';

    view.innerHTML = `
      <h1 class="page-title">${esc(s.name)}</h1>
      <p class="page-lede">${esc(s.blurb)}</p>
      <div class="tools">
        <input class="search" id="q" type="search" placeholder="Search titles, tools and tags" aria-label="Search ${esc(s.name)} write-ups" />
        ${platforms.length > 1 ? platforms.map(p =>
          `<button class="chip" type="button" aria-pressed="false" data-platform="${esc(p)}" data-p="filter: ${esc(p)}">${esc(p)}</button>`).join('') : ''}
      </div>
      <ul class="rows ${s.color}" id="rows"></ul>`;

    const rows = document.getElementById('rows');

    function paint() {
      const q = query.trim().toLowerCase();
      const hits = all.filter(w =>
        (!platform || w.platform === platform) &&
        (!q || [w.title, w.platform, w.level, w.summary, ...(w.tags || [])].join(' ').toLowerCase().includes(q)));
      rows.innerHTML = hits.length
        ? hits.map(rowHTML).join('')
        : `<li class="empty" style="border:0">No write-ups match that. Clear the search or pick another platform.</li>`;
    }

    document.getElementById('q').addEventListener('input', e => { query = e.target.value; paint(); });
    view.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
      platform = platform === chip.dataset.platform ? null : chip.dataset.platform;
      view.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.platform === platform)));
      paint();
    }));
    paint();
  }

  /* ---------- technique notes ---------- */
  function techHTML(e) {
    const sev = e.severity && e.severity !== 'info'
      ? `<span class="sev sev-${esc(e.severity)}">${esc(e.severity)}</span>` : '';
    return `
      <details class="tech">
        <summary data-p="technique: ${esc(e.name)}">
          <span class="tech-name" data-scramble>${esc(e.name)}</span>
          <span class="tech-alias">${esc(e.alias)}</span>
          ${sev}
        </summary>
        <div class="tech-body">
          <p>${esc(e.summary)}</p>
          ${e.notes ? `<pre><code>${esc(e.notes)}</code></pre>` : ''}
          <div class="row-tags">${(e.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
          ${e.link ? `<p style="margin-top:.8rem"><a href="${esc(e.link)}" target="_blank" rel="noopener">Open the reference</a></p>` : ''}
        </div>
      </details>`;
  }

  function renderTechniques() {
    view.innerHTML = `
      <h1 class="page-title">Technique notes</h1>
      <p class="page-lede">Short notes and the commands that go with them. Open an entry to read it.</p>
      <div class="tools">
        <input class="search" id="q" type="search" placeholder="Search techniques, tools and tags" aria-label="Search technique notes" />
      </div>
      <div id="cats"></div>`;

    const cats = document.getElementById('cats');
    function paint(q) {
      q = q.trim().toLowerCase();
      const html = TECHNIQUES.map(cat => {
        const hits = cat.entries.filter(e => !q ||
          [e.name, e.alias, e.summary, e.severity, e.group, ...(e.tags || [])].join(' ').toLowerCase().includes(q));
        return hits.length ? `<section class="tech-cat"><h2>${esc(cat.name)}</h2>${hits.map(techHTML).join('')}</section>` : '';
      }).join('');
      cats.innerHTML = html || `<div class="empty">No technique notes match that. Try a tool name such as nmap.</div>`;
    }
    document.getElementById('q').addEventListener('input', e => paint(e.target.value));
    paint('');
  }

  /* ---------- reader ---------- */
  const slug = t => t.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');

  async function renderRead(path) {
    const w = WRITEUPS.find(x => x.path === path);          // only files listed in the manifest are ever fetched
    if (!w) {
      view.innerHTML = `
        <h1 class="page-title">Write-up not found</h1>
        <div class="empty">There is no write-up at this address. It may have been renamed. <a href="#/">Go to the home page</a> to browse everything.</div>`;
      return;
    }
    const s = SECTIONS[w.section];
    const wip = w.status && w.status !== 'complete';

    view.innerHTML = `
      <a class="back" href="#/${w.section}" data-p="back to ${esc(s.name)}">Back to ${esc(s.name)}</a>
      <header class="read-head">
        <h1 class="page-title">${esc(w.title)}</h1>
        <div class="read-meta">
          <span>${esc(w.platform)}</span>
          ${w.level ? `<span>${esc(w.level)}</span>` : ''}
          ${wip ? `<span class="m">${esc(w.status)}</span>` : ''}
          <a href="${REPO}/blob/main/${w.path.split('/').map(encodeURIComponent).join('/')}" target="_blank" rel="noopener" data-p="link: this file on GitHub">View on GitHub</a>
        </div>
      </header>
      <article class="prose" id="prose"><p>Loading the write-up…</p></article>`;

    const prose = document.getElementById('prose');
    try {
      const res = await fetch(w.path.split('/').map(encodeURIComponent).join('/'));
      if (!res.ok) throw new Error(res.status);
      const md = await res.text();
      if (!prose.isConnected) return;                        // visitor already moved on
      prose.innerHTML = marked.parse(md);
    } catch (err) {
      prose.innerHTML = `<div class="empty"><strong>This write-up didn't load.</strong>
        Read it <a href="${REPO}/blob/main/${esc(w.path)}" target="_blank" rel="noopener">on GitHub</a> instead, or reload the page to try again.</div>`;
      return;
    }

    // The page already shows the title, so drop a lone leading H1 from the markdown.
    const h1s = prose.querySelectorAll('h1');
    if (h1s.length === 1 && prose.firstElementChild === h1s[0]) h1s[0].remove();

    const used = {};
    prose.querySelectorAll('h1, h2, h3, h4').forEach(h => {  // GitHub-style ids so in-page links keep working
      let id = slug(h.textContent);
      if (used[id] != null) id += '-' + (++used[id]); else used[id] = 0;
      h.id = id;
    });
    prose.querySelectorAll('table').forEach(t => {
      const wrap = document.createElement('div');
      wrap.className = 'table-scroll';
      t.replaceWith(wrap); wrap.appendChild(t);
    });
    prose.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (/^https?:/i.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
    });
    prose.querySelectorAll('img').forEach(img => { img.loading = 'lazy'; if (!img.alt || img.alt === 'image') img.alt = 'Screenshot from the write-up'; });
  }

  // In-page links inside a write-up ("#level-0") must not be treated as routes.
  view.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.startsWith('#/')) return;
    e.preventDefault();
    const target = document.getElementById(decodeURIComponent(href.slice(1)));
    if (target) target.scrollIntoView();
  });

  /* ---------- router ---------- */
  function route() {
    const hash = location.hash;
    if (hash && !hash.startsWith('#/')) return null;        // an in-page anchor, not a route
    const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || 'home', rest: parts.slice(1).join('/') };
  }

  function render() {
    const r = route();
    if (!r) return;
    if (heroHandle) { heroHandle.destroy(); heroHandle = null; }

    let current = r.name;
    if (r.name === 'home') renderHome();
    else if (SECTIONS[r.name]) renderList(r.name);
    else if (r.name === 'techniques') renderTechniques();
    else if (r.name === 'read') {
      const w = WRITEUPS.find(x => x.path === r.rest);
      current = w ? w.section : '';
      renderRead(r.rest);
    } else {
      current = '';
      view.innerHTML = `
        <h1 class="page-title">Page not found</h1>
        <div class="empty">Nothing lives at this address. <a href="#/">Go to the home page</a>.</div>`;
    }

    document.querySelectorAll('.nav a').forEach(a => {
      if (a.dataset.nav === current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  }

  let first = true;
  function go() {
    if (!route()) return;
    if (first) { first = false; render(); return; }
    FX.wipe(() => { render(); view.focus({ preventScroll: true }); });
  }

  /* ---------- theme + effects switches ---------- */
  const THEME_KEY = 'redteam-codex-theme';                   // same key as before, so saved choices survive
  const themeBtn = document.getElementById('themeToggle');
  const fxBtn = document.getElementById('fxToggle');

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    themeBtn.textContent = t === 'dark' ? 'Light' : 'Dark';
    themeBtn.setAttribute('aria-label', `Switch to ${t === 'dark' ? 'light' : 'dark'} theme`);
    try { localStorage.setItem(THEME_KEY, t); } catch (_) {}
    if (heroHandle) heroHandle.rebuild();
  }
  let savedTheme = 'dark';
  try { savedTheme = localStorage.getItem(THEME_KEY) || 'dark'; } catch (_) {}
  applyTheme(savedTheme === 'light' ? 'light' : 'dark');
  themeBtn.addEventListener('click', () =>
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

  function paintFxBtn() {
    fxBtn.textContent = FX.enabled ? 'Effects on' : 'Effects off';
    fxBtn.setAttribute('aria-pressed', String(FX.enabled));
    if (FX.blockedByOS) {
      fxBtn.disabled = true;
      fxBtn.title = 'Effects are off because your system asks for reduced motion.';
    }
    const hint = document.getElementById('heroHint');
    if (hint) hint.textContent = heroHintText();
  }
  fxBtn.addEventListener('click', () => { FX.setEnabled(!FX.enabled); paintFxBtn(); });
  paintFxBtn();

  window.addEventListener('hashchange', go);
  go();
})();
