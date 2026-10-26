import { axisLeft, easeCubicInOut, format, line, scaleBand, scaleLinear, select } from 'd3';
import './decade-trend.css';

// Timing remains provisional while the motion direction is reviewed.
const motion = { revealUnitMs: 1600, holdMs: 2000 };
const beats = [
  { end: 3, period: '1950s–1970s', title: 'The decline did not start immediately.', text: 'Recorded crashes rise from 688 in the 1950s to a peak of 923 in the 1970s. First, establish the longer view.' },
  { end: 7, period: '1980s–2010s', title: 'Technological innovations made flying even safer.', text: 'Ground-proximity warnings and crew resource management added layers of protection. Recorded crashes fell in every completed decade after the 1970s peak, reaching 269 in the 2010s — 71% fewer.', context: true },
  { end: 10, period: 'The full view · 1950–2024', title: 'A long decline. An unfinished decade.', text: 'The bars become a line. Its dashed final segment leads to 44 recorded crashes in 2020–2024: five years only, not a comparable ten-year total. Counts alone do not measure risk per flight.' },
];
export async function mountDecadeTrend(container) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/decade-trend.json`);
  if (!response.ok) throw new Error('Trend data unavailable');
  const data = await response.json();
  if (data.rows.length !== 8 || data.rows.some(d => !Number.isSafeInteger(d.count))) throw new Error('Invalid decade counts');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = false, running = false, stage = 0, progress = 0, started = false, lastStage = -1;
  let auto = false, autoPaused = false, advanceTimer = null;
  const root = select(container).append('div').attr('class', 'decade-trend');
  const grid = root.append('div').attr('class', 'decade-trend__grid');
  const plot = grid.append('div').attr('class', 'decade-trend__plot');
  plot.append('p').attr('class', 'decade-trend__measure').text('Recorded crashes · absolute count');
  const svg = plot.append('svg').attr('viewBox', '0 0 900 390').attr('role', 'img').attr('aria-label', 'Recorded scheduled revenue flight crashes by decade, worldwide, 1950–2024');
  svg.append('desc').text('Counts: 1950s 688; 1960s 704; 1970s 923; 1980s 711; 1990s 624; 2000s 365; 2010s 269. A separate partial decade, 2020–2024, has 44. Fixed zero baseline. Archive records include fatal and nonfatal crashes.');
  const x = scaleBand().domain(data.rows.map(d => d.label)).range([60, 875]).padding(.32);
  const y = scaleLinear().domain([0, 1000]).range([330, 26]);
  svg.append('g').attr('class', 'decade-trend__axis').attr('transform', 'translate(55,0)').call(axisLeft(y).tickValues([0, 250, 500, 750, 1000]).tickSize(-820).tickFormat(format(',d'))).call(g => g.select('.domain').remove());
  svg.append('line').attr('x1', 60).attr('x2', 875).attr('y1', 330).attr('y2', 330).attr('stroke', 'var(--bs-body-color)');
  svg.append('line').attr('x1', x('2020–24') - 16).attr('x2', x('2020–24') - 16).attr('y1', 20).attr('y2', 370).attr('stroke', 'var(--bs-border-color)').attr('stroke-dasharray', '4 5');
  const marks = svg.append('g').selectAll('g').data(data.rows, d => d.decade).join('g');
  const bars = marks.append('rect').attr('x', d => x(d.label)).attr('width', x.bandwidth()).attr('y', y(0)).attr('height', 0).attr('fill', d => d.partial ? 'var(--bs-body-bg)' : 'var(--viz-series-1)').attr('stroke', 'var(--viz-series-1)').attr('stroke-width', d => d.partial ? 2 : 0).attr('stroke-dasharray', d => d.partial ? '4 3' : null);
  const values = marks.append('text').attr('class', 'decade-trend__value').attr('x', d => x(d.label) + x.bandwidth() / 2).attr('text-anchor', 'middle').text(d => d.count);
  marks.append('text').attr('class', 'decade-trend__tick').attr('x', d => x(d.label) + x.bandwidth() / 2).attr('y', 354).attr('text-anchor', 'middle').text(d => d.label);
  marks.filter(d => d.partial).append('text').attr('class', 'decade-trend__partial').attr('x', d => x(d.label) + x.bandwidth() / 2).attr('y', 375).attr('text-anchor', 'middle').text('5 years only');
  const trendLine = svg.append('path').attr('class', 'decade-trend__line').attr('fill', 'none')
    .attr('stroke', 'var(--viz-series-1)').attr('stroke-width', 3).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round')
    .attr('pathLength', 1).attr('stroke-dasharray', '1 1');
  const partialLine = svg.append('path').attr('class', 'decade-trend__partial-line')
    .attr('fill', 'none').attr('stroke', 'var(--viz-series-1)').attr('stroke-width', 3).attr('stroke-dasharray', '6 6');
  const points = svg.append('g').selectAll('circle').data(data.rows.filter(d => !d.partial)).join('circle')
    .attr('r', 5).attr('fill', 'var(--viz-series-1)').attr('stroke', 'var(--bs-body-bg)').attr('stroke-width', 2);
  const partialPoint = svg.append('path').attr('class', 'decade-trend__partial-point').attr('d', 'M0,-6L6,0L0,6L-6,0Z')
    .attr('fill', 'var(--bs-body-bg)').attr('stroke', 'var(--viz-series-1)').attr('stroke-width', 2);
  const note = grid.append('aside').attr('class', 'decade-trend__note').attr('aria-live', 'polite');
  const period = note.append('p').attr('class', 'eyebrow');
  const headline = note.append('h2');
  const copy = note.append('p');
  const context = note.append('p').attr('class', 'decade-trend__context').text('Historical context; this count series does not isolate the causes of the decline.');
  const transport = root.append('div').attr('class', 'decade-trend__transport');
  const status = transport.append('span');
  const controls = transport.append('div');
  const pause = controls.append('button').attr('type', 'button').attr('class', 'text-button').text('Pause').on('click', () => {
    if (running || advanceTimer !== null) stop();
    else { autoPaused = false; if (progress < beats[stage].end) play(); else queueAdvance(); }
  });
  controls.append('button').attr('type', 'button').attr('class', 'text-button').text('Replay').on('click', () => { stop(); autoPaused = false; stage = 0; progress = 0; render(); play(); });
  root.on('keydown', event => { if (event.target.closest('button, summary, a') && [' ', 'Enter'].includes(event.key)) event.stopPropagation(); });
  const source = root.append('details').attr('class', 'evidence-source decade-trend__source');
  source.append('summary').text('Source, scope & exact counts');
  source.append('p').html('Source: <a href="https://huggingface.co/datasets/MauroPello/planecrashdata" target="_blank" rel="noreferrer">MauroPello · PlaneCrashData</a> (CC BY 4.0), retained snapshot. Worldwide records with flight_type exactly “Scheduled Revenue Flight”; includes fatal and nonfatal outcomes. Separately classified cargo and charter records are excluded. This changes geography and measure from the previous U.S. fatal-accident chart. Reporting and classification may vary over time; archive counts are not a complete census or a measure of risk per flight. 2025 is excluded because this category stops in July.');
  source.append('p').html('Historical context: <a href="https://www.ntsb.gov/safety/safety-studies/Documents/SR9801.pdf" target="_blank" rel="noreferrer">NTSB · Ground Proximity Warning Systems</a>; <a href="https://asrs.arc.nasa.gov/publications/callback/cb_370.html" target="_blank" rel="noreferrer">NASA · Crew Resource Management</a>. These milestones do not quantify their contribution to this worldwide trend.');
  const table = source.append('table');
  table.append('caption').text('Recorded crashes in the selected archive category');
  table.append('thead').append('tr').selectAll('th').data(['Period', 'Years', 'Crashes']).join('th').attr('scope', 'col').text(d => d);
  table.append('tbody').selectAll('tr').data(data.rows).join('tr').selectAll('td').data(d => [d.partial ? '2020–2024 (partial decade)' : `${d.start}–${d.end}`, d.years, d.count]).join('td').text(d => d);
  function notify() { container.dispatchEvent(new CustomEvent('storybeat', { bubbles: true })); }
  function render() {
    const connection = Math.max(0, Math.min(1, progress - 8));
    const fade = Math.max(0, Math.min(1, progress - 9));
    bars.attr('opacity', 1 - fade);
    trendLine.attr('d', line().x(d => x(d.label) + x.bandwidth() / 2).y(d => y(d.count))(data.rows.filter(d => !d.partial)))
      .attr('stroke-dashoffset', 1 - Math.min(1, connection / .85)).attr('opacity', connection > 0 ? 1 : 0);
    partialLine.attr('d', line().x(d => x(d.label) + x.bandwidth() / 2).y(d => y(d.count))(data.rows.slice(6)))
      .attr('opacity', Math.max(0, (connection - .85) / .15));
    points.attr('cx', d => x(d.label) + x.bandwidth() / 2).attr('cy', d => y(d.count))
      .attr('opacity', (d, i) => connection > 0 && connection / .85 >= i / 6 ? 1 : 0);
    partialPoint.attr('transform', `translate(${x('2020–24') + x.bandwidth() / 2},${y(data.rows[7].count)})`).attr('opacity', Math.max(0, (connection - .85) / .15));
    bars.attr('y', (d, i) => y(d.count * Math.max(0, Math.min(1, progress - i)))).attr('height', (d, i) => y(0) - y(d.count * Math.max(0, Math.min(1, progress - i))));
    values.attr('y', d => y(d.count) - 12).attr('opacity', (d, i) => progress >= i + 1 ? 1 : 0);
    if (lastStage !== stage) {
      period.text(beats[stage].period); headline.text(beats[stage].title); copy.text(beats[stage].text);
      context.attr('hidden', beats[stage].context ? null : true);
      lastStage = stage;
    }
    const betweenBeats = auto && stage < beats.length - 1;
    pause.text(running || advanceTimer !== null ? 'Pause' : 'Resume').property('disabled', progress >= beats[stage].end && !betweenBeats);
    status.text(running ? (stage === 2 ? progress < 8 ? 'Adding the partial decade…' : progress < 9 ? 'Connecting the counts…' : 'Letting the bars fall away…' : 'Revealing the decades…') : stage === 2 && progress === 10 ? 'The full view · 1950–2024' : advanceTimer !== null ? 'Next beat in 2 seconds…' : auto && autoPaused ? 'Auto paused · Resume when ready' : 'A moment to look · Next continues');
  }
  function clearAdvance() {
    if (advanceTimer !== null) clearTimeout(advanceTimer);
    advanceTimer = null;
  }
  function queueAdvance() {
    clearAdvance();
    if (auto && !autoPaused && active && !running && progress >= beats[stage].end && stage < beats.length - 1) {
      advanceTimer = setTimeout(() => {
        advanceTimer = null;
        if (!active || !auto || autoPaused) return;
        stage++; play();
      }, motion.holdMs);
    }
    render();
  }
  function finish() { running = false; queueAdvance(); notify(); }
  function stop() { clearAdvance(); autoPaused = true; root.interrupt('reveal'); running = false; render(); notify(); }
  function play() {
    if (!active || progress >= beats[stage].end) return;
    clearAdvance(); running = true; render(); notify();
    const start = progress, end = beats[stage].end;
    if (reduced.matches) { progress = end; finish(); return; }
    root.transition('reveal').duration((end - start) * motion.revealUnitMs).ease(easeCubicInOut).tween('decades', () => t => { progress = start + (end - start) * t; render(); }).on('end', finish);
  }
  function resize() {
    const width = Math.max(580, Math.min(1000, plot.node().clientWidth));
    svg.attr('viewBox', `0 0 ${width} 390`);
    x.range([55, width - 12]);
    svg.select('.decade-trend__axis').call(axisLeft(y).tickValues([0, 250, 500, 750, 1000]).tickSize(-(width - 67)).tickFormat(format(',d'))).call(g => g.select('.domain').remove());
    const lines = svg.selectAll(':scope > line');
    lines.filter((d, i) => i === 0).attr('x2', width - 12);
    lines.filter((d, i) => i === 1).attr('x1', x('2020–24') - 10).attr('x2', x('2020–24') - 10);
    bars.attr('x', d => x(d.label)).attr('width', x.bandwidth());
    marks.selectAll('text').attr('x', d => x(d.label) + x.bandwidth() / 2);
    render();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(plot.node());
  render();
  return {
    resize,
    setPlaybackMode(value) {
      auto = value; autoPaused = false; clearAdvance(); render(); notify();
      if (auto && active) { if (progress < beats[stage].end && !running) play(); else queueAdvance(); }
    },
    setActive(value) { if (active === value) return; active = value; if (!value) stop(); else if (!started) { started = true; autoPaused = false; play(); } },
    getNavigationState() { return { step: stage + 1, total: beats.length, running, action: progress < beats[stage].end ? (stage === 2 ? 'Connect the counts' : 'Reveal the decades') : stage === 2 ? 'Continue the story' : beats[stage + 1].period }; },
    nextBeat() { if (running) return true; clearAdvance(); autoPaused = false; if (progress < beats[stage].end) { play(); return true; } if (stage === 2) return false; stage++; play(); return true; },
    previousBeat() { if (stage === 0 && progress === 0) return false; stop(); if (stage > 0) { stage--; progress = beats[stage].end; } else progress = 0; render(); notify(); return true; },
    showLastBeat() { stop(); stage = 2; progress = 10; started = true; render(); notify(); },
  };
}
