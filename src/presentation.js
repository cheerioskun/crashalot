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

document.querySelector('.slides').innerHTML = `<section id="welcome">${cover}</section>${chapters}`;

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
  document.body.classList.toggle('presentation-cover', presentation.getIndices().h === 0);
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
