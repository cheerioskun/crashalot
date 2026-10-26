import Reveal from 'reveal.js';
import 'reveal.js/reveal.css';
import baselineUrl from 'bootstrap/dist/css/bootstrap.min.css?url';
import darklyUrl from './vendor/darkly.css?url';
import { schemePaired } from 'd3';
import cover from './views/cover.html?raw';
import opening from './views/opening.html?raw';
import './opening.css';
import chapters from './views/chapters.html?raw';
import './presentation.css';
import './cover.css';
import { mountDecadeTrend } from './components/decade-trend.js';
import { mountScaleComparison } from './components/scale-comparison.js';

document.querySelector('.slides').innerHTML = `<section id="welcome">${cover}</section>${opening}${chapters}`;

const chartInstances = [];
async function mountChart(id, mount) {
  const host = document.getElementById(id);
  host.replaceChildren();
  try {
    const chart = await mount(host);
    chart.slide = host.closest('section');
    chartInstances.push(chart);
    chart.setPlaybackMode?.(autoPlayback);
    chart.setActive?.(chart.slide.classList.contains('present'));
    updateNavigation();
  }
  catch { host.innerHTML = '<p role="status">The source data could not load. Reload the page to try again.</p>'; }
}
mountChart('scale-comparison-chart', mountScaleComparison);
mountChart('decade-trend-chart', mountDecadeTrend);

const themeOptions = {
  default: { url: baselineUrl, mode: 'light' },
  darkly: { url: darklyUrl, mode: 'dark' },
};
const themeToggle = document.querySelector('#theme-toggle');
const playbackToggle = document.querySelector('#playback-toggle');
let autoPlayback = false;
playbackToggle.addEventListener('click', () => {
  autoPlayback = !autoPlayback;
  playbackToggle.setAttribute('aria-pressed', String(autoPlayback));
  playbackToggle.setAttribute('aria-label', autoPlayback ? 'Enable manual playback' : 'Enable auto playback');
  playbackToggle.title = autoPlayback ? 'Auto playback · switch to Manual' : 'Manual playback · switch to Auto';
  chartInstances.forEach(chart => chart.setPlaybackMode?.(autoPlayback));
});
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
  themeToggle.disabled = true;
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
    themeToggle.setAttribute('aria-label', theme.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    themeToggle.title = theme.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    try { localStorage.setItem('crashalot-component-theme', selected); } catch { /* Theme persistence is optional. */ }
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: selected } }));
    status.textContent = '';
  } catch {
    if (!document.querySelector('#presentation-theme').getAttribute('href') && selected !== 'default') {
      await setTheme('default');
    }
    status.textContent = 'The requested theme could not load. The previous appearance has been retained.';
  } finally {
    themeToggle.disabled = false;
  }
}
themeToggle.addEventListener('click', () => setTheme(currentTheme === 'darkly' ? 'default' : 'darkly'));
let savedTheme = 'default';
try { savedTheme = localStorage.getItem('crashalot-component-theme') || 'default'; } catch { /* Theme persistence is optional. */ }
setTheme(savedTheme);

const presentation = new Reveal(document.querySelector('.reveal'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const storyNext = document.querySelector('[data-story-next]');
const storyBack = document.querySelector('[data-story-back]');
const storyPosition = document.querySelector('[data-story-position]');
function updateNavigation() {
  const slide = presentation.getCurrentSlide();
  if (!slide) return;
  const chart = chartInstances.find(chart => chart.slide === slide);
  const state = chart?.getNavigationState?.();
  const cover = slide.id === 'welcome';
  const hookStep = Number(document.getElementById('flight-1282').dataset.hookStep || 0);
  let position = `${presentation.getIndices().h + 1} / ${presentation.getTotalSlides()} · ${slide.dataset.beat || 'The journey'}`;
  if (cover) position = 'An invitation to look closer';
  if (slide.id === 'flight-1282') position = `Flight 1282 · Beat ${hookStep + 1} of 5`;
  if (['change-over-time', 'counts-in-context'].includes(slide.id)) position = state ? `Beat ${state.step} of ${state.total} · ${state.action}` : 'Loading the comparison…';
  if (storyPosition.textContent !== position) storyPosition.textContent = position;
  storyBack.hidden = cover;
  storyNext.querySelector('[data-next-label]').textContent = cover ? 'Start the journey' : 'Next';
  storyNext.disabled = presentation.isLastSlide() || !!state?.running || (['change-over-time', 'counts-in-context'].includes(slide.id) && !chart);
  storyNext.setAttribute('aria-label', cover ? 'Start the journey' : state ? `Next: ${state.action.toLowerCase()}` : 'Next');
}
function previousBeat() {
  const chart = chartInstances.find(chart => chart.slide === presentation.getCurrentSlide());
  if (chart?.previousBeat?.()) return;
  presentation.prev();
  chartInstances.find(chart => chart.slide === presentation.getCurrentSlide())?.showLastBeat?.();
}
function nextBeat() {
  const slide = presentation.getCurrentSlide();
  const chart = chartInstances.find(chart => chart.slide === slide);
  if (chart?.nextBeat?.()) return;
  // Wait for the comparison to mount rather than skipping its opening beat.
  if (['change-over-time', 'counts-in-context'].includes(slide?.id) && !chart) return;
  presentation.next();
}
storyNext.addEventListener('click', nextBeat);
storyBack.addEventListener('click', previousBeat);
document.addEventListener('storybeat', updateNavigation);
function updateChrome() {
  const index = presentation.getIndices().h;
  document.body.classList.toggle('presentation-cover', index === 0);
  document.body.classList.toggle('presentation-hook', presentation.getCurrentSlide()?.id === 'flight-1282');
  const stage = index <= 3 ? 'notice' : index <= 5 ? 'reconsider' : 'inspect';
  document.querySelectorAll('[data-stage]').forEach(link => {
    if (link.dataset.stage === stage) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
  chartInstances.forEach(chart => {
    chart.resize?.();
    chart.setActive?.(chart.slide === presentation.getCurrentSlide());
  });
  updateNavigation();
}
const hook = document.getElementById('flight-1282');
function updateHook() {
  const shown = [...hook.querySelectorAll('.fragment.visible')];
  const step = shown.length ? Math.max(...shown.map(node => Number(node.dataset.fragmentIndex))) + 1 : 0;
  hook.dataset.hookStep = step;
  hook.querySelector('.hook-event').setAttribute('aria-hidden', String(step === 4));
  updateNavigation();
}
hook.addEventListener('keydown', event => { if (event.target.closest('button, a') && (event.key === 'Enter' || event.key === ' ')) event.stopPropagation(); });
presentation.on('fragmentshown', updateHook);
presentation.on('fragmenthidden', updateHook);
presentation.on('slidechanged', updateHook);
presentation.on('ready', updateHook);
presentation.on('ready', updateChrome);
presentation.on('slidechanged', updateChrome);
presentation.initialize({
  disableLayout: true,
  center: false,
  hash: true,
  controls: false,
  progress: true,
  slideNumber: false,
  showSlideNumber: 'all',
  keyboard: { 32: nextBeat, 34: nextBeat, 39: nextBeat, 40: nextBeat, 78: nextBeat, 37: previousBeat, 33: previousBeat, 80: previousBeat },
  navigationMode: 'linear',
  transition: reducedMotion.matches ? 'none' : 'fade',
  transitionSpeed: 'fast',
  // Keep narrow screens in the same reader-controlled sequence.
  scrollActivationWidth: null,
});
