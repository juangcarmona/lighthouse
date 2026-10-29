const root = document.documentElement;
const body = document.body;
const themeButtons = [...document.querySelectorAll('[data-theme-choice]')];
const themeAssets = [...document.querySelectorAll('[data-theme-asset]')];
const favicon = document.querySelector('#site-favicon');
const sidebar = document.querySelector('.site-sidebar');
const sidebarToggle = document.querySelector('[data-sidebar-toggle]');
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const mobileSidebarClose = document.querySelector('.mobile-sidebar-close');
const mobileBackdrop = document.querySelector('[data-mobile-backdrop]');
const searchDialog = document.querySelector('#search-dialog');
const searchInput = document.querySelector('#search-input');
const searchOptions = [...document.querySelectorAll('.search-option')];
const allowedThemes = new Set(['light', 'dark', 'system']);
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const mobileViewport = window.matchMedia('(max-width: 900px)');
const sectionLinks = [...document.querySelectorAll('.sidebar-link[href^="#"]')];
const sections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);
let activeSectionLockUntil = 0;

function effectiveTheme(theme) {
  return theme === 'system' && systemTheme.matches ? 'dark' : theme === 'system' ? 'light' : theme;
}

function applyTheme(theme) {
  const selected = allowedThemes.has(theme) ? theme : 'system';
  const effective = effectiveTheme(selected);
  root.dataset.lhTheme = selected;
  themeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === selected)));
  themeAssets.forEach((asset) => {
    const next = asset.dataset[`theme${effective[0].toUpperCase()}${effective.slice(1)}`];
    if (next) asset.src = next;
  });
  if (favicon) favicon.href = effective === 'dark' ? 'assets/lighthouse-icon.svg' : 'assets/lighthouse-icon-light.svg';
}

function setSidebarExpanded(expanded) {
  sidebar.dataset.expanded = String(expanded);
  sidebarToggle?.setAttribute('aria-expanded', String(expanded));
  sidebarToggle?.setAttribute('aria-label', expanded ? 'Collapse navigation' : 'Expand navigation');
  if (sidebarToggle) sidebarToggle.title = expanded ? 'Collapse navigation' : 'Expand navigation';
}

function setMobileOpen(open) {
  body.dataset.mobileOpen = String(open);
  sidebar.dataset.mobileOpen = String(open);
  mobileMenuToggle?.setAttribute('aria-expanded', String(open));
  if (open) searchInput?.blur();
}

function updateViewportMode() {
  root.dataset.lhViewport = mobileViewport.matches ? 'mobile' : 'desktop';
  setSidebarExpanded(!mobileViewport.matches);
  setMobileOpen(false);
}

function setActiveSection(id) {
  sectionLinks.forEach((link) => {
    const active = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function updateActiveSection() {
  if (performance.now() < activeSectionLockUntil) return;
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
    setActiveSection(sections.at(-1)?.id);
    return;
  }
  const current = sections.reduce((active, section) => {
    return section.getBoundingClientRect().top <= 150 ? section : active;
  }, sections[0]);
  if (current) setActiveSection(current.id);
}

let storedTheme = 'system';
try {
  const stored = localStorage.getItem('lighthouse.appearance');
  if (allowedThemes.has(stored)) storedTheme = stored;
} catch {
  // The page remains usable when storage is unavailable.
}

applyTheme(storedTheme);
updateViewportMode();
updateActiveSection();

themeButtons.forEach((button) => button.addEventListener('click', () => {
  const selected = button.dataset.themeChoice;
  applyTheme(selected);
  try { localStorage.setItem('lighthouse.appearance', selected); } catch { /* Page-local preference. */ }
}));

systemTheme.addEventListener('change', () => {
  if (root.dataset.lhTheme === 'system') applyTheme('system');
});

mobileViewport.addEventListener('change', updateViewportMode);

sidebarToggle?.addEventListener('click', () => setSidebarExpanded(sidebar.dataset.expanded !== 'true'));
document.querySelector('.sidebar-node summary')?.addEventListener('click', (event) => {
  if (!mobileViewport.matches && sidebar.dataset.expanded !== 'true') {
    event.preventDefault();
    setSidebarExpanded(true);
  }
});

sectionLinks.forEach((link) => link.addEventListener('click', () => {
  activeSectionLockUntil = performance.now() + 700;
  setActiveSection(link.getAttribute('href').slice(1));
  setMobileOpen(false);
}));

window.addEventListener('scroll', updateActiveSection, { passive: true });
window.addEventListener('resize', updateActiveSection);

mobileMenuToggle?.addEventListener('click', () => setMobileOpen(true));
mobileSidebarClose?.addEventListener('click', () => setMobileOpen(false));
mobileBackdrop?.addEventListener('click', () => setMobileOpen(false));

function visibleSearchOptions() {
  return searchOptions.filter((option) => !option.hidden);
}

function setSearchActive(index) {
  const options = visibleSearchOptions();
  if (!options.length) return;
  const selected = options[(index + options.length) % options.length];
  searchOptions.forEach((option) => option.dataset.active = String(option === selected));
  selected.scrollIntoView({ block: 'nearest' });
}

function filterSearchOptions() {
  const query = searchInput.value.trim().toLowerCase();
  searchOptions.forEach((option) => {
    const matches = !query || `${option.dataset.searchName} ${option.textContent}`.toLowerCase().includes(query);
    option.hidden = !matches;
    option.dataset.active = 'false';
  });
  document.querySelectorAll('.search-section').forEach((section) => {
    section.hidden = !section.querySelector('.search-option:not([hidden])');
  });
  setSearchActive(0);
}

function openSearch() {
  if (!searchDialog?.open) searchDialog.showModal();
  searchInput.value = '';
  filterSearchOptions();
  requestAnimationFrame(() => searchInput.focus());
}

function closeSearch() {
  if (searchDialog?.open) searchDialog.close();
}

document.querySelectorAll('[data-search-open]').forEach((button) => button.addEventListener('click', openSearch));
document.querySelector('[data-search-close]')?.addEventListener('click', closeSearch);
searchDialog?.addEventListener('click', (event) => {
  if (event.target === searchDialog) closeSearch();
});
searchInput?.addEventListener('input', filterSearchOptions);
searchInput?.addEventListener('keydown', (event) => {
  const options = visibleSearchOptions();
  const current = options.findIndex((option) => option.dataset.active === 'true');
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    setSearchActive(current + (event.key === 'ArrowDown' ? 1 : -1));
  }
  if (event.key === 'Enter' && options[current >= 0 ? current : 0]) options[current >= 0 ? current : 0].click();
});

searchOptions.forEach((option) => option.addEventListener('click', () => {
  const target = option.dataset.searchTarget;
  closeSearch();
  if (target.startsWith('#')) {
    setActiveSection(target.slice(1));
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
    history.replaceState(null, '', target);
  } else {
    window.location.href = target;
  }
}));

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openSearch();
  } else if (event.key === 'Escape' && searchDialog?.open) {
    closeSearch();
  } else if (event.key === 'Escape' && body.dataset.mobileOpen === 'true') {
    setMobileOpen(false);
  }
});
