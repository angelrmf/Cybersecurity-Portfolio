/* ============================================
   js/app.js — routing and rendering
   ─────────────────────────────────────────
   Pages (hash routes, so GitHub Pages needs no config):
     #/                     home
     #/ctf                  write-up list     (data/writeups.js, section "ctf")
     #/sherlocks            write-up list     (section "sherlocks")
     #/malware              write-up list     (section "malware")
     #/tools                tool inventory    (section "tools", files in tools/)
     #/techniques           ATT&CK by phase   (data/attack.json, built from MITRE's data)
     #/techniques/TA0006    one phase
     #/techniques/T1110.001 one technique, with the write-ups, tools and notes mapped to it
     #/read/<path>          one write-up or tool, rendered from its markdown file
     #/whoami               about me     (data/whoami.js, portrait in data/whoami.txt)
   ============================================ */

(function () {
  'use strict';

  const REPO = 'https://github.com/angelrmf/Cybersecurity-Portfolio';

  const SECTIONS = {
    ctf:       { name: 'CTF',              color: 'm', item: ['write-up', 'write-ups'], blurb: 'Boxes and wargames, from the first scan to root.' },
    sherlocks: { name: 'Sherlocks',        color: 'c', item: ['write-up', 'write-ups'], blurb: 'Blue-team work: alert triage, threat hunting and reporting.' },
    malware:   { name: 'Malware analysis', color: 'y', item: ['write-up', 'write-ups'], blurb: 'Taking samples apart, statically and in a sandbox.' },
    tools:     { name: 'Tools',            color: 'w', item: ['tool', 'tools'],         blurb: 'What I use, how to install it, and which ATT&CK techniques it serves.' }
  };

  const view = document.getElementById('view');
  let heroHandle = null;
  let renderToken = 0;                                       // lets slow pages notice the visitor moved on

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const inSection = id => WRITEUPS.filter(w => w.section === id);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const filePath = p => p.split('/').map(encodeURIComponent).join('/');
  const readHref = w => '#/read/' + filePath(w.path);
  const isWeb = u => /^https?:\/\/[^\s"'<>]+$/i.test(u || '');

  const touch = window.matchMedia('(hover: none), (pointer: coarse)');
  const heroHintText = () => !FX.enabled ? ''
    : touch.matches ? 'Everything here reacts. Tap the name, then tap around.'
    : 'Everything here reacts. Move over the name, then click around.';

  /* ---------- ATT&CK data and coverage ---------- */
  let attackPromise = null, attackData = null;
  function loadAttack() {
    if (!attackPromise) {
      attackPromise = fetch('data/attack.json')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(d => (attackData = d))
        .catch(err => { attackPromise = null; throw err; });
    }
    return attackPromise;
  }

  // Which write-ups, tools and notes point at each technique ID.
  const WORK = {}, NOTES = {};
  WRITEUPS.forEach(w => (w.attack || []).forEach(id => (WORK[id] = WORK[id] || []).push(w)));
  TECHNIQUES.forEach(c => c.entries.forEach(e => (e.attack || []).forEach(id => (NOTES[id] = NOTES[id] || []).push(e))));
  const withSubs = (map, id) => Object.keys(map).filter(k => k === id || k.startsWith(id + '.'))
    .reduce((all, k) => all.concat(map[k]), []).filter((v, i, a) => a.indexOf(v) === i);
  const coveredIds = () => [...new Set(Object.keys(WORK))];

  function tName(id) {
    const t = attackData && attackData.techniques[id];
    if (!t) return id;
    const p = t.parent && attackData.techniques[t.parent];
    return p ? `${p.name}: ${t.name}` : t.name;
  }
  const tState = id => withSubs(WORK, id).length ? 'on' : withSubs(NOTES, id).length ? 'note' : '';

  const attackFailHTML = `<div class="empty"><strong>The ATT&CK data didn't load.</strong>
    Reload the page to try again. If it keeps failing, data/attack.json may be missing from the site.</div>`;

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
          <span class="block-count">${plural(items.length, s.item[0], s.item[1])}</span>
        </a>`;
    }).join('');

    const covered = coveredIds().length;

    view.innerHTML = `
      <section class="hero">
        <h1 class="sr-only">angelrmf, cybersecurity portfolio</h1>
        <canvas class="hero-name" id="heroName" aria-hidden="true"></canvas>
        <p class="hero-line">Write-ups from CTF boxes, blue-team investigations and malware analysis, with the commands and the reasoning left in.</p>
        <p class="hero-hint" id="heroHint"></p>
      </section>
      <div class="blocks">${blocks}</div>
      <a class="strip" href="#/techniques" data-p="section: Techniques">
        <span class="strip-name" data-scramble>Techniques</span>
        <span>MITRE ATT&amp;CK by phase, with the ${plural(covered, 'technique', 'techniques')} my write-ups and tools cover lit up</span>
      </a>`;

    document.getElementById('heroHint').textContent = heroHintText();
    heroHandle = FX.hero(document.getElementById('heroName'), 'angelrmf');
  }

  /* ---------- write-up and tool lists ---------- */
  const atkChips = (ids, link) => (ids || []).map(id => link
    ? `<a class="atk" href="#/techniques/${esc(id)}" data-p="technique: ${esc(tName(id))}" title="${esc(tName(id))}">${esc(id)}</a>`
    : `<span class="atk" title="${esc(tName(id))}">${esc(id)}</span>`).join('');

  function rowHTML(w) {
    const wip = w.status && w.status !== 'complete';
    const tool = w.section === 'tools';
    return `
      <li><a class="row" href="${readHref(w)}" data-p="${tool ? 'tool' : 'write-up'}: ${esc(w.title)}">
        <span class="row-platform">${esc(tool ? w.creator : w.platform)}</span>
        <span>
          <span class="row-title" data-scramble>${esc(w.title)}</span>
          <span class="row-summary" style="display:block">${esc(w.summary)}</span>
          <span class="row-tags">${atkChips(w.attack)}${(w.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</span>
        </span>
        <span class="row-side">${esc(w.level || '')}${tool && w.category ? `<span class="row-cat">${esc(w.category)}</span>` : ''}${wip ? `<span class="status-wip">${esc(w.status)}</span>` : ''}</span>
      </a></li>`;
  }

  function renderList(id) {
    const s = SECTIONS[id], all = inSection(id);

    if (!all.length) {
      view.innerHTML = `
        <h1 class="page-title">${esc(s.name)}</h1>
        <p class="page-lede">${esc(s.blurb)}</p>
        <div class="empty"><strong>Nothing published here yet.</strong>
        The first entry for this section is still being written. The <a href="#/ctf">CTF</a> and <a href="#/sherlocks">Sherlocks</a> sections have finished work in the meantime.</div>`;
      return;
    }

    const facet = id === 'tools' ? 'category' : 'platform';
    const values = [...new Set(all.map(w => w[facet]).filter(Boolean))];
    let picked = null, query = '';

    view.innerHTML = `
      <h1 class="page-title">${esc(s.name)}</h1>
      <p class="page-lede">${esc(s.blurb)}</p>
      <div class="tools">
        <input class="search" id="q" type="search" placeholder="Search titles, tools, tags and ATT&CK IDs" aria-label="Search ${esc(s.name)}" />
        ${values.length > 1 ? values.map(p =>
          `<button class="chip" type="button" aria-pressed="false" data-value="${esc(p)}" data-p="filter: ${esc(p)}">${esc(p)}</button>`).join('') : ''}
      </div>
      <ul class="rows ${s.color}" id="rows"></ul>`;

    const rows = document.getElementById('rows');

    function paint() {
      const q = query.trim().toLowerCase();
      const hits = all.filter(w =>
        (!picked || w[facet] === picked) &&
        (!q || [w.title, w.platform, w.creator, w.category, w.level, w.summary, ...(w.tags || []),
                ...(w.attack || []), ...(w.attack || []).map(tName)].join(' ').toLowerCase().includes(q)));
      rows.innerHTML = hits.length
        ? hits.map(rowHTML).join('')
        : `<li class="empty" style="border:0">Nothing matches that. Clear the search or pick another filter.</li>`;
    }

    document.getElementById('q').addEventListener('input', e => { query = e.target.value; paint(); });
    view.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
      picked = picked === chip.dataset.value ? null : chip.dataset.value;
      view.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.value === picked)));
      paint();
    }));
    paint();
    loadAttack().then(paint).catch(() => {});                 // adds technique names to the tooltips and search
  }

  /* ---------- technique notes (data/techniques.js) ---------- */
  function noteHTML(e) {
    const sev = e.severity && e.severity !== 'info'
      ? `<span class="sev sev-${esc(e.severity)}">${esc(e.severity)}</span>` : '';
    return `
      <details class="tech">
        <summary data-p="note: ${esc(e.name)}">
          <span class="tech-name" data-scramble>${esc(e.name)}</span>
          <span class="tech-alias">${esc(e.alias)}</span>
          ${sev}
        </summary>
        <div class="tech-body">
          <p>${esc(e.summary)}</p>
          ${e.notes ? `<pre><code>${esc(e.notes)}</code></pre>` : ''}
          <div class="row-tags">${(e.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
          ${isWeb(e.link) ? `<p style="margin-top:.8rem"><a href="${esc(e.link)}" target="_blank" rel="noopener">Open the reference</a></p>` : ''}
        </div>
      </details>`;
  }

  /* ---------- techniques: shared pieces ---------- */
  function phaseBar(current) {
    return `<nav class="phase-bar" aria-label="ATT&CK phases">
      <a class="chip" href="#/techniques" ${!current ? 'aria-current="page"' : ''} data-p="all phases">All phases</a>
      ${attackData.tactics.map(t => `<a class="chip" href="#/techniques/${t.id}" ${current === t.id ? 'aria-current="page"' : ''} data-p="phase: ${esc(t.name)}">${esc(t.name)}</a>`).join('')}
    </nav>`;
  }

  const parentsIn = short => Object.keys(attackData.techniques)
    .filter(id => !attackData.techniques[id].parent && attackData.techniques[id].tactics.includes(short))
    .sort((a, b) => attackData.techniques[a].name.localeCompare(attackData.techniques[b].name));
  const subsOf = id => Object.keys(attackData.techniques).filter(k => attackData.techniques[k].parent === id);

  function tRow(id, sub) {
    const st = tState(id), n = withSubs(WORK, id).length;
    return `<a class="trow ${st} ${sub ? 'sub' : ''}" href="#/techniques/${esc(id)}" data-p="technique: ${esc(tName(id))}">
      <span class="t-id">${esc(id)}</span>
      <span class="t-name" ${sub ? '' : 'data-scramble'}>${esc(sub ? attackData.techniques[id].name : tName(id))}</span>
      <span class="t-count">${n ? plural(n, 'entry', 'entries') : st === 'note' ? 'notes' : ''}</span>
    </a>`;
  }

  /* ---------- techniques: overview ---------- */
  function renderMatrix() {
    const covered = coveredIds().filter(id => attackData.techniques[id]);
    let i = 0;
    const cols = attackData.tactics.map(t => {
      const ids = parentsIn(t.short);
      const lit = ids.filter(id => tState(id) === 'on').length;
      const cells = ids.map(id => {
        const st = tState(id);
        return `<a class="mx-cell ${st}" href="#/techniques/${esc(id)}" style="--i:${st ? i++ : 0}"
          data-p="${esc(id)} ${esc(tName(id))}" aria-label="${esc(id)} ${esc(tName(id))}${st === 'on' ? ', covered' : st === 'note' ? ', notes' : ''}"></a>`;
      }).join('');
      return `<div class="mx-col">
        <h2><a href="#/techniques/${t.id}" data-p="phase: ${esc(t.name)}">${esc(t.name)}</a></h2>
        <span class="mx-count">${lit} of ${ids.length}</span>
        <div class="mx-cells">${cells}</div>
      </div>`;
    }).join('');

    const top = covered.slice().sort((a, b) => withSubs(WORK, b).length - withSubs(WORK, a).length || a.localeCompare(b));

    view.innerHTML = `
      <h1 class="page-title">Techniques</h1>
      <p class="page-lede">MITRE ATT&amp;CK Enterprise ${esc(attackData.version)}, by phase. Each square is a technique; the lit ones are covered by my write-ups and tools. Hover a square to name it, click it to see where I used it.</p>
      ${phaseBar('')}
      <div class="legend" aria-hidden="true">
        <span><i class="mx-cell on"></i>In a write-up or tool</span>
        <span><i class="mx-cell note"></i>Notes only</span>
        <span><i class="mx-cell"></i>Not covered yet</span>
      </div>
      <div class="matrix">${cols}</div>
      <div class="tools">
        <input class="search" id="tq" type="search" placeholder="Find any technique by ID or name, for example T1046 or brute force" aria-label="Find an ATT&CK technique" />
      </div>
      <div class="tlist" id="tfind"></div>
      <section class="tech-cat">
        <h2>Covered in my work</h2>
        <div class="tlist">${top.map(id => tRow(id)).join('') || '<p class="empty">Nothing mapped yet.</p>'}</div>
      </section>
      <p class="t-source">Technique data from <a href="${esc(attackData.source)}" target="_blank" rel="noopener">MITRE ATT&amp;CK</a>, version ${esc(attackData.version)} (${esc(attackData.modified)}). ATT&amp;CK is a registered trademark of The MITRE Corporation.</p>`;

    const out = document.getElementById('tfind');
    document.getElementById('tq').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      if (q.length < 2) { out.innerHTML = ''; return; }
      const hits = Object.keys(attackData.techniques)
        .filter(id => id.toLowerCase().startsWith(q) || tName(id).toLowerCase().includes(q)).slice(0, 25);
      out.innerHTML = hits.length ? hits.map(id => tRow(id)).join('')
        : `<p class="empty">No technique matches that. Try a shorter word, or an ID such as T1059.</p>`;
    });
  }

  /* ---------- techniques: one phase ---------- */
  function renderPhase(id) {
    const t = attackData.tactics.find(x => x.id === id);
    const ids = parentsIn(t.short);
    let only = false;

    view.innerHTML = `
      <a class="back" href="#/techniques" data-p="back to all phases">All phases</a>
      <h1 class="page-title">${esc(t.name)}</h1>
      <p class="page-lede">${esc(t.desc)}</p>
      ${phaseBar(id)}
      <div class="tools">
        <button class="chip" id="only" type="button" aria-pressed="false" data-p="filter: covered only">Only what I've covered</button>
      </div>
      <div class="tlist" id="plist"></div>`;

    const list = document.getElementById('plist');
    function paint() {
      const html = ids.map(pid => {
        const subs = subsOf(pid);
        if (only && !tState(pid)) return '';
        return tRow(pid) + subs.filter(s => !only || tState(s)).map(s => tRow(s, true)).join('');
      }).join('');
      list.innerHTML = html || `<p class="empty">Nothing in this phase is covered yet. Turn the filter off to see every technique in it.</p>`;
    }
    document.getElementById('only').addEventListener('click', e => {
      only = !only; e.currentTarget.setAttribute('aria-pressed', String(only)); paint();
    });
    paint();
  }

  /* ---------- techniques: one technique ---------- */
  function renderTechnique(id) {
    const t = attackData.techniques[id];
    const phases = attackData.tactics.filter(x => t.tactics.includes(x.short));
    const parent = t.parent && attackData.techniques[t.parent];
    const subs = subsOf(id);
    const work = withSubs(WORK, id), notes = withSubs(NOTES, id);
    const url = `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`;

    view.innerHTML = `
      <a class="back" href="#/techniques/${phases[0] ? phases[0].id : ''}" data-p="back to ${esc(phases[0] ? phases[0].name : 'phases')}">${esc(phases[0] ? phases[0].name : 'All phases')}</a>
      <header class="read-head">
        <h1 class="page-title">${esc(t.name)}</h1>
        <div class="read-meta">
          <span class="t-id">${esc(id)}</span>
          ${parent ? `<a href="#/techniques/${esc(t.parent)}" data-p="technique: ${esc(parent.name)}">Part of ${esc(parent.name)}</a>` : ''}
          ${phases.map(p => `<a href="#/techniques/${p.id}" data-p="phase: ${esc(p.name)}">${esc(p.name)}</a>`).join('')}
        </div>
        <div class="t-actions">
          <button class="ctl" id="copyId" type="button" data-p="copy ${esc(id)} for a form">Copy ${esc(id)}</button>
          <a class="ctl" href="${url}" target="_blank" rel="noopener" data-p="link: attack.mitre.org">Open on attack.mitre.org</a>
        </div>
      </header>
      <p class="t-desc">${esc(t.desc)}</p>
      ${t.platforms && t.platforms.length ? `<p class="t-plat">Platforms: ${esc(t.platforms.join(', '))}</p>` : ''}
      <section class="tech-cat">
        <h2>Used in my work</h2>
        ${work.length ? `<ul class="rows">${work.map(rowHTML).join('')}</ul>`
          : `<p class="empty">No write-up or tool is mapped to this technique yet. To map one, add ${esc(id)} to the ATT&amp;CK field of its form.</p>`}
      </section>
      ${notes.length ? `<section class="tech-cat"><h2>My notes</h2>${notes.map(noteHTML).join('')}</section>` : ''}
      ${subs.length ? `<section class="tech-cat"><h2>Sub-techniques</h2><div class="tlist">${subs.map(s => tRow(s, true)).join('')}</div></section>` : ''}
      <p class="t-source">Description from <a href="${url}" target="_blank" rel="noopener">MITRE ATT&amp;CK</a> ${esc(attackData.version)}.</p>`;

    const btn = document.getElementById('copyId');
    btn.addEventListener('click', () => {
      const done = ok => { btn.textContent = ok ? 'Copied' : `Copy failed, select ${id}`; setTimeout(() => { btn.textContent = `Copy ${id}`; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(id).then(() => done(true), () => done(false));
      else done(false);
    });
  }

  function renderTechniques(rest, token) {
    view.innerHTML = `<h1 class="page-title">Techniques</h1><p class="page-lede">Loading the ATT&amp;CK data…</p>`;
    loadAttack().then(() => {
      if (token !== renderToken) return;                     // visitor already moved on
      if (!rest) renderMatrix();
      else if (attackData.tactics.some(t => t.id === rest)) renderPhase(rest);
      else if (attackData.techniques[rest]) renderTechnique(rest);
      else if (attackData.revoked[rest]) location.replace(`#/techniques/${attackData.revoked[rest]}`);
      else view.innerHTML = `<h1 class="page-title">Technique not found</h1>
        <div class="empty">${esc(rest)} is not in ATT&amp;CK ${esc(attackData.version)}. <a href="#/techniques">Browse all phases</a>.</div>`;
    }, () => { if (token === renderToken) view.innerHTML = `<h1 class="page-title">Techniques</h1>${attackFailHTML}`; });
  }

  /* ---------- whoami ---------- */
  const placeholder = v => !v || /^\[.*\]$/.test(String(v).trim());

  function renderWhoami(token) {
    const W = typeof WHOAMI === 'object' ? WHOAMI : { handle: 'angelrmf', about: [] };
    const val = (v, fill) => placeholder(v)
      ? `<span class="who-todo">${esc(v || fill)}</span>` : esc(v);
    const link = (url, text, fill, label) => {
      if (!url) return `<span class="who-todo">${esc(fill)}</span>`;
      return `<a href="${esc(url)}" ${url.startsWith('mailto:') ? '' : 'target="_blank" rel="noopener"'} data-p="link: ${esc(label)}">${esc(text)}</a>`;
    };
    const email = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(W.email || '') ? W.email : '';
    const withScheme = u => (u && !/^[a-z]+:/i.test(u.trim()) ? 'https://' + u.trim() : (u || '').trim());
    const linkedin = isWeb(withScheme(W.linkedin)) ? withScheme(W.linkedin) : '';
    const github = isWeb(W.github) ? W.github : '';
    const row = (k, v) => `<div class="who-row"><dt>${esc(k)}</dt><dd>${v}</dd></div>`;
    // Every other field in data/whoami.js becomes a row, labelled with its name: add, remove or rename freely.
    const SKIP = ['handle', 'email', 'linkedin', 'github', 'about'];
    const label = k => k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ');
    const infoRows = Object.keys(W).filter(k => !SKIP.includes(k) && typeof W[k] === 'string' && W[k].trim())
      .map(k => row(label(k), val(W[k], ''))).join('');

    view.innerHTML = `
      <h1 class="sr-only">whoami: ${esc(W.handle)}</h1>
      <p class="who-prompt" aria-hidden="true"><span class="who-ps">$</span> whoami<span class="who-caret"></span></p>
      <div class="who">
        <pre class="who-art" id="whoArt" aria-label="ASCII portrait of ${esc(W.handle)}"></pre>
        <div class="who-card">
          <p class="who-handle">${esc(W.handle)}<span>@portfolio</span></p>
          <dl>
            ${infoRows}
          </dl>
          <p class="who-sub">Contact</p>
          <dl>
            ${row('Email', link(email && 'mailto:' + email, email, '[your email]', 'email'))}
            ${row('LinkedIn', link(linkedin, linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), '[your LinkedIn]', 'LinkedIn'))}
            ${row('GitHub', link(github, github.replace(/^https?:\/\//, ''), '[your GitHub]', 'GitHub'))}
          </dl>
          <p class="who-sub">Here</p>
          <dl>
            ${Object.keys(SECTIONS).map(id => row(SECTIONS[id].name,
              `<a href="#/${id}" data-p="section: ${esc(SECTIONS[id].name)}">${plural(inSection(id).length, SECTIONS[id].item[0], SECTIONS[id].item[1])}</a>`)).join('')}
            ${row('ATT&CK', `<a href="#/techniques" data-p="section: Techniques">${plural(coveredIds().length, 'technique', 'techniques')} covered</a>`)}
          </dl>
        </div>
      </div>
      <section class="who-about">
        <h2>About</h2>
        ${(W.about && W.about.length ? W.about : ['[A few paragraphs about you.]'])
          .map(p => `<p>${val(p, '[A paragraph about you.]')}</p>`).join('')}
      </section>`;

    fetch('data/whoami.txt').then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }).then(art => {
      const el = document.getElementById('whoArt');
      if (token !== renderToken || !el) return;
      el.textContent = art.replace(/\s+$/, '');
      el.classList.add('scan');                              // one scan-line reveal, skipped when effects are off
    }).catch(() => {
      const el = document.getElementById('whoArt');
      if (el) el.textContent = '[ portrait did not load ]';
    });
  }

  /* ---------- reader ---------- */
  const slug = t => t.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');

  async function renderRead(path) {
    const w = WRITEUPS.find(x => x.path === path);          // only files listed in the manifest are ever fetched
    if (!w) {
      view.innerHTML = `
        <h1 class="page-title">Page not found</h1>
        <div class="empty">There is nothing at this address. It may have been renamed. <a href="#/">Go to the home page</a> to browse everything.</div>`;
      return;
    }
    const s = SECTIONS[w.section];
    const wip = w.status && w.status !== 'complete';
    const tool = w.section === 'tools';
    const meta = tool
      ? [w.creator, w.category, w.level, (w.platforms || []).join(', '), w.license && `License: ${w.license}`]
      : [w.platform, w.level];

    view.innerHTML = `
      <a class="back" href="#/${w.section}" data-p="back to ${esc(s.name)}">Back to ${esc(s.name)}</a>
      <header class="read-head">
        <h1 class="page-title">${esc(w.title)}</h1>
        <div class="read-meta">
          ${meta.filter(Boolean).map(m => `<span>${esc(m)}</span>`).join('')}
          ${wip ? `<span class="m">${esc(w.status)}</span>` : ''}
          ${tool && isWeb(w.repo) ? `<a href="${esc(w.repo)}" target="_blank" rel="noopener" data-p="link: ${esc(w.title)} homepage">Homepage</a>` : ''}
          ${w.software && /^S\d{4}$/.test(w.software) ? `<a href="https://attack.mitre.org/software/${w.software}/" target="_blank" rel="noopener" data-p="link: ATT&CK software ${w.software}">ATT&amp;CK ${w.software}</a>` : ''}
          <a href="${REPO}/blob/main/${filePath(w.path)}" target="_blank" rel="noopener" data-p="link: this file on GitHub">View on GitHub</a>
        </div>
        ${w.attack && w.attack.length ? `<div class="row-tags read-atk" id="readAtk">${atkChips(w.attack, true)}</div>` : ''}
      </header>
      <article class="prose" id="prose"><p>Loading…</p></article>`;

    if (w.attack && w.attack.length) {
      loadAttack().then(() => { const el = document.getElementById('readAtk'); if (el) el.innerHTML = atkChips(w.attack, true); }).catch(() => {});
    }

    const prose = document.getElementById('prose');
    try {
      const res = await fetch(filePath(w.path));
      if (!res.ok) throw new Error(res.status);
      const md = await res.text();
      if (!prose.isConnected) return;                        // visitor already moved on
      prose.innerHTML = marked.parse(md.replace(/^﻿?---\s*\n[\s\S]*?\n---\s*(?:\n|$)/, ''));   // hide front matter
    } catch (err) {
      prose.innerHTML = `<div class="empty"><strong>This page didn't load.</strong>
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
    const token = ++renderToken;
    if (heroHandle) { heroHandle.destroy(); heroHandle = null; }

    let current = r.name;
    if (r.name === 'home') renderHome();
    else if (SECTIONS[r.name]) renderList(r.name);
    else if (r.name === 'techniques') renderTechniques(r.rest.toUpperCase(), token);
    else if (r.name === 'whoami') renderWhoami(token);
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
