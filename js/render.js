/* ============================================
   js/render.js — DOM Rendering from Data
   ============================================ */

function severityClass(severity) {
  return severity ? `severity-${severity}` : '';
}

function buildTagsHTML(tags, severity) {
  let html = '';
  if (severity && severity !== 'info') {
    html += `<span class="tag ${severityClass(severity)}">${severity.toUpperCase()}</span>`;
  }
  tags.forEach(t => {
    html += `<span class="tag">${t}</span>`;
  });
  return html;
}

function buildCardHTML(entry) {
  const imgContent = entry.image
    ? `<img src="${entry.image}" alt="${entry.name}" loading="lazy" />`
    : `<span class="card-image-placeholder">[ NO IMAGE ]</span>`;

  return `
    <div class="technique-card" data-id="${entry.id}" role="button" tabindex="0" aria-label="View ${entry.name}">
      <div class="card-image-wrap">${imgContent}</div>
      <div class="card-name">${entry.name}</div>
      <div class="card-meta">${entry.alias || ''}</div>
      <div class="card-tags">${buildTagsHTML(entry.tags, entry.severity)}</div>
    </div>
  `;
}

function renderAll(data) {
  const container = document.getElementById('categorySections');
  if (!container) return;

  container.innerHTML = '';

  data.forEach(category => {
    const section = document.createElement('div');
    section.className = 'category-section';
    section.id = 'cat-' + category.id;

    // Group entries by sub-group if present
    const groups = {};
    const ungrouped = [];
    category.entries.forEach(entry => {
      if (entry.group) {
        if (!groups[entry.group]) groups[entry.group] = [];
        groups[entry.group].push(entry);
      } else {
        ungrouped.push(entry);
      }
    });

    const totalCount = category.entries.length;

    let innerHTML = `
      <div class="category-header">
        <span class="category-title">${category.name}</span>
        <span class="category-count">${totalCount} ENTR${totalCount === 1 ? 'Y' : 'IES'}</span>
      </div>
    `;

    // Render grouped
    Object.keys(groups).forEach(groupName => {
      innerHTML += `<div class="role-label">${groupName}</div>`;
      innerHTML += `<div class="cards-grid">`;
      groups[groupName].forEach(entry => {
        innerHTML += buildCardHTML(entry);
      });
      innerHTML += `</div>`;
    });

    // Render ungrouped
    if (ungrouped.length > 0) {
      innerHTML += `<div class="cards-grid">`;
      ungrouped.forEach(entry => {
        innerHTML += buildCardHTML(entry);
      });
      innerHTML += `</div>`;
    }

    section.innerHTML = innerHTML;
    container.appendChild(section);
  });

  // Attach card click events
  attachCardEvents();
}

function attachCardEvents() {
  document.querySelectorAll('.technique-card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') openModal(card.dataset.id);
    });
  });
}
