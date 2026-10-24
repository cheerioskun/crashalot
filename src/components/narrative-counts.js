import { axisBottom, axisLeft, bisector, format, line, max, pointer, scaleLinear, select } from 'd3';
import './narrative-counts.css';

// Uses the existing safety-chart specimen's documented D3 scale / axis / selection
// composition. Reviewed awesome-d3 and D3FC small multiples: a shared D3 scale is
// sufficient for these two aligned panels; no animation or chart engine is added.
// https://d3js.org/d3-scale/linear · https://d3js.org/d3-axis
let instance = 0;
let dataRequest;
const integer = format(',d');
const rate = format('.6f');
const nearest = bisector(d => d.year).center;
const measures = [
  { key: 'fatalAccidents', label: 'Fatal accidents', ticks: [0, 1, 2, 3], tick: integer, series: '1' },
  { key: 'ratePerMillion', label: 'Fatal accidents / million departures', ticks: [0, .1, .2, .3], tick: format('.1f'), series: '2' },
];

async function loadData() {
  dataRequest ??= fetch(`${import.meta.env.BASE_URL}data/safety-trend.json`).then(response => {
    if (!response.ok) throw new Error('Annual safety data could not be loaded.');
    return response.json();
  }).catch(error => { dataRequest = null; throw error; });
  const data = await dataRequest;
  if (!Array.isArray(data.rows) || data.rows.length !== 20 || data.rows.some((d, i) =>
    d.year !== 2005 + i || !Number.isInteger(d.fatalAccidents) || d.fatalAccidents < 0 ||
    !Number.isInteger(d.departures) || d.departures <= 0 ||
    !Number.isFinite(d.ratePerMillion) || Math.abs(d.ratePerMillion - d.fatalAccidents / d.departures * 1e6) > 1e-10
  )) throw new Error('The annual safety data did not pass validation.');
  return data;
}

/** Independent of Reveal; both mounts load the same retained, audited data. */
export async function mountCrashCounts(container) { return mount(container, false); }
export async function mountCountRateComparison(container) { return mount(container, true); }

