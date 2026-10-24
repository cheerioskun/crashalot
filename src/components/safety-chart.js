import { axisBottom, axisLeft, bisector, extent, format, line, max, pointer, scaleLinear, select } from 'd3';
import './safety-chart.css';

// Standard D3 line-chart composition: https://observablehq.com/@d3/line-chart
// Events/pointer: https://d3js.org/d3-selection/events
// Nearest-year selection: https://d3js.org/d3-array/bisect
let instanceCount = 0;

const measures = [
  { key: 'ratePerMillion', label: 'Per million departures', unit: 'Fatal accidents per million departures', tick: format('.2~f'), value: format('.3f') },
  { key: 'fatalAccidents', label: 'Fatal accidents', unit: 'Fatal accidents', tick: format('d'), value: format(',d') },
  { key: 'departures', label: 'Departures', unit: 'Departures (millions)', tick: value => format('.0f')(value / 1e6), value: format(',d') },
];
const integer = format(',d');

/** Mount an independent, theme-aware visualization; the host may initially be hidden. */
export function mountSafetyChart(host, data) {
  if (!(host instanceof Element)) throw new TypeError('A chart host element is required.');
  const root = select(host).append('section').attr('class', 'safety-chart');
  const rows = Array.isArray(data?.rows) ? [...data.rows].sort((a, b) => a.year - b.year) : [];
  const valid = rows.length > 1 && rows.every((row, index) =>
    Number.isInteger(row.year) && (!index || row.year > rows[index - 1].year) &&
    Number.isInteger(row.fatalAccidents) && row.fatalAccidents >= 0 &&
    Number.isInteger(row.departures) && row.departures > 0 &&
    Number.isFinite(row.ratePerMillion) && row.ratePerMillion >= 0
  );
  if (!valid) {
    root.append('p').attr('role', 'status').text('The annual safety data could not be displayed. Please reload to try again.');
    return { destroy: () => root.remove(), resize() {} };
  }

  const id = `safety-chart-${++instanceCount}`;
  let measure = measures[0];
  let selected = rows.at(-1);
  let destroyed = false;
  let x;
  let y;
  let plotBottom;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nearestYear = bisector(row => row.year).center;

  root.attr('aria-labelledby', `${id}-heading`);
  root.append('h3').attr('id', `${id}-heading`).attr('class', 'safety-chart__heading').text('Fatal accidents, in context.');
  root.append('p').attr('class', 'safety-chart__scope').text(`U.S. air carriers · passenger and cargo · ${rows[0].year}–${rows.at(-1).year}`);

  const fieldset = root.append('fieldset').attr('class', 'safety-chart__controls');
  fieldset.append('legend').attr('class', 'visually-hidden').text('Chart measure');
  const buttons = fieldset.append('div').attr('class', 'btn-group').attr('role', 'group').attr('aria-label', 'Chart measure');
  measures.forEach(option => {
    buttons.append('input')
      .attr('type', 'radio').attr('class', 'btn-check')
      .attr('name', `${id}-measure`).attr('id', `${id}-${option.key}`)
      .attr('value', option.key).property('checked', option === measure)
      .on('change', () => { measure = option; render(true); });
    buttons.append('label').attr('class', 'btn btn-outline-primary')
      .attr('for', `${id}-${option.key}`).text(option.label);
  });

  const plot = root.append('div').attr('class', 'safety-chart__plot');
  const unit = plot.append('p').attr('class', 'safety-chart__unit');
  const svg = plot.append('svg').attr('class', 'safety-chart__svg')
    .attr('role', 'img').attr('aria-labelledby', `${id}-svg-title ${id}-svg-description`);
  const svgTitle = svg.append('title').attr('id', `${id}-svg-title`);
  svg.append('desc').attr('id', `${id}-svg-description`)
    .text('Annual observations with a zero-based vertical axis. Select a year using the slider below for exact values. All observations are also provided in the data table.');
  const grid = svg.append('g').attr('class', 'safety-chart__grid').attr('aria-hidden', 'true');
  const yAxis = svg.append('g').attr('class', 'safety-chart__axis safety-chart__axis--y').attr('aria-hidden', 'true');
  const xAxis = svg.append('g').attr('class', 'safety-chart__axis safety-chart__axis--x').attr('aria-hidden', 'true');
  const path = svg.append('path').attr('class', 'safety-chart__line').attr('aria-hidden', 'true');
  const dots = svg.append('g').attr('aria-hidden', 'true').selectAll('circle')
    .data(rows, row => row.year).join('circle').attr('class', 'safety-chart__dot').attr('r', 3.5);
  const crosshair = svg.append('line').attr('class', 'safety-chart__crosshair').attr('aria-hidden', 'true');
  const focus = svg.append('circle').attr('class', 'safety-chart__focus').attr('r', 6).attr('aria-hidden', 'true');
  const hitArea = svg.append('rect').attr('class', 'safety-chart__hit-area').attr('aria-hidden', 'true');

  const inspection = root.append('div').attr('class', 'safety-chart__inspection');
  const yearControl = inspection.append('div').attr('class', 'safety-chart__year-control');
  const yearLabel = yearControl.append('label').attr('for', `${id}-year`).attr('class', 'safety-chart__year-label');
  yearLabel.append('span').text('Inspect year');
  const yearValue = yearLabel.append('strong');
  const slider = yearControl.append('input').attr('class', 'form-range')
    .attr('type', 'range').attr('id', `${id}-year`)
    .attr('min', rows[0].year).attr('max', rows.at(-1).year).attr('step', 1)
    .on('input', event => selectYear(rows[nearestYear(rows, +event.target.value)]));

  const readout = inspection.append('div').attr('class', 'safety-chart__readout')
    .attr('id', `${id}-readout`);
  const readoutMain = readout.append('p').attr('class', 'safety-chart__readout-main');
  const readoutDetail = readout.append('p').attr('class', 'safety-chart__readout-detail');
  const observationNote = root.append('p').attr('class', 'safety-chart__observation');

  const source = root.append('p').attr('class', 'safety-chart__source');
  source.append('span').text('Source: ');
  source.append('a').attr('href', 'https://www.ntsb.gov/safety/Pages/research.aspx').attr('target', '_blank').attr('rel', 'noopener noreferrer').text('NTSB');
  source.append('span').text('; departure exposure compiled by the FAA. Observation window ends in 2024.');

  const details = root.append('details').attr('class', 'safety-chart__details');
  details.append('summary').text('Definition, method & annual data');
  details.append('p').text('U.S. operators under 14 CFR Part 121, scheduled and nonscheduled service, worldwide. Includes passenger and cargo operations and fatalities on the ground. These are accident events, not passenger deaths or a count of completed safe journeys.');
  details.append('p').text('Rate = fatal accidents ÷ departures × 1,000,000. Points are annual observations; connecting lines do not imply observations between years. Rates in the table are rounded to six decimal places.');
  details.append('p').append('a')
    .attr('href', 'https://www.ntsb.gov/safety/Documents/AviationAccidentStatistics_2005-2024_20260112.xlsx')
    .text('Download the NTSB source workbook — Table 5 (XLSX)');
  const table = details.append('div').attr('class', 'table-responsive').attr('tabindex', '0')
    .attr('role', 'region').attr('aria-label', 'Annual safety data, horizontally scrollable on small screens')
    .append('table').attr('class', 'table table-sm safety-chart__table');
  table.append('caption').text('U.S. air carriers, 2005–2024. Counts and departures are exact source values.');
  table.append('thead').append('tr').selectAll('th')
    .data(['Year', 'Fatal accidents', 'Departures', 'Fatal accidents / million departures'])
    .join('th').attr('scope', 'col').text(value => value);
  const tableRows = table.append('tbody').selectAll('tr').data(rows, row => row.year).join('tr');
  tableRows.append('th').attr('scope', 'row').text(row => row.year);
  tableRows.append('td').text(row => integer(row.fatalAccidents));
  tableRows.append('td').text(row => integer(row.departures));
  tableRows.append('td').text(row => format('.6f')(row.ratePerMillion));

  function updateSelection(animate = false) {
    yearValue.text(selected.year);
    slider.property('value', selected.year).attr('aria-valuetext', `${selected.year}: ${integer(selected.fatalAccidents)} fatal ${selected.fatalAccidents === 1 ? 'accident' : 'accidents'} in ${integer(selected.departures)} departures; ${format('.3f')(selected.ratePerMillion)} per million departures.`);
    readoutMain.text(`${integer(selected.fatalAccidents)} fatal ${selected.fatalAccidents === 1 ? 'accident' : 'accidents'} · ${integer(selected.departures)} departures`);
    readoutDetail.text(`${format('.3f')(selected.ratePerMillion)} fatal accidents per million departures in ${selected.year}`);
    observationNote.text(selected.fatalAccidents === 0
      ? 'No fatal accidents observed in this year. This does not establish zero future risk.'
      : 'Fatal accidents include fatalities on the ground; this is not a passenger fatality probability.');
    if (!x || !y) return;
    crosshair.interrupt();
    focus.interrupt();
    const crossTarget = animate && !reducedMotion.matches ? crosshair.transition().duration(250) : crosshair;
    const focusTarget = animate && !reducedMotion.matches ? focus.transition().duration(250) : focus;
    crossTarget.attr('x1', x(selected.year)).attr('x2', x(selected.year)).attr('y1', 16).attr('y2', plotBottom);
    focusTarget.attr('cx', x(selected.year)).attr('cy', y(selected[measure.key]));
  }

  function selectYear(row) {
    if (row === selected) return;
    selected = row;
    updateSelection();
  }

  function render(animate = false) {
    if (destroyed) return;
    const width = plot.node().getBoundingClientRect().width;
    if (width < 100) return; // ResizeObserver will retry when an initially hidden view is shown.
    const height = Math.max(240, Math.min(340, width * 7 / 16));
    const margin = { top: 16, right: 20, bottom: 38, left: 50 };
    plotBottom = height - margin.bottom;
    x = scaleLinear().domain(extent(rows, row => row.year)).range([margin.left, width - margin.right]);
    y = scaleLinear().domain([0, max(rows, row => row[measure.key]) || 1]).nice(4).range([plotBottom, margin.top]);
    const yTicks = y.ticks(4).filter(value => measure.key !== 'fatalAccidents' || Number.isInteger(value));
    const years = width < 520 ? [rows[0].year, 2015, rows.at(-1).year] : [rows[0].year, 2010, 2015, 2020, rows.at(-1).year];
    unit.text(measure.unit);
    svgTitle.text(`${measure.unit}, ${rows[0].year} to ${rows.at(-1).year}, U.S. air carriers`);
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    grid.attr('transform', `translate(${margin.left},0)`)
      .call(axisLeft(y).tickValues(yTicks).tickSize(-(width - margin.left - margin.right)).tickFormat(''));
    grid.select('.domain').remove();
    yAxis.attr('transform', `translate(${margin.left},0)`)
      .call(axisLeft(y).tickValues(yTicks).tickFormat(measure.tick).tickSize(0).tickPadding(12));
    yAxis.select('.domain').remove();
    xAxis.attr('transform', `translate(0,${plotBottom})`)
      .call(axisBottom(x).tickValues(years).tickFormat(format('d')).tickSize(0).tickPadding(15));
    const drawLine = line().x(row => x(row.year)).y(row => y(row[measure.key]));
    path.interrupt();
    dots.interrupt();
    const pathTarget = animate && !reducedMotion.matches ? path.transition().duration(250) : path;
    const dotsTarget = animate && !reducedMotion.matches ? dots.transition().duration(250) : dots;
    pathTarget.attr('d', drawLine(rows));
    dotsTarget.attr('cx', row => x(row.year)).attr('cy', row => y(row[measure.key]));
    hitArea.attr('x', margin.left).attr('y', margin.top)
      .attr('width', width - margin.left - margin.right).attr('height', plotBottom - margin.top + 8);
    updateSelection(animate);
  }

  hitArea.on('pointermove', event => {
    const [px] = pointer(event, svg.node());
    selectYear(rows[nearestYear(rows, x.invert(px))]);
  }).on('click', event => {
    const [px] = pointer(event, svg.node());
    selectYear(rows[nearestYear(rows, x.invert(px))]);
  });

  const resizeObserver = new ResizeObserver(() => render());
  resizeObserver.observe(plot.node());
  const onThemeChange = () => render();
  window.addEventListener('themechange', onThemeChange);
  updateSelection();
  render();

  return {
    resize: () => render(),
    destroy() {
      destroyed = true;
      resizeObserver.disconnect();
      window.removeEventListener('themechange', onThemeChange);
      root.selectAll('*').interrupt();
      root.remove();
    },
  };
}
