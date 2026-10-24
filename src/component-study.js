import baselineUrl from 'bootstrap/dist/css/bootstrap.min.css?url';
import sandstoneUrl from './vendor/sandstone.css?url';
import darklyUrl from './vendor/darkly.css?url';
import Tab from 'bootstrap/js/dist/tab';
import { schemePaired } from 'd3';
import 'bootstrap/js/dist/collapse';
import './component-study.css';

const themes = {
  default: { url: baselineUrl, mode: 'light', description: 'A neutral baseline for comparison.' },
  sandstone: { url: sandstoneUrl, mode: 'light', description: 'Warm neutrals and quieter interface accents.' },
  darkly: { url: darklyUrl, mode: 'dark', description: 'A dark surface with a different balance of contrast.' },
};
// ColorBrewer Paired, supplied by D3. Data roles are independent of UI colors.
// Dark/light variants retain the same blue, green, purple, and warm hue families.
const dataPalette = {
  light: [1, 3, 9, 11].map(index => schemePaired[index]),
  dark: [0, 2, 8, 6].map(index => schemePaired[index]),
};
function applyDataPalette(mode) {
  dataPalette[mode].forEach((color, index) => {
    document.documentElement.style.setProperty(`--viz-series-${index + 1}`, color);
  });
}
applyDataPalette('light');

const selector = document.querySelector('#theme-select');
const status = document.querySelector('#theme-status');
const description = document.querySelector('#theme-description');
let currentTheme = 'default';
let themeRequest = 0;

function loadStylesheet(url) {
  return new Promise((resolve, reject) => {
    const candidate = document.createElement('link');
    candidate.rel = 'stylesheet';
    candidate.href = url;
    // Load without changing the current theme. Swap only once ready.
    candidate.media = 'not all';
    const timeout = setTimeout(() => { candidate.remove(); reject(new Error('Theme timed out')); }, 10000);
    candidate.onload = () => { clearTimeout(timeout); resolve(candidate); };
    candidate.onerror = () => { clearTimeout(timeout); candidate.remove(); reject(new Error('Theme unavailable')); };
    document.head.insertBefore(candidate, document.querySelector('#component-theme').nextSibling);
  });
}

async function setTheme(name) {
  const requested = ++themeRequest;
  const theme = themes[name] || themes.default;
  selector.disabled = true;
  status.textContent = 'Applying theme…';
  try {
    const next = await loadStylesheet(theme.url);
    if (requested !== themeRequest) { next.remove(); return; }
    const previous = document.querySelector('#component-theme');
    previous.removeAttribute('id');
    next.id = 'component-theme';
    next.media = 'all';
    document.documentElement.dataset.bsTheme = theme.mode;
    applyDataPalette(theme.mode);
    previous.remove();
    currentTheme = name;
    selector.value = name;
    description.textContent = theme.description;
    try { localStorage.setItem('crashalot-component-theme', name); } catch { /* Storage is optional. */ }
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: name } }));
    status.textContent = '';
  } catch {
    selector.value = currentTheme;
    if (!document.querySelector('#component-theme').getAttribute('href') && name !== 'default') {
      await setTheme('default');
      status.textContent = 'The saved theme could not load. Showing Bootstrap Default.';
      return;
    }
    status.textContent = 'This theme could not load. The previous appearance has been retained.';
  } finally {
    if (requested === themeRequest) selector.disabled = false;
  }
}
selector.addEventListener('change', () => setTheme(selector.value));
let savedTheme = 'default';
try { const saved = localStorage.getItem('crashalot-component-theme'); if (themes[saved]) savedTheme = saved; } catch { /* Storage is optional. */ }
const themeReady = setTheme(savedTheme);

document.querySelector('#reset-reading').addEventListener('click', () => {
  Tab.getOrCreateInstance(document.querySelector('#overview-tab')).show();
});

async function loadEvidence() {
  const host = document.querySelector('#safety-chart-specimen');
  try {
    const [response, module] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/safety-trend.json`),
      import('./components/safety-chart.js'),
      themeReady,
    ]);
    if (!response.ok) throw new Error('Dataset could not be loaded');
    const dataset = await response.json();
    host.replaceChildren();
    module.mountSafetyChart(host, dataset);
  } catch (error) {
    host.replaceChildren();
    const note = document.createElement('p');
    note.className = 'chart-loading text-body-secondary';
    note.setAttribute('role', 'status');
    note.textContent = 'The evidence specimen is unavailable. Reload the page to try again; no data has been substituted.';
    host.append(note);
    console.error('Evidence specimen:', error);
  } finally {
    host.setAttribute('aria-busy', 'false');
  }
}
loadEvidence();
