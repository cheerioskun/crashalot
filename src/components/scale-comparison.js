import { axisBottom, format, scaleLinear, select, timer } from 'd3';
import { annotation, annotationCalloutElbow } from 'd3-svg-annotation';
import 'number-flow';
import { continuous } from 'number-flow/plugins';
import './scale-comparison.css';

const integer = format(',d');
const compact = format('~s');
const ACCIDENT_START = 350;
const ACCIDENT_MS = 2000;
const DEPARTURE_START = 2800;
const DEPARTURE_MS = 7000;
const IMPACT_END = DEPARTURE_START + DEPARTURE_MS;
const EXPANSION_START = IMPACT_END + 1500;
const YEAR_MS = 650;
const clamp = value => Math.max(0, Math.min(1, value));
// Zero velocity and acceleration at either end, with no quantitative overshoot.
const smooth = value => { const t = clamp(value); return t * t * t * (t * (6 * t - 15) + 10); };

// NumberFlow supplies the digit reels; the D3 timer still owns the data and bars.
function rollingNumber(parent, { year = false } = {}) {
  const flow = document.createElement('number-flow');
  flow.locales = 'en-US';
  flow.format = { useGrouping: !year, maximumFractionDigits: 0 };
  flow.plugins = [continuous];
  flow.trend = 1;
  flow.transformTiming = { duration: year ? 280 : 140, easing: 'cubic-bezier(.2,0,0,1)' };
  flow.spinTiming = { duration: year ? 300 : 140, easing: year ? 'cubic-bezier(.2,0,0,1)' : 'linear' };
  flow.opacityTiming = { duration: 100, easing: 'ease-out' };
  flow.setAttribute('data-will-change', '');
  parent.node().append(flow);
  flow.update(0);
  return flow;
}

