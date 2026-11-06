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
import { createFooterBeatTimer } from './components/footer-beat-timer.js';
import { mountConclusion } from './components/conclusion.js';
import { mountDecadeTrend } from './components/decade-trend.js';
import { mountScaleComparison } from './components/scale-comparison.js';
import { createBeatPlayback } from './components/beat-playback.js';
import { installPresentationOverview } from './components/presentation-overview.js';

document.querySelector('.slides').innerHTML = `<section id="welcome">${cover}</section>${opening}${chapters}`;

const chartInstances = [];
let footerTimer;
let overviewFinalSlide=null;
async function mountChart(id, mount) {
  const host = document.getElementById(id);
  host.replaceChildren();
  try {
    const chart = await mount(host);
    chart.slide = host.closest('section');
    chartInstances.push(chart);
    chart.setPlaybackMode?.(autoPlayback);
    chart.setActive?.(chart.slide.classList.contains('present')&&!presentation.isOverview());
    if(overviewFinalSlide===chart.slide){chart.showLastBeat?.();overviewFinalSlide=null;}
    updateNavigation();
  }
  catch { host.innerHTML = '<p role="status">The source data could not load. Reload the page to try again.</p>'; }
}
mountChart('scale-comparison-chart', mountScaleComparison);
mountChart('decade-trend-chart', mountDecadeTrend);
mountChart('flight-exploration-chart', async host => (await import('./components/flight-exploration.js')).mountFlightExploration(host));
mountChart('flight-types-chart', async host => (await import('./components/comparison-explorer.js')).mountFlightTypes(host));
mountChart('aircraft-comparison-chart', async host => (await import('./components/comparison-explorer.js')).mountAircraftExplorer(host));
mountChart('conclusion-scene', mountConclusion);

const themeOptions = {
  default: { url: baselineUrl, mode: 'light' },
  darkly: { url: darklyUrl, mode: 'dark' },
};
const themeToggle = document.querySelector('#theme-toggle');
const playbackToggle = document.querySelector('#playback-toggle');
let autoPlayback = true;
function setAutoPlayback(value) {
  autoPlayback = value;
  playbackToggle.setAttribute('aria-pressed', String(autoPlayback));
  playbackToggle.setAttribute('aria-label', 'Auto reveals');
  playbackToggle.title = autoPlayback ? 'Auto reveals on · click or press Space to turn off' : 'Auto reveals off · click or press Space to turn on';
  chartInstances.forEach(chart => chart.setPlaybackMode?.(autoPlayback));
  hookPlayback.setMode(autoPlayback);
}
function toggleAutoPlayback(event) {
  if (!event?.repeat) setAutoPlayback(!autoPlayback);
}
playbackToggle.addEventListener('click', toggleAutoPlayback);
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

