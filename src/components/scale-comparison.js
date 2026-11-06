import { axisBottom, format, scaleLinear, select, timer } from 'd3';
import { annotation, annotationCalloutElbow } from 'd3-svg-annotation';
import 'number-flow';
import { continuous } from 'number-flow/plugins';
import './scale-comparison.css';
import { createBeatPlayback } from './beat-playback.js';

const integer = format(',d');
const compact = format('~s');
const ACCIDENT_MS = 2000;
const DEPARTURE_MS = 7000;
const YEAR_MS = 650;
const COIN_DELAY_MS = 450;
const COIN_FLIP_MS = 170;
const COIN_STAGGER_MS = 185;
const COIN_END = COIN_DELAY_MS + 23 * COIN_STAGGER_MS + COIN_FLIP_MS;
const beatLabels = ['0','1','2','2.5','3','3.5','4','5','6'];
const holds = [850, 350, 1100, 650, 1500, 1600, 2600];
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
  const YEAR_END = (cumulative.length - 1) * YEAR_MS;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const root = select(container).append('div').attr('class', 'scale-comparison').attr('data-phase', 'initial');
  root.append('p').attr('class','scale-comparison__scope').text('U.S. scheduled airline services · NTSB');
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
  const commentary = root.append('div').attr('class','scale-comparison__commentary').attr('aria-live','polite');
  const storyCopy = commentary.append('div').attr('class','scale-comparison__story-copy');
  const oneYear = storyCopy.append('p').attr('class','scale-comparison__one-year').text('That’s only one year.');
  const addMore = storyCopy.append('p').attr('class','scale-comparison__add-more').text('Let’s add more.');
  const tiny = storyCopy.append('p').attr('class','scale-comparison__tiny').text('Fatal accidents are a tiny fraction of departures.');
  const analogy = commentary.append('div').attr('class','scale-comparison__analogy');
  const analogyCopy = analogy.append('div');
  analogyCopy.append('h2').text('That’s less likely than getting 24 heads in a row…');
  const analogyDetail = analogyCopy.append('p').attr('aria-live','off');
  const coins = analogy.append('div').attr('class','scale-comparison__coins').attr('role','img').attr('aria-live','off').attr('aria-label','24 consecutive heads with a fair coin');
  const coin = coins.selectAll('.scale-comparison__coin').data(Array.from({length:24},(_,i)=>i)).join('span')
    .attr('class','scale-comparison__coin').attr('aria-hidden','true');
  const coinInner = coin.append('span').attr('class','scale-comparison__coin-inner');
  coinInner.append('span').attr('class','scale-comparison__coin-back');
  coinInner.append('span').attr('class','scale-comparison__coin-head').text('H');
  const question = commentary.append('p').attr('class','scale-comparison__question').text('What does the longer, worldwide picture look like?');
  const transport = root.append('div').attr('class', 'scale-comparison__transport');
  const controls = transport.append('div');
  const pause = controls.append('button').attr('type', 'button').attr('class', 'text-button').text('Pause').on('click', () => {
    if (motionRunning || playback.status === 'waiting') playback.hold();
    else if (!playback.mode && stage >= 5 && motionIncomplete()) { playback.engage(); play(); }
    else playback.togglePause();
  });
  controls.append('button').attr('type', 'button').attr('class', 'text-button').text('Replay').on('click', restart);
  const source = root.append('details').attr('class','evidence-source scale-comparison__source');
  source.append('summary').text('Source & exact counts');
  source.append('p').html(`<a href="${data.meta.sourceUrl}" target="_blank" rel="noreferrer">NTSB · U.S. Civil Aviation Accident Statistics, Table 6</a>. U.S. Part 121 scheduled service, 2005–2024. Fatal accidents include ground fatalities; this is an event count per departure, not a passenger’s probability of dying. The animated intermediate counts interpolate between cumulative source years.`);
  source.append('p').html('The fair-coin comparison uses independent tosses: 2<sup>24</sup> = 16,777,216 equally likely sequences; exactly one is all heads. It illustrates scale, not an exact equality with the observed accident rate. <a href="https://openstax.org/books/statistics/pages/3-2-independent-and-mutually-exclusive-events" target="_blank" rel="noreferrer">Independent-event multiplication rule · OpenStax</a>.');
  const table = source.append('table');
  table.append('caption').text('Annual source counts; the chart accumulates these years');
  table.append('thead').append('tr').selectAll('th').data(['Year','Fatal accidents','Departures']).join('th').attr('scope','col').text(d=>d);
  table.append('tbody').selectAll('tr').data(data.rows).join('tr').selectAll('td').data(d=>[d.year,integer(d.fatalAccidents),integer(d.departures)]).join('td').text(d=>d);
  root.on('keydown', event => {
    if (event.target.closest('button, summary, a') && ['Enter',' '].includes(event.key)) event.stopPropagation();
  });

  let stage = 0, accidentProgress = 0, departureProgress = 0, yearElapsed = 0, coinElapsed = 0;
  let clock, motionRunning = false, active = false, destroyed = false;
  let phase = '', lastFrame = null, lastNavigationKey = '', lastCaption = -1;
  const history = [];
  let geometry;
  let displayedYear = first.year;
  const tickOpacity = new Map();
  const scale = scaleLinear();
  const axisRenderer = axisBottom(scale).tickFormat(value => value < 1000 ? integer(value) : compact(value)).tickSizeOuter(0);
  const conclusion = select(container.closest('main')).select('.scale-comparison__conclusion');
  const motionIncomplete = () => stage === 1 ? accidentProgress < 1 : stage === 3 ? departureProgress < 1
    : stage >= 5 && (yearElapsed < YEAR_END || stage === 7 && coinElapsed < COIN_END);
  const countBeat = () => stage === 1 || stage === 3 || stage === 8;
  const complete = () => stage === 8 && yearElapsed >= YEAR_END;
  // Auto ends at the comparison. Only the reader can open the closing question.
  const autoComplete = () => stage >= 7 && !motionIncomplete();

  function valuesAt() {
    if (yearElapsed <= 0) return {
      year:first.year,
      fatalAccidents:first.fatalAccidents * smooth(accidentProgress),
      departures:departureProgress >= 1 ? first.departures : Math.expm1(Math.log1p(first.departures) * smooth(departureProgress)),
    };
    const step = Math.min(cumulative.length-2,Math.floor(yearElapsed/YEAR_MS));
    const from = cumulative[step], to = cumulative[step+1];
    const progress = smooth((yearElapsed-step*YEAR_MS)/YEAR_MS);
    return {
      year:to.year,
      fatalAccidents:from.fatalAccidents+(to.fatalAccidents-from.fatalAccidents)*progress,
      departures:from.departures+(to.departures-from.departures)*progress,
    };
  }
  function layout() {
    if (destroyed) return;
    const width = Math.max(260, plot.node().clientWidth);
    const height = width < 600 ? 220 : window.innerHeight < 900 ? 240 : 300;
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
    const values = valuesAt();
    const frameTime = accidentProgress*ACCIDENT_MS+departureProgress*DEPARTURE_MS+yearElapsed;
    // A smooth maximum avoids the velocity kink when departures overtake accidents.
    scale.domain([0, Math.hypot(Math.ceil(first.fatalAccidents * 1.2), values.departures * 1.08)]);
    rows.forEach(row => {
      const display = integer(Math.round(values[row.key]));
      const forceValue = !motionRunning || lastFrame === null || yearElapsed === YEAR_END || departureProgress === 1 && yearElapsed === 0;
      if (display !== row.display && (forceValue || frameTime - row.lastValueTime >= 80)) {
        row.flow.animated = !reducedMotion.matches && frameTime > 0;
        row.flow.update(Math.round(values[row.key]));
        row.value.attr('data-value', Math.round(values[row.key]));
        row.display = display;
        row.lastValueTime = frameTime;
      }
      row.bar.attr('width', scale(values[row.key]) - scale(0));
    });
    const targetTicks = new Set(scale.ticks(geometry.width < 600 ? 4 : 6).filter(Number.isInteger));
    // Resting axes settle their tick crossfade instead of freezing ghost labels.
    if (!motionRunning) { tickOpacity.clear();for (const tick of targetTicks) tickOpacity.set(tick,1); }
    const dt = lastFrame === null ? 0 : Math.max(0, frameTime - lastFrame);
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
    lastFrame = frameTime;
    if (values.year !== displayedYear) {
      intervalEnd.attr('hidden', values.year === first.year ? true : null);
      yearFlow.animated = !reducedMotion.matches && frameTime > 0;
      yearFlow.update(values.year);
      displayedYear = values.year;
    }
    root.attr('data-end-year', values.year);
    const nextPhase = stage === 0 ? 'initial' : stage === 1 ? 'accidents' : stage === 2 ? 'perspective' : stage === 3 ? 'departures' : stage === 4 ? 'hold' : complete() ? 'complete' : 'expanding';
    if (phase !== nextPhase) { root.attr('data-phase',nextPhase);phase=nextPhase; }
    root.attr('data-impact',String(stage >= 4)).attr('data-beat',beatLabels[stage]).attr('data-year-elapsed',yearElapsed);
    conclusion.classed('is-visible',stage >= 2).attr('aria-hidden',String(stage < 2));
    calloutGroup.style('opacity',stage >= 4 ? 1 : 0);
    if (stage !== lastCaption) {
      lastCaption = stage;
      storyCopy.classed('is-visible',stage >= 4 && stage <= 6).attr('aria-hidden',String(stage < 4 || stage > 6));
      oneYear.classed('is-visible',stage >= 4);
      addMore.classed('is-visible',stage >= 5);
      tiny.classed('is-visible',stage >= 6);
      analogy.classed('is-visible',stage === 7).attr('aria-hidden',String(stage !== 7));
      question.classed('is-visible',stage === 8).attr('aria-hidden',String(stage !== 8));
    }
    const departuresPerAccident = values.fatalAccidents > 0 ? values.departures/values.fatalAccidents : null;
    if (stage === 7) analogyDetail.text(`24 fair-coin tosses, all heads: 1 in 16.8 million. Across 2005–2024: 1 fatal accident per ${(totals.departures/totals.fatalAccidents/1e6).toFixed(1)} million departures.`);
    const coinProgress = i => clamp((coinElapsed - COIN_DELAY_MS - i * COIN_STAGGER_MS) / COIN_FLIP_MS);
    const heads = Math.max(0,Math.min(24,Math.floor((coinElapsed-COIN_DELAY_MS-COIN_FLIP_MS)/COIN_STAGGER_MS)+1));
    coin.attr('data-face',i=>coinProgress(i) === 1 ? 'heads' : coinProgress(i) > 0 ? 'flipping' : 'pending');
    coinInner.style('transform',i=>`rotateY(${180*smooth(coinProgress(i))}deg)`);
    coins.attr('aria-label',`${heads} of 24 consecutive heads revealed with a fair coin`);
    root.attr('data-heads',heads).attr('data-coin-elapsed',coinElapsed);
    root.node().comparisonData = { beat:beatLabels[stage], year:values.year, fatalAccidents:values.fatalAccidents, departures:values.departures, departuresPerAccident, coinSequences:2**24, yearElapsed, coinElapsed, heads };
    if (stage >= 4) {
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
    const playbackStatus = playback.status;
    root.attr('data-playback',playbackStatus);
    const label = motionRunning || playbackStatus === 'waiting' ? 'Pause' : 'Resume';
    if (pause.text() !== label) pause.text(label);
    pause.property('disabled',autoComplete());
    const navigationKey = `${stage}:${countBeat() && motionRunning}:${countBeat() && motionIncomplete()}:${complete()}`;
    if (navigationKey !== lastNavigationKey) {
      lastNavigationKey=navigationKey;
      container.dispatchEvent(new CustomEvent('storybeat',{bubbles:true}));
    }
    root.attr('data-awaiting-action',String(!motionRunning && !complete()));
    // Cumulative years continue underneath the timed commentary beats.
    if (!motionRunning && active && !document.hidden && playback.mode && playbackStatus === 'waiting' && stage >= 5 && motionIncomplete()) play();
  }
  function stop() { clock?.stop();motionRunning=false;render(); }
  function play() {
    if (!active || destroyed || motionRunning || !motionIncomplete() || document.hidden) return;
    if (reducedMotion.matches) { settleMotion();render();playback.settled();return; }
    motionRunning=true;
    let previousTime = 0;
    clock=timer(time=>{
      const elapsed = time-previousTime;
      previousTime=time;
      if (stage===1) accidentProgress=Math.min(1,accidentProgress+elapsed/ACCIDENT_MS);
      else if (stage===3) departureProgress=Math.min(1,departureProgress+elapsed/DEPARTURE_MS);
      else if (stage>=5) yearElapsed=Math.min(YEAR_END,yearElapsed+elapsed);
      if (stage===7) coinElapsed=Math.min(COIN_END,coinElapsed+elapsed);
      if (!motionIncomplete()) { clock.stop();motionRunning=false;render();playback.settled(); }
      else render();
    });
    render();
  }
  function settleMotion() {
    if (stage===1) accidentProgress=1;
    else if (stage===3) departureProgress=1;
    else if (stage>=5) yearElapsed=YEAR_END;
    if (stage===7) coinElapsed=COIN_END;
  }
  function finishBeat() {
    playback.engage();clock?.stop();motionRunning=false;settleMotion();
    lastFrame=null;tickOpacity.clear();rows.forEach(row=>{row.lastValueTime=-Infinity;});
    render();playback.settled();
  }
  function advanceStage() {
    if (stage>=beatLabels.length-1) return;
    history[stage+1]={accidentProgress,departureProgress,yearElapsed,coinElapsed};
    stage++;
    if (stage===7) coinElapsed=0;
    render();play();playback.settled();
  }
  function restart() {
    playback.engage();stop();stage=0;accidentProgress=0;departureProgress=0;yearElapsed=0;coinElapsed=0;
    history.length=0;phase='';lastFrame=null;tickOpacity.clear();
    rows.forEach(row=>{row.lastValueTime=-Infinity;});
    render();playback.settled();
  }
  function showAll(lastStage = Math.max(stage,7)) {
    clock?.stop();motionRunning=false;stage=lastStage;accidentProgress=1;departureProgress=1;yearElapsed=YEAR_END;coinElapsed=COIN_END;
    lastFrame=null;tickOpacity.clear();rows.forEach(row=>{row.lastValueTime=-Infinity;});render();
  }
  const playback = createBeatPlayback({
    state:()=>({running:(countBeat() || stage===7) && motionRunning,complete:autoComplete(),atBoundary:!(countBeat() || stage===7) || !motionIncomplete()}),
    play,pause:stop,advance:advanceStage,holdMs:()=>holds[stage],
    reduced:reducedMotion,showAll,changed:render,
  });
  const observer = new ResizeObserver(layout);
  observer.observe(plot.node());
  window.addEventListener('resize', layout);
  layout();
  return {
    resize: layout,
    finishBeat,
    showLastBeat() { playback.hold(); showAll(8); },
    setPlaybackMode: value => playback.setMode(value),
    getNavigationState() { return {step:stage+1,total:beatLabels.length,running:countBeat() && motionRunning,inProgress:countBeat() && motionIncomplete(),action:complete() ? 'Continue the story' : 'Reveal the next beat'}; },
    previousBeat() {
      if (!active || stage===0) return false;
      playback.hold();
      const prior=history[stage] || {accidentProgress:stage>1 ? 1 : 0,departureProgress:stage>3 ? 1 : 0,yearElapsed:0,coinElapsed:0};
      ({accidentProgress,departureProgress,yearElapsed,coinElapsed}=prior);
      stage--;lastFrame=null;tickOpacity.clear();rows.forEach(row=>{row.lastValueTime=-Infinity;});render();return true;
    },
    nextBeat() { if (!active || complete()) return false;playback.engage();advanceStage();return true; },
    setActive(value) { active = value; playback.setActive(value); },
    destroy() { playback.destroy(); destroyed = true; observer.disconnect(); window.removeEventListener('resize', layout); root.remove(); },
  };
}