export async function mountScaleComparison(container) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/scheduled-service.json`);
  if (!response.ok) throw new Error('Comparison source unavailable');
  const data = await response.json();
  const totals = data.rows.reduce((sum, row) => ({
    fatalAccidents: sum.fatalAccidents + row.fatalAccidents,
    departures: sum.departures + row.departures,
  }), { fatalAccidents: 0, departures: 0 });
  if (!Object.values(totals).every(value => Number.isSafeInteger(value) && value > 0)) throw new Error('Invalid comparison totals');
  const cumulative = data.rows.map((row, i, source) => ({
    year: row.year,
    fatalAccidents: source.slice(0, i + 1).reduce((sum, d) => sum + d.fatalAccidents, 0),
    departures: source.slice(0, i + 1).reduce((sum, d) => sum + d.departures, 0),
  }));
  const first = cumulative[0];
  const END = EXPANSION_START + (cumulative.length - 1) * YEAR_MS;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const root = select(container).append('div').attr('class', 'scale-comparison').attr('data-phase', 'initial');
  const interval = root.append('p').attr('class', 'scale-comparison__interval').attr('aria-label', 'Data time interval');
  interval.append('span').text(first.year);
  const intervalEnd = interval.append('span').attr('class', 'scale-comparison__interval-end').attr('hidden', true);
  intervalEnd.append('span').text('–');
  const yearFlow = rollingNumber(intervalEnd, { year: true });
  yearFlow.update(first.year);
  const plot = root.append('div').attr('class', 'scale-comparison__plot');
  const svg = plot.append('svg').attr('role', 'img').attr('aria-label', 'Scheduled-service fatal accidents and departures, 2005–2024, on a shared count scale');
  svg.append('desc').text(`NTSB Table 6, U.S. Part 121 scheduled service, 2005–2024. ${integer(totals.fatalAccidents)} fatal accidents and ${integer(totals.departures)} departures. The first year starts at zero, accidents grow first, then departures. After that comparison, later years are added cumulatively. Both use one linear scale. A separate revenue-only filter is not verified by this source.`);
  const rows = [
    { key: 'fatalAccidents', label: 'Fatal accidents', color: 'var(--bs-danger)' },
    { key: 'departures', label: 'Departures', color: 'var(--viz-series-2)' },
  ].map(metric => {
    const group = svg.append('g').attr('aria-hidden', 'true');
    const valueBox = group.append('foreignObject').attr('height', 48);
    const value = valueBox.append('xhtml:div').attr('class', 'scale-comparison__value').style('color', metric.color);
    const flow = rollingNumber(value);
    return { ...metric, display: '', lastValueTime: -Infinity, group, valueBox, value, flow,
      label: group.append('text').attr('class', 'scale-comparison__label').text(metric.label),
      baseline: group.append('line').attr('class', 'scale-comparison__baseline'),
      bar: group.append('rect').attr('class', 'scale-comparison__bar').attr('fill', metric.color),
    };
  });
  const axis = svg.append('g').attr('class', 'scale-comparison__axis').attr('aria-hidden', 'true');
  const calloutGroup = svg.append('g').attr('class', 'scale-comparison__callout').attr('aria-hidden', 'true').style('opacity', 0);
  const makeCallout = annotation().type(annotationCalloutElbow).editMode(false);
  let calloutKey = '';
  const transport = root.append('div').attr('class', 'scale-comparison__transport');
  const advance = transport.append('button').attr('type', 'button').attr('class', 'journey-button scale-comparison__advance').text('Count the fatal accidents').on('click', advanceStage);
  const controls = transport.append('div');
  const pause = controls.append('button').attr('type', 'button').attr('class', 'text-button').text('Pause').on('click', () => {
    if (running) stop(); else play();
  });
  controls.append('button').attr('type', 'button').attr('class', 'text-button').text('Replay').on('click', restart);
  const yearIntro = root.append('p').attr('class', 'scale-comparison__year-intro').attr('aria-hidden', 'true')
    .text('To see whether that picture holds beyond 2005, let’s add the following years.');
  root.on('keydown', event => { if (event.target.closest('button')) event.stopPropagation(); });

  let elapsed = 0, clock, running = false, active = false, destroyed = false;
  const accidentEnd = ACCIDENT_START + ACCIDENT_MS;
  const departureEnd = IMPACT_END + 700;
  let stageLimit = accidentEnd;
  let phase = '', lastFrame = null, wasRunning = false;
  let geometry;
  let displayedYear = first.year;
  const tickOpacity = new Map();
  const scale = scaleLinear();
  const axisRenderer = axisBottom(scale).tickFormat(value => value < 1000 ? integer(value) : compact(value)).tickSizeOuter(0);
  const conclusion = select(container.closest('main')).select('.scale-comparison__conclusion');

  function valuesAt(time) {
    if (time < EXPANSION_START) {
      const accidentProgress = smooth((time - ACCIDENT_START) / ACCIDENT_MS);
      const departureProgress = smooth((time - DEPARTURE_START) / DEPARTURE_MS);
      return {
        year: first.year,
        fatalAccidents: first.fatalAccidents * accidentProgress,
        departures: time >= IMPACT_END ? first.departures : Math.expm1(Math.log1p(first.departures) * departureProgress),
      };
    }
    const step = Math.min(cumulative.length - 2, Math.floor((time - EXPANSION_START) / YEAR_MS));
    const from = cumulative[step], to = cumulative[step + 1];
    const progress = smooth((time - EXPANSION_START - step * YEAR_MS) / YEAR_MS);
    return {
      year: to.year,
      fatalAccidents: from.fatalAccidents + (to.fatalAccidents - from.fatalAccidents) * progress,
      departures: from.departures + (to.departures - from.departures) * progress,
    };
  }
  function layout() {
    if (destroyed) return;
    const width = Math.max(260, plot.node().clientWidth);
    const height = width < 600 ? 310 : window.innerHeight < 800 ? 260 : 350;
    const barHeight = height < 300 ? 30 : 42;
    geometry = { width, height, left: 10, right: width - 28, barY: height < 300 ? 50 : 65, barHeight };
    calloutKey = '';
    scale.range([geometry.left, geometry.right]);
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    rows.forEach((row, i) => {
      const y = height < 300 ? 50 + i * 88 : 65 + i * 116;
      row.label.attr('x', geometry.left).attr('y', y - 18);
      const valueWidth = Math.min(270, width - 160);
      row.valueBox.attr('x', geometry.right - valueWidth).attr('y', y - 53).attr('width', valueWidth);
      row.baseline.attr('x1', geometry.left).attr('x2', geometry.right).attr('y1', y + barHeight).attr('y2', y + barHeight);
      row.bar.attr('x', geometry.left).attr('y', y).attr('height', barHeight);
    });
    axis.attr('transform', `translate(0,${height - 32})`);
    render();
  }
  function render() {
    if (destroyed || !geometry) return;
    const values = valuesAt(elapsed);
    // A smooth maximum avoids the velocity kink when departures overtake accidents.
    scale.domain([0, Math.hypot(Math.ceil(first.fatalAccidents * 1.2), values.departures * 1.08)]);
    rows.forEach(row => {
      const display = integer(Math.round(values[row.key]));
      const forceValue = !running || lastFrame === null || elapsed === END || elapsed === IMPACT_END;
      if (display !== row.display && (forceValue || elapsed - row.lastValueTime >= 80)) {
        row.flow.animated = !reducedMotion.matches && elapsed > 0;
        row.flow.update(Math.round(values[row.key]));
        row.value.attr('data-value', Math.round(values[row.key]));
        row.display = display;
        row.lastValueTime = elapsed;
      }
      row.bar.attr('width', scale(values[row.key]) - scale(0));
    });
    const targetTicks = new Set(scale.ticks(geometry.width < 600 ? 4 : 6).filter(Number.isInteger));
    const dt = lastFrame === null ? 0 : Math.max(0, elapsed - lastFrame);
    const fade = 1 - Math.exp(-dt / 95);
    // Keep tick identity through rescaling. Positions follow the same frame clock
    // as the bars; density changes crossfade rather than deleting labels at once.
    for (const value of targetTicks) if (!tickOpacity.has(value)) tickOpacity.set(value, lastFrame === null ? 1 : 0);
    for (const [value, opacity] of tickOpacity) {
      const next = opacity + ((targetTicks.has(value) ? 1 : 0) - opacity) * fade;
      if (!targetTicks.has(value) && next < .015) tickOpacity.delete(value);
      else tickOpacity.set(value, next);
    }
    axis.call(axisRenderer.tickValues([...tickOpacity.keys()].sort((a,b) => a-b)));
    axis.selectAll('.tick').attr('opacity', value => {
      const x = scale(value);
      return x > geometry.right + 1 ? 0 : tickOpacity.get(value);
    });
    lastFrame = elapsed;
    if (values.year !== displayedYear) {
      intervalEnd.attr('hidden', values.year === first.year ? true : null);
      yearFlow.animated = !reducedMotion.matches && elapsed > 0;
      yearFlow.update(values.year);
      displayedYear = values.year;
    }
    root.attr('data-end-year', values.year);
    const nextPhase = elapsed >= END ? 'complete' : elapsed >= EXPANSION_START ? 'expanding' : elapsed >= IMPACT_END ? 'hold' : elapsed < DEPARTURE_START ? 'accidents' : 'departures';
    if (phase !== nextPhase) {
      root.attr('data-phase', nextPhase).attr('data-impact', String(elapsed >= IMPACT_END));
      yearIntro.attr('aria-hidden', String(elapsed < IMPACT_END));
      phase = nextPhase;
    }
    conclusion.style('opacity', smooth((elapsed - DEPARTURE_START) / 600));
    calloutGroup.style('opacity', smooth((elapsed - IMPACT_END) / 400));
    const introProgress = smooth((elapsed - IMPACT_END) / 600);
    yearIntro.style('opacity', introProgress).style('transform', `translateY(${6 * (1 - introProgress)}px)`);
    if (elapsed >= IMPACT_END) {
      const key = `${Math.round(values.fatalAccidents)}:${geometry.width}:${geometry.height}`;
      if (key !== calloutKey) {
        makeCallout.annotations([{
          note: { title: `${integer(Math.round(values.fatalAccidents))} fatal accidents`, label: 'Less than 1 pixel', wrap: geometry.width < 600 ? 110 : 170, padding: 8 },
          x: scale(values.fatalAccidents), y: geometry.barY + geometry.barHeight / 2,
          dx: geometry.width < 600 ? 140 : 180, dy: 0,
          connector: { end: 'dot', endScale: .5 },
        }]);
        calloutGroup.call(makeCallout);
        calloutKey = key;
      }
    }
    const atBoundary = elapsed === 0 || elapsed >= stageLimit;
    const label = running || atBoundary ? 'Pause' : 'Resume';
    if (pause.text() !== label) pause.text(label);
    pause.property('disabled', atBoundary || reducedMotion.matches);
    const action = elapsed < accidentEnd ? 'Count the fatal accidents' : elapsed < departureEnd ? 'Count the departures' : 'Move through the years';
    if (advance.text() !== action) advance.text(action);
    advance.property('disabled', running).attr('hidden', elapsed >= END ? true : null);
    root.attr('data-awaiting-action', String(!running && atBoundary && elapsed < END));
  }
  function stop() { clock?.stop(); running = false; render(); }
  function play() {
    if (!active || destroyed || running || elapsed >= stageLimit || document.hidden) return;
    if (reducedMotion.matches) { elapsed = stageLimit; lastFrame = null; tickOpacity.clear(); render(); return; }
    running = true;
    const from = elapsed;
    clock = timer(time => {
      elapsed = Math.min(stageLimit, from + time);
      if (elapsed === stageLimit) { clock.stop(); running = false; }
      render();
    });
    render();
  }
  function advanceStage() {
    if (running) return;
    if (elapsed < accidentEnd) stageLimit = accidentEnd;
    else if (elapsed < departureEnd) { elapsed = Math.max(elapsed, DEPARTURE_START); stageLimit = departureEnd; }
    else { elapsed = Math.max(elapsed, EXPANSION_START); stageLimit = END; }
    play();
  }
  function restart() {
    stop(); elapsed = 0; stageLimit = accidentEnd; phase = ''; lastFrame = null; tickOpacity.clear();
    rows.forEach(row => { row.lastValueTime = -Infinity; });
    render();
  }

  function onVisibility() { if (document.hidden) { wasRunning = running; stop(); } else if (wasRunning) play(); }
  function onMotion() { if (reducedMotion.matches && running) { stop(); elapsed = stageLimit; lastFrame = null; tickOpacity.clear(); render(); } }
  const observer = new ResizeObserver(layout);
  observer.observe(plot.node());
  window.addEventListener('resize', layout);
  document.addEventListener('visibilitychange', onVisibility);
  reducedMotion.addEventListener('change', onMotion);
  layout();
  return {
    resize: layout,
    setActive(value) { if (value === active) return; active = value; if (active) restart(); else stop(); },
    destroy() { stop(); destroyed = true; observer.disconnect(); window.removeEventListener('resize', layout); document.removeEventListener('visibilitychange', onVisibility); reducedMotion.removeEventListener('change', onMotion); root.remove(); },
  };
}