async function mount(container, comparison) {
  if (!(container instanceof Element)) throw new TypeError('A chart container is required.');
  const data = await loadData();
  const rows = data.rows;
  const id = `narrative-counts-${++instance}`;
  let selected = rows[0];
  let x;
  let destroyed = false;
  const root = select(container).append('div')
    .attr('class', `narrative-counts${comparison ? ' narrative-counts--comparison' : ''}`);
  root.append('p').attr('class', 'narrative-counts__scope')
    .text('U.S. Part 121 air carriers · passenger + cargo · 2005–2024');
  const plot = root.append('div').attr('class', 'narrative-counts__plot');
  const svg = plot.append('svg').attr('class', 'narrative-counts__svg')
    .attr('role', 'img').attr('aria-labelledby', `${id}-title ${id}-description`);
  svg.append('title').attr('id', `${id}-title`).text(comparison
    ? 'Annual fatal accident counts and rates, shown on separate zero-based scales'
    : 'Annual fatal accidents, U.S. Part 121 air carriers, 2005–2024');
  svg.append('desc').attr('id', `${id}-description`)
    .text('Annual values fluctuate. There are 17 fatal accidents across 20 years; 10 years have zero observed fatal accidents. Use the year slider for exact counts, rates and departures, or expand the data table.');
  const panels = (comparison ? measures : [measures[0]]).map(measure => {
    const group = svg.append('g').attr('class', 'narrative-counts__panel')
      .attr('aria-hidden', 'true').style('--count-series', `var(--viz-series-${measure.series})`);
    return {
      ...measure, group,
      label: group.append('text').attr('class', 'narrative-counts__unit'),
      grid: group.append('g').attr('class', 'narrative-counts__grid'),
      axis: group.append('g').attr('class', 'narrative-counts__axis'),
      guide: group.append('line').attr('class', 'narrative-counts__guide'),
      path: comparison ? group.append('path').attr('class', 'narrative-counts__line') : null,
      stems: comparison ? null : group.append('g').selectAll('line').data(rows).join('line').attr('class', 'narrative-counts__stem'),
      dots: group.append('g').selectAll('circle').data(rows).join('circle').attr('class', 'narrative-counts__dot'),
      values: comparison ? null : group.append('g').selectAll('text').data(rows).join('text').attr('class', 'narrative-counts__value').text(d => d.fatalAccidents),
      focus: group.append('circle').attr('class', 'narrative-counts__focus').attr('r', 7),
    };
  });
  const yearAxis = svg.append('g').attr('class', 'narrative-counts__axis narrative-counts__years').attr('aria-hidden', 'true');
  const hit = svg.append('rect').attr('class', 'narrative-counts__hit').attr('aria-hidden', 'true');
  const inspection = root.append('div').attr('class', 'narrative-counts__inspection');
  const yearControl = inspection.append('div').attr('class', 'narrative-counts__year-control');
  const yearLabel = yearControl.append('label').attr('for', `${id}-year`);
  yearLabel.append('span').text('Inspect year');
  const yearValue = yearLabel.append('strong');
  const slider = yearControl.append('input').attr('type', 'range')
    .attr('id', `${id}-year`).attr('min', 2005).attr('max', 2024).attr('step', 1)
    .on('input', event => selectYear(rows[nearest(rows, +event.target.value)]));
  const readouts = [
    { key: 'fatalAccidents', label: 'fatal accidents', formatter: integer },
    { key: 'ratePerMillion', label: 'per million departures', formatter: rate },
    { key: 'departures', label: 'departures', formatter: integer },
  ].map(metric => {
    const element = inspection.append('div').attr('class', `narrative-counts__metric narrative-counts__metric--${metric.key}`);
    const value = element.append('strong');
    element.append('span').text(metric.label);
    return { ...metric, value };
  });
  const note = root.append('p').attr('class', 'narrative-counts__note');
  const details = root.append('details').attr('class', 'narrative-counts__details');
  details.append('summary').text('NTSB / FAA · definitions, sources & all 20 years');
  details.append('p').text('Fatal accidents include deaths on the ground. These are accident events, not passenger deaths or necessarily destroyed aircraft. U.S. operators under 14 CFR Part 121, scheduled and nonscheduled service, worldwide; includes passenger and cargo. The observation window ends in 2024.');
  details.append('p').text(comparison
    ? 'The panels share a year axis but have different vertical units. Compare patterns within each scale, not heights between panels. Rate = fatal accidents ÷ departures × 1,000,000. Annual rates fluctuate; connecting lines do not create observations between years.'
    : 'Each stem begins at zero; a hollow point at zero means no fatal accidents observed that year. Rate = fatal accidents ÷ departures × 1,000,000. Counts are exact, displayed rates are rounded. Zero observed events does not establish zero underlying risk.');
  details.append('p').append('a').attr('href', data.meta.sourceUrl).attr('target', '_blank').attr('rel', 'noopener noreferrer')
    .text('NTSB 2005–2024 workbook, Table 5 · FAA departure exposure');
  const tableRegion = details.append('div').attr('class', 'narrative-counts__table-wrap')
    .attr('tabindex', '0').attr('role', 'region').attr('aria-label', 'Annual accident data, scrollable table');
  const table = tableRegion.append('table');
  table.append('caption').text('Exact source counts and departures. Rates rounded to six decimal places.');
  table.append('thead').append('tr').selectAll('th')
    .data(['Year', 'Fatal accidents', 'Departures', 'Fatal accidents / million departures'])
    .join('th').attr('scope', 'col').text(d => d);
  const tableRows = table.append('tbody').selectAll('tr').data(rows).join('tr');
  tableRows.append('th').attr('scope', 'row').text(d => d.year);
  tableRows.append('td').text(d => integer(d.fatalAccidents));
  tableRows.append('td').text(d => integer(d.departures));
  tableRows.append('td').text(d => format('.6f')(d.ratePerMillion));

  // Native controls keep their keyboard behavior without advancing the slide.
  root.on('keydown', event => {
    if (event.target.closest('input, summary, a, [tabindex]')) event.stopPropagation();
  });
  function selectYear(row) { selected = row; updateSelection(); }
  function updateSelection() {
    yearValue.text(selected.year);
    slider.property('value', selected.year).attr('aria-valuetext',
      `${selected.year}: ${selected.fatalAccidents} fatal accidents; ${rate(selected.ratePerMillion)} per million; ${integer(selected.departures)} departures`);
    readouts.forEach(metric => metric.value.text(metric.formatter(selected[metric.key])));
    note.text(selected.fatalAccidents === 0
      ? 'Zero observed fatal accidents in this year does not mean zero underlying risk.'
      : comparison ? 'Same events, different denominator. Each panel has its own labeled vertical scale.'
        : 'Counts include fatal accidents on the ground. Hover or use the slider to inspect a year.');
    if (!x) return;
    panels.forEach(panel => {
      panel.guide.attr('x1', x(selected.year)).attr('x2', x(selected.year));
      panel.focus.attr('cx', x(selected.year)).attr('cy', panel.y(selected[panel.key]));
      panel.dots.classed('is-selected', d => d.year === selected.year);
      panel.values?.classed('is-selected', d => d.year === selected.year);
    });
  }
  function render() {
    if (destroyed) return;
    const width = plot.node().getBoundingClientRect().width;
    if (width < 100) return;
    const height = window.innerHeight < 780 ? 224 : 282;
    const left = width < 600 ? 36 : 42;
    const right = 20;
    const bottom = height - 28;
    x = scaleLinear().domain([2005, 2024]).range([left + 12, width - right - 12]);
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    const panelHeight = comparison ? (bottom - 30) / 2 : bottom;
    panels.forEach((panel, index) => {
      const top = comparison ? index * (panelHeight + 30) : 0;
      const baseline = comparison ? top + panelHeight : bottom;
      panel.y = scaleLinear().domain([0, panel.key === 'fatalAccidents' ? Math.max(3, max(rows, d => d.fatalAccidents)) : .3])
        .range([baseline, top + (comparison ? 30 : 42)]);
      panel.label.attr('x', left).attr('y', top + 13).text(comparison
        ? `${index === 0 ? 'ABSOLUTE' : 'RELATIVE'}  /  ${index === 0 ? 'Fatal accidents' : 'Fatal accidents per million departures'}`
        : 'FATAL ACCIDENTS');
      panel.grid.attr('transform', `translate(${left},0)`)
        .call(axisLeft(panel.y).tickValues(panel.ticks).tickSize(-(width - left - right)).tickFormat(''));
      panel.grid.select('.domain').remove();
      panel.axis.attr('transform', `translate(${left},0)`)
        .call(axisLeft(panel.y).tickValues(panel.ticks).tickSize(0).tickPadding(10).tickFormat(panel.tick));
      panel.axis.select('.domain').remove();
      panel.guide.attr('y1', top + 25).attr('y2', baseline);
      panel.stems?.attr('x1', d => x(d.year)).attr('x2', d => x(d.year))
        .attr('y1', baseline).attr('y2', d => panel.y(d[panel.key]));
      panel.path?.attr('d', line().x(d => x(d.year)).y(d => panel.y(d[panel.key]))(rows));
      panel.dots.attr('cx', d => x(d.year)).attr('cy', d => panel.y(d[panel.key]))
        .attr('r', comparison ? 3.5 : 5).classed('is-zero', d => d[panel.key] === 0);
      panel.values?.attr('x', d => x(d.year)).attr('y', d => panel.y(d[panel.key]) - 15);
    });
    const years = width < 600 ? [2005, 2010, 2015, 2020, 2024] : [2005, 2008, 2011, 2014, 2017, 2020, 2024];
    yearAxis.attr('transform', `translate(0,${bottom})`)
      .call(axisBottom(x).tickValues(years).tickFormat(format('d')).tickSize(0).tickPadding(12));
    yearAxis.select('.domain').remove();
    hit.attr('x', left).attr('y', 20).attr('width', width - left - right).attr('height', bottom - 15);
    updateSelection();
  }
  hit.on('pointermove click', event => {
    if (!x) return;
    selectYear(rows[nearest(rows, x.invert(pointer(event, svg.node())[0]))]);
  });
  const observer = new ResizeObserver(render);
  observer.observe(plot.node());
  window.addEventListener('resize', render);
  updateSelection();
  render();
  return { resize: render, destroy() {
    destroyed = true;
    observer.disconnect();
    window.removeEventListener('resize', render);
    root.remove();
  } };
}
