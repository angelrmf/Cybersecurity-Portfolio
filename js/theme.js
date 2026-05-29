/* ============================================
   js/theme.js — Light / Dark Mode Toggle
   ============================================ */

(function () {
  const STORAGE_KEY = 'redteam-codex-theme';
  const html = document.documentElement;
  const btn = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    icon.textContent = theme === 'dark' ? '☀' : '☾';
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
  }

  // Load saved preference
  let saved = 'dark';
  try { saved = localStorage.getItem(STORAGE_KEY) || 'dark'; } catch (_) {}
  applyTheme(saved);

  btn.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
})();