async function revealTheme(apply) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { apply(); return; }
  const root = document.documentElement;
  if (!document.startViewTransition) {
    root.classList.add('theme-crossfade');
    apply();
    await new Promise(resolve => setTimeout(resolve, 350));
    root.classList.remove('theme-crossfade');
    return;
  }
  const bounds = themeToggle.getBoundingClientRect();
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.classList.add('theme-reveal');
  try {
    const transition = document.startViewTransition(apply);
    try {
      await transition.ready;
      root.animate({ clipPath:[`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, {
        duration:650, easing:'cubic-bezier(.4,0,.2,1)', pseudoElement:'::view-transition-new(root)',
      });
    } catch { /* A skipped snapshot still applies the selected theme. */ }
    await transition.finished.catch(() => {});
  } finally { root.classList.remove('theme-reveal'); }
}

async function setTheme(name, { animate = false } = {}) {
  const selected = themeOptions[name] ? name : 'default';
  const theme = themeOptions[selected];
  themeToggle.disabled = true;
  status.textContent = 'Applying theme…';
  try {
    const next = await loadStylesheet(theme.url);
    const apply = () => {
      const previous = document.querySelector('#presentation-theme');
      previous.removeAttribute('id');
      next.id = 'presentation-theme';
      next.media = 'all';
      document.documentElement.dataset.bsTheme = theme.mode;
      const palette = theme.mode === 'dark' ? [0, 2, 8, 6] : [1, 3, 9, 11];
      palette.forEach((colorIndex, index) => document.documentElement.style.setProperty(`--viz-series-${index + 1}`, schemePaired[colorIndex]));
      previous.remove();
      currentTheme = selected;
      themeToggle.setAttribute('aria-pressed', String(theme.mode === 'light'));
      themeToggle.title = theme.mode === 'dark' ? 'Cabin light off · click for light mode' : 'Cabin light on · click for dark mode';
      try { localStorage.setItem('crashalot-component-theme', selected); } catch { /* Theme persistence is optional. */ }
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: selected } }));
    };
    if (animate) await revealTheme(apply); else apply();
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
themeToggle.addEventListener('click', () => setTheme(currentTheme === 'darkly' ? 'default' : 'darkly', { animate:true }));
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
  const slidePosition = `${presentation.getIndices().h + 1} of ${presentation.getTotalSlides()}`;
  let position = `${slidePosition} · ${slide.dataset.beat || 'The journey'}`;
  if (cover) position = `${slidePosition} · Welcome`;
  if (slide.id === 'flight-1282') position = `${slidePosition} · Reveal ${hookStep + 1} of ${hookBeatLabels.length}`;
  if (['change-over-time', 'counts-in-context', 'flight-phase', 'flight-types', 'aircraft-design', 'conclusion'].includes(slide.id)) position = state ? `${slidePosition} · Reveal ${state.step} of ${state.total}` : `${slidePosition} · Loading…`;
  if (storyPosition.textContent !== position) storyPosition.textContent = position;
  storyBack.hidden = false;
  storyBack.disabled = cover;
  playbackToggle.hidden = false;
  footerTimer?.refresh();
  storyNext.disabled = (presentation.isLastSlide() && (!state || state.complete)) || (['change-over-time', 'counts-in-context', 'flight-phase', 'flight-types', 'aircraft-design', 'conclusion'].includes(slide.id) && !chart);
}
function previousBeat() {
  if(presentation.isOverview())return;
  setAutoPlayback(false);
  if (presentation.getCurrentSlide()?.id === 'flight-1282') hookPlayback.hold();
  const chart = chartInstances.find(chart => chart.slide === presentation.getCurrentSlide());
  if (chart?.previousBeat?.()) return;
  presentation.prev();
}
function nextBeat() {
  if(presentation.isOverview())return;
  const slide = presentation.getCurrentSlide();
  const chart = chartInstances.find(chart => chart.slide === slide);
  const state = chart?.getNavigationState?.();
  if (state?.running || state?.inProgress) { chart.finishBeat?.(); return; }
  if (chart?.nextBeat?.()) return;
  // Wait for the comparison to mount rather than skipping its opening beat.
  if (['change-over-time', 'counts-in-context', 'flight-phase', 'flight-types', 'aircraft-design', 'conclusion'].includes(slide?.id) && !chart) return;
  if (slide?.id === 'flight-1282') hookPlayback.engage();
  presentation.next();
}
storyNext.addEventListener('click', nextBeat);
storyBack.addEventListener('click', previousBeat);
document.addEventListener('storybeat', updateNavigation);
function updateChrome() {
  const index = presentation.getIndices().h;
  document.body.classList.toggle('presentation-cover', index === 0);
  document.body.classList.toggle('presentation-hook', presentation.getCurrentSlide()?.id === 'flight-1282');
  chartInstances.forEach(chart => {
    chart.resize?.();
    chart.setActive?.(!presentation.isOverview()&&chart.slide === presentation.getCurrentSlide());
  });
  hookPlayback.setActive(!presentation.isOverview()&&presentation.getCurrentSlide()?.id === 'flight-1282');
  updateNavigation();
}
const hook = document.getElementById('flight-1282');
// Whole phrases fade in together. Keep a dedicated suspense hold before
// the panel/photo at Beat 5, then time the longer outcome and question for reading.
const hookBeatLabels = ['0','1','2','2.5','3','4','5','6','7','8'];
const hookHolds = [1000, 1400, 900, 1200, 2300, 1800, 3500, 4400, 4600];
let completingHook = false;
const hookPlayback = createBeatPlayback({
  state: () => ({ key:Number(hook.dataset.hookStep || 0),running:false, complete:Number(hook.dataset.hookStep || 0) >= hookBeatLabels.length-1, atBoundary:true }),
  play() {}, pause() {},
  advance() { if (presentation.getCurrentSlide() === hook) presentation.nextFragment(); },
  holdMs: () => hookHolds[Number(hook.dataset.hookStep || 0)],
  reduced: reducedMotion,
  showAll() {
    completingHook = true;
    hook.dataset.hookStatic = 'true';
    while (presentation.getCurrentSlide() === hook && presentation.nextFragment()) { /* Fragments only; never next slide. */ }
    completingHook = false;
    updateHook();
  },
  changed() { hook.dataset.playback = hookPlayback.status; },
});
hookPlayback.setMode(autoPlayback);
function updateHook() {
  const shown = [...hook.querySelectorAll('.fragment.visible')];
  const step = shown.length ? Math.max(...shown.map(node => Number(node.dataset.fragmentIndex))) + 1 : 0;
  hook.dataset.hookStep = step;
  hook.dataset.hookBeat = hookBeatLabels[step];
  if (step < hookBeatLabels.length-1 && !completingHook) delete hook.dataset.hookStatic;
  const staticStory = hook.dataset.hookStatic === 'true';
  const finalBeat = step === hookBeatLabels.length-1;
  hook.querySelector('.hook-scene').setAttribute('aria-hidden', String(finalBeat && !staticStory));
  hook.querySelector('.hook-scene').inert = finalBeat && !staticStory;
  hook.querySelector('.hook-map').setAttribute('aria-hidden',String(step >= 6));
  if (!completingHook) hookPlayback.settled();
  updateNavigation();
}
hook.addEventListener('keydown', event => { if (event.target.closest('button, a') && (event.key === 'Enter' || event.key === ' ')) event.stopPropagation(); });
presentation.on('fragmentshown', updateHook);
presentation.on('fragmenthidden', updateHook);
presentation.on('slidechanged', updateHook);
presentation.on('ready', updateHook);
function finishOverviewSlide(slide){
  if(slide.id==='flight-1282'){
    hookPlayback.hold();completingHook=true;
    while(presentation.getCurrentSlide()===hook&&presentation.nextFragment()) { /* Stay inside the opening. */ }
    completingHook=false;delete hook.dataset.hookStatic;updateHook();
  }else{
    const chart=chartInstances.find(chart=>chart.slide===slide);
    if(chart){chart.showLastBeat?.();overviewFinalSlide=null;}
    else if(slide.querySelector('.narrative-chart'))overviewFinalSlide=slide;
  }
  updateNavigation();
}
presentation.on('ready',()=>installPresentationOverview({presentation,charts:()=>chartInstances,finishSlide:finishOverviewSlide,
  suspendOpening:()=>hookPlayback.setActive(false),resume:updateChrome}));
presentation.on('ready', updateChrome);
presentation.on('slidechanged', event => {
  if (event.previousSlide && presentation.getIndices(event.previousSlide).h > event.indexh) setAutoPlayback(false);
  updateChrome();
});
footerTimer=createFooterBeatTimer({footer:document.querySelector('.presentation-footer'),read(){
  if(presentation.isOverview()||document.hidden)return {mode:'hidden'};
  const slide=presentation.getCurrentSlide();
  if(!slide)return {mode:'hidden'};
  if(slide.id==='welcome')return {mode:'start'};
  if(slide.id==='flight-1282')return hookPlayback.timing;
  return chartInstances.find(chart=>chart.slide===slide)?.getPlaybackTiming?.()||{mode:'loading'};
}});
presentation.on('overviewshown',()=>footerTimer.refresh());
presentation.on('overviewhidden',()=>footerTimer.refresh());
presentation.initialize({
  disableLayout: true,
  center: false,
  hash: true,
  controls: false,
  progress: true,
  slideNumber: false,
  showSlideNumber: 'all',
  // Space controls Auto; focused controls keep their native keyboard actions.
  // Up/Down and Page keys remain available for reading longer chapters.
  keyboardCondition: event => {
    if(event.key==='Escape')return true;
    if(['ArrowUp','ArrowDown','PageUp','PageDown'].includes(event.key))return false;
    if(event.key===' '&&(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey))return false;
    const control=event.target.closest('button, a, input, select, textarea, summary, [role=button], [contenteditable=true]');
    if(control?.matches('.conclusion-restart')&&event.key==='ArrowLeft')return true;
    return !control || event.key===' '&&control.matches('[data-story-back],[data-story-next]');
  },
  keyboard: { 32: toggleAutoPlayback, 33: null, 34: null, 38: null, 40: null, 39: nextBeat, 78: nextBeat, 37: previousBeat, 80: previousBeat },
  // Touch gestures scroll chart pages; explicit navigation remains available.
  touch: false,
  navigationMode: 'linear',
  transition: reducedMotion.matches ? 'none' : 'fade',
  transitionSpeed: 'fast',
  // Keep narrow screens in the same reader-controlled sequence.
  scrollActivationWidth: null,
});
