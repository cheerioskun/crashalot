import Reveal from 'reveal.js';
import 'reveal.js/reveal.css';
import baselineUrl from 'bootstrap/dist/css/bootstrap.min.css?url';
import sandstoneUrl from './vendor/sandstone.css?url';
import darklyUrl from './vendor/darkly.css?url';
import { schemePaired } from 'd3';
import cover from './views/cover.html?raw';
import chapters from './views/chapters.html?raw';
import './presentation.css';
import './cover.css';
import { mountCrashCounts, mountCountRateComparison } from './components/narrative-counts.js';
import { mountPhaseSankey } from './components/phase-sankey.js';

document.querySelector('.slides').innerHTML = `<section id="welcome">${cover}</section>${chapters}`;

const chartInstances = [];
async function mountChart(id, mount) {
  const host = document.getElementById(id);
  host.replaceChildren();
  try { chartInstances.push(await mount(host)); }
  catch { host.innerHTML = '<p role="status">The source data could not load. Reload the page to try again.</p>'; }
}
Promise.all([
  mountChart('crash-count-chart', mountCrashCounts),
  mountChart('count-rate-chart', mountCountRateComparison),
  mountChart('phase-sankey-chart', mountPhaseSankey),
]);

const revealButton = document.getElementById('reveal-denominator');
const resetButton = document.getElementById('reset-denominator');
function revealExposure(show) {
  document.getElementById('exposure-total').hidden = !show;
  document.getElementById('reveal-resolution').hidden = !show;
  document.getElementById('denominator-stage').classList.toggle('is-revealed', show);
  revealButton.hidden = show;
  revealButton.setAttribute('aria-expanded', String(show));
  (show ? resetButton : revealButton).focus({preventScroll:true});
}
revealButton.addEventListener('click', () => revealExposure(true));
resetButton.addEventListener('click', () => revealExposure(false));

const themeOptions = {
  default: { url: baselineUrl, mode: 'light' },
  sandstone: { url: sandstoneUrl, mode: 'light' },
  darkly: { url: darklyUrl, mode: 'dark' },
};
const selector = document.querySelector('#presentation-theme-select');
const status = document.querySelector('#presentation-theme-status');
let currentTheme = 'default';

function loadStylesheet(url) {
  return new Promise((resolve, reject) => {
    const candidate = document.createElement('link');
    candidate.rel = 'stylesheet';
    candidate.href = url;
    candidate.media = 'not all';
    const timeout = setTimeout(() => { candidate.remove(); reject(new Error('Theme timed out')); }, 10000);
    candidate.onload = () => { clearTimeout(timeout); resolve(candidate); };
    candidate.onerror = () => { clearTimeout(timeout); candidate.remove(); reject(new Error('Theme unavailable')); };
    document.querySelector('#presentation-theme').after(candidate);
  });
}

async function setTheme(name) {
  const selected = themeOptions[name] ? name : 'default';
  const theme = themeOptions[selected];
  selector.disabled = true;
  status.textContent = 'Applying theme…';
  try {
    const next = await loadStylesheet(theme.url);
    const previous = document.querySelector('#presentation-theme');
    previous.removeAttribute('id');
    next.id = 'presentation-theme';
    next.media = 'all';
    document.documentElement.dataset.bsTheme = theme.mode;
    const palette = theme.mode === 'dark' ? [0, 2, 8, 6] : [1, 3, 9, 11];
    palette.forEach((colorIndex, index) => document.documentElement.style.setProperty(`--viz-series-${index + 1}`, schemePaired[colorIndex]));
    previous.remove();
    currentTheme = selected;
    selector.value = selected;
    try { localStorage.setItem('crashalot-component-theme', selected); } catch { /* Theme persistence is optional. */ }
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: selected } }));
    status.textContent = '';
  } catch {
    selector.value = currentTheme;
    if (!document.querySelector('#presentation-theme').getAttribute('href') && selected !== 'default') {
      await setTheme('default');
    }
    status.textContent = 'The requested theme could not load. The previous appearance has been retained.';
  } finally {
    selector.disabled = false;
  }
}
selector.addEventListener('change', () => setTheme(selector.value));
let savedTheme = 'default';
try { savedTheme = localStorage.getItem('crashalot-component-theme') || 'default'; } catch { /* Theme persistence is optional. */ }
setTheme(savedTheme);

const presentation = new Reveal(document.querySelector('.reveal'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function updateChrome() {
  const index = presentation.getIndices().h;
  document.body.classList.toggle('presentation-cover', index === 0);
  const stage = index <= 2 ? 'notice' : index <= 4 ? 'reconsider' : 'inspect';
  document.querySelectorAll('[data-stage]').forEach(link => {
    if (link.dataset.stage === stage) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
  chartInstances.forEach(chart => chart.resize?.());
}
presentation.on('ready', updateChrome);
presentation.on('slidechanged', updateChrome);
presentation.initialize({
  disableLayout: true,
  center: false,
  hash: true,
  controls: false, // Footer buttons use Reveal's built-in navigate-prev/next controller.
  progress: true,
  slideNumber: 'c/t',
  showSlideNumber: 'all',
  keyboard: true,
  navigationMode: 'linear',
  transition: reducedMotion.matches ? 'none' : 'fade',
  transitionSpeed: 'fast',
  // Keep narrow screens in the same reader-controlled sequence.
  scrollActivationWidth: null,
});
