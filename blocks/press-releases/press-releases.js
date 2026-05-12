// corsproxy.io is only needed for the demo domain; production uses same-origin API
const DEMO_API_BASE = 'https://corsproxy.io/?http://demo.investorroom.com/api/newsfeed_releases';
const DEFAULT_LIMIT = 5;

function parseCategories(data) {
  if (Array.isArray(data)) return data;
  const cats = data.category || data.categories;
  if (cats) return Array.isArray(cats) ? cats : [cats];
  return [];
}

function parseReleases(data) {
  if (Array.isArray(data)) return data;
  const rels = data.release || data.releases;
  if (rels) return Array.isArray(rels) ? rels : [rels];
  return [];
}

async function fetchCategories(apiBase) {
  const resp = await fetch(`${apiBase}/list_categories.php?format=json`);
  if (!resp.ok) return [];
  const data = await resp.json();
  return parseCategories(data);
}

async function fetchReleases(apiBase, { category = '', limit = DEFAULT_LIMIT } = {}) {
  const params = new URLSearchParams({ format: 'json', limit });
  if (category) params.set('category', category);
  const resp = await fetch(`${apiBase}/list.php?${params}`);
  if (!resp.ok) return [];
  const data = await resp.json();
  return parseReleases(data);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

function buildDetailUrl(id) {
  const detailUrl = new URL('press-release-detail', window.location.href);
  detailUrl.searchParams.set('id', id);
  return detailUrl.toString();
}

function buildItem(release) {
  const item = document.createElement('article');
  item.className = 'press-releases-item';

  const thumbUrl = release.thumbnail_override || release.image_url || release.image;
  if (thumbUrl) {
    const figure = document.createElement('figure');
    figure.className = 'press-releases-figure';
    const img = document.createElement('img');
    img.src = thumbUrl;
    img.alt = release.image_alt || release.headline || '';
    img.loading = 'lazy';
    img.width = 150;
    img.height = 100;
    figure.append(img);
    item.append(figure);
  }

  const body = document.createElement('div');
  body.className = 'press-releases-body';

  const meta = document.createElement('p');
  meta.className = 'press-releases-meta';
  const date = formatDate(release.release_datetime || release.releaseDate || release.modified);
  meta.textContent = `Press Release${date ? ` • ${date}` : ''}`;

  const headlineEl = document.createElement('h3');
  headlineEl.className = 'press-releases-headline';
  const a = document.createElement('a');
  a.href = buildDetailUrl(release.id);
  a.textContent = release.headline || '';
  headlineEl.append(a);

  body.append(meta, headlineEl);

  const summaryText = release.summary || release.subheadline || '';
  if (summaryText) {
    const summary = document.createElement('p');
    summary.className = 'press-releases-summary';
    summary.textContent = summaryText;
    body.append(summary);
  }

  item.append(body);
  return item;
}

function renderList(container, releases) {
  container.innerHTML = '';
  if (!releases.length) {
    const msg = document.createElement('p');
    msg.className = 'press-releases-empty';
    msg.textContent = 'No press releases found.';
    container.append(msg);
    return;
  }
  releases.forEach((rel) => container.append(buildItem(rel)));
}

async function loadReleases(container, apiBase, category = '') {
  container.innerHTML = '<p class="press-releases-loading" aria-live="polite">Loading…</p>';
  try {
    const releases = await fetchReleases(apiBase, { category });
    renderList(container, releases);
  } catch {
    container.innerHTML = '<p class="press-releases-empty">Failed to load press releases.</p>';
  }
}

export default async function decorate(block) {
  const firstCell = block.querySelector(':scope > div > div');
  const configText = firstCell?.textContent?.trim() ?? '';
  const apiBase = configText.startsWith('http') ? configText : DEMO_API_BASE;
  block.innerHTML = '';

  const filters = document.createElement('div');
  filters.className = 'press-releases-filters';

  const filterGroup = document.createElement('div');
  filterGroup.className = 'press-releases-filter-group';

  const labelEl = document.createElement('span');
  labelEl.className = 'press-releases-filter-label';
  labelEl.textContent = 'Categories';
  labelEl.id = 'pr-category-label';

  const selectWrap = document.createElement('div');
  selectWrap.className = 'press-releases-select-wrap';

  const select = document.createElement('select');
  select.setAttribute('aria-labelledby', 'pr-category-label');

  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Filter By Category';
  select.append(defaultOpt);
  selectWrap.append(select);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'press-releases-clear';
  clearBtn.type = 'button';
  clearBtn.textContent = 'Clear All Filters';

  filterGroup.append(labelEl, selectWrap);
  filters.append(filterGroup, clearBtn);

  const list = document.createElement('div');
  list.className = 'press-releases-list';

  block.append(filters, list);

  const [categories] = await Promise.all([
    fetchCategories(apiBase).catch(() => []),
    loadReleases(list, apiBase),
  ]);

  categories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat.id ?? cat.ID ?? '';
    opt.textContent = cat.name ?? cat.Name ?? String(opt.value);
    select.append(opt);
  });

  select.addEventListener('change', () => {
    loadReleases(list, apiBase, select.value);
  });

  clearBtn.addEventListener('click', () => {
    select.value = '';
    loadReleases(list, apiBase);
  });
}
