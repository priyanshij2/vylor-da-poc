const DEMO_API_BASE = 'https://corsproxy.io/?http://demo.investorroom.com/api/newsfeed_releases';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

async function fetchRelease(apiBase, id) {
  const resp = await fetch(`${apiBase}/get.php?id=${id}&format=json&style_in_body=0`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export default async function decorate(block) {
  const firstCell = block.querySelector(':scope > div > div');
  const configText = firstCell?.textContent?.trim() ?? '';
  const apiBase = configText.startsWith('http') ? configText : DEMO_API_BASE;
  block.innerHTML = '';

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    block.innerHTML = '<p class="press-release-detail-error">No release specified.</p>';
    return;
  }

  block.innerHTML = '<p class="press-release-detail-loading" aria-live="polite">Loading…</p>';

  let release;
  try {
    release = await fetchRelease(apiBase, id);
  } catch {
    block.innerHTML = '<p class="press-release-detail-error">Failed to load press release.</p>';
    return;
  }

  block.innerHTML = '';

  if (release.css) {
    const style = document.createElement('style');
    style.textContent = release.css;
    block.append(style);
  }

  const header = document.createElement('div');
  header.className = 'press-release-detail-header';

  const dateLine = document.createElement('p');
  dateLine.className = 'press-release-detail-date';
  dateLine.textContent = formatDate(release.releaseDate || release.released);

  const headline = document.createElement('h1');
  headline.className = 'press-release-detail-headline';
  headline.textContent = release.headline || '';

  header.append(dateLine, headline);

  const subText = release.subheadline || release.subheadline1;
  if (subText) {
    const sub = document.createElement('p');
    sub.className = 'press-release-detail-subheadline';
    sub.textContent = subText;
    header.append(sub);
  }

  const body = document.createElement('div');
  body.className = 'press-release-detail-body';
  body.innerHTML = release.body || '';

  const backLink = document.createElement('p');
  backLink.className = 'press-release-detail-back';
  const back = document.createElement('a');
  back.href = document.referrer || 'press-releases';
  back.textContent = '← Back to Press Releases';
  backLink.append(back);

  block.append(backLink, header, body);

  document.title = release.headline || document.title;
}
