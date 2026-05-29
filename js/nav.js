/* ============================================
   js/nav.js — Navigation & Dropdown Logic
   ============================================ */

(function () {
  const dropdownBtn = document.getElementById('categoryDropdownBtn');
  const dropdownMenu = document.getElementById('categoryDropdown');
  const navBtns = document.querySelectorAll('.nav-btn[data-section]');

  // Build dropdown from TECHNIQUES data
  function buildDropdown() {
    dropdownMenu.innerHTML = '';
    TECHNIQUES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'dropdown-item';
      btn.textContent = cat.name;
      btn.addEventListener('click', () => {
        scrollToCategory(cat.id);
        dropdownMenu.classList.remove('open');
      });
      dropdownMenu.appendChild(btn);
    });
  }

  function scrollToCategory(id) {
    const el = document.getElementById('cat-' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Toggle dropdown
  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    dropdownMenu.classList.remove('open');
  });

  dropdownMenu.addEventListener('click', (e) => e.stopPropagation());

  // Nav section buttons (for future multi-section expansion)
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Init
  buildDropdown();
})();
