/* ============================================
   js/modal.js — Technique Detail Modal
   ============================================ */

(function () {
  const overlay = document.getElementById('modalOverlay');
  const body    = document.getElementById('modalBody');
  const closeBtn = document.getElementById('modalClose');

  function findEntry(id) {
    for (const cat of TECHNIQUES) {
      const found = cat.entries.find(e => e.id === id);
      if (found) return { entry: found, category: cat };
    }
    return null;
  }

  window.openModal = function (id) {
    const result = findEntry(id);
    if (!result) return;
    const { entry, category } = result;

    const imgHTML = entry.image
      ? `<div class="card-image-wrap" style="max-width:280px;margin-bottom:20px;"><img src="${entry.image}" alt="${entry.name}" /></div>`
      : '';

    const notesHTML = entry.notes
      ? `<div class="modal-section-label">KEY COMMANDS / NOTES</div>
         <div class="modal-notes"><pre style="font-family:inherit;white-space:pre-wrap;margin:0;">${escapeHTML(entry.notes)}</pre></div>`
      : '';

    const linkHTML = entry.link
      ? `<a class="modal-link" href="${entry.link}" target="_blank" rel="noopener">→ OPEN FULL DOCS / REFERENCE</a>`
      : '';

    body.innerHTML = `
      <div class="modal-category-label">// ${category.name}${entry.group ? ' · ' + entry.group : ''}</div>
      <h2 class="modal-title">${entry.name}</h2>
      <div class="modal-subtitle">${entry.alias || ''}</div>
      <div class="modal-tags">${buildTagsHTML(entry.tags, entry.severity)}</div>
      <hr class="modal-divider" />
      ${imgHTML}
      <div class="modal-section-label">OVERVIEW</div>
      <p class="modal-description">${entry.summary || 'No description provided.'}</p>
      ${notesHTML}
      ${linkHTML}
    `;

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
})();
