/* ============================================
   js/search.js — Live Search / Filter
   ============================================ */

(function () {
  const input = document.getElementById('searchInput');

  function normalize(str) {
    return str.toLowerCase().trim();
  }

  function matchesQuery(entry, query) {
    if (!query) return true;
    const haystack = [
      entry.name,
      entry.alias || '',
      ...(entry.tags || []),
      entry.summary || '',
      entry.severity || '',
      entry.group || ''
    ].map(normalize).join(' ');
    return haystack.includes(query);
  }

  function filterAndRender(query) {
    const q = normalize(query);

    const filtered = TECHNIQUES.map(cat => ({
      ...cat,
      entries: cat.entries.filter(e => matchesQuery(e, q))
    })).filter(cat => cat.entries.length > 0);

    if (filtered.length === 0) {
      document.getElementById('categorySections').innerHTML =
        `<div class="empty-state">[ NO RESULTS FOR "${query.toUpperCase()}" ]</div>`;
      return;
    }

    renderAll(filtered);
  }

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      filterAndRender(input.value);
    }, 180);
  });
})();
