import { select, format } from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import './phase-sankey.css';

// Standard d3-sankey layout and horizontal ribbons. The flow classifies records;
// its columns do not represent successive stages traversed by an aircraft.
const integer = format(',d');
const percent = format('.1%');
let instances = 0;

export async function mountPhaseSankey(container) {
  if (!(container instanceof Element)) throw new TypeError('A chart host element is required.');
  const root = select(container).append('div').attr('class', 'phase-sankey');
  root.on('keydown', event => {
    if (event.target.closest('select, button, summary, a, [tabindex]')) event.stopPropagation();
  });
  const response = await fetch(`${import.meta.env.BASE_URL}data/phase-sankey.json`);
  if (!response.ok) {
    root.append('p').attr('role', 'status').text('The phase records could not be loaded. Reload to try again.');
    return { resize() {}, destroy: () => root.remove() };
  }
  const data = await response.json();
  const uid = `phase-sankey-${++instances}`;
  let cohort = 'scheduled';
  let pinned = null;
  let inspected = null;
  let graph;
  let activeLinks;
  let total;
  let destroyed = false;
  const typeById = new Map(data.types.map(d => [d.id, d]));
  const phaseById = new Map(data.phases.map(d => [d.id, d]));
  const color = id => id === 'unknown' ? 'var(--viz-muted, var(--bs-secondary-color))' : `var(--viz-series-${phaseById.get(id).color})`;
  const key = d => `${typeof d.source === 'string' ? d.source : d.source.id}/${typeof d.target === 'string' ? d.target : d.target.id}`;
  const toolbar = root.append('div').attr('class', 'phase-sankey__toolbar');
  const cohortControl = toolbar.append('label').attr('class', 'phase-sankey__cohort');
  cohortControl.append('span').text('Records');
  const chooser = cohortControl.append('select').attr('aria-label', 'Accident record cohort');
  chooser.append('option').attr('value', 'scheduled').text('Scheduled revenue');
  chooser.append('option').attr('value', 'all').text('All operations');
  chooser.on('change', event => { cohort = event.target.value; pinned = null; inspected = null; render(); updateTable(); });
  const scope = toolbar.append('p').attr('class', 'phase-sankey__scope');
  const plot = root.append('div').attr('class', 'phase-sankey__plot');
  const svg = plot.append('svg').attr('role', 'group').attr('aria-labelledby', `${uid}-title ${uid}-desc`);
  svg.append('title').attr('id', `${uid}-title`).text('Recorded accidents by operation and flight phase');
  svg.append('desc').attr('id', `${uid}-desc`).text('Ribbon width represents accident record counts. These are categories, not successive flight stages. Focus or hover a ribbon for exact counts; press Enter or click to pin, Escape to reset. The complete values are in the expandable data table.');
  const headers = svg.append('g').attr('class', 'phase-sankey__headers').attr('aria-hidden', 'true');
  const links = svg.append('g').attr('class', 'phase-sankey__links');
  const nodes = svg.append('g').attr('class', 'phase-sankey__nodes');
  const inspection = root.append('div').attr('class', 'phase-sankey__inspection');
  const readout = inspection.append('div').attr('aria-live', 'polite').attr('aria-atomic', 'true');
  const primary = readout.append('p').attr('class', 'phase-sankey__primary');
  const secondary = readout.append('p').attr('class', 'phase-sankey__secondary');
  const reset = inspection.append('button').attr('type', 'button').attr('class', 'phase-sankey__reset').text('Reset selection').on('click', clearSelection);
  root.append('p').attr('class', 'phase-sankey__boundary').text('Ribbons classify accident records. They do not trace flights or measure risk in each phase.');
  const details = root.append('details').attr('class', 'phase-sankey__details');
  details.append('summary').text('Source, definitions & exact data');
  const detailBody = details.append('div').attr('class', 'phase-sankey__detail-body');
  detailBody.append('p').text('Worldwide records dated 1970–2025. Scheduled revenue means the source’s exact “Scheduled Revenue Flight” label; passenger-only coverage is unverified. This archive is not a complete census. Its population differs from the U.S. Part 121 trend chart.');
  detailBody.append('p').text('Each record belongs to one operation group and one broad recorded phase. Flight / En route → En route; takeoff and initial climb → Takeoff / climb; approach, descent and landing → Approach / landing; taxi, parking, standing and towing → Ground. Missing and unmatched phase labels remain in Unknown / other. Ribbons are proportional to record counts, not fatalities, flight exposure, time spent or risk per minute.');
  const source = detailBody.append('p');
  source.append('span').text('Source: ');
  source.append('a').attr('href', data.source.url).attr('target', '_blank').attr('rel', 'noopener noreferrer').text(data.source.name);
  source.append('span').text(` · ${data.source.license} · local snapshot ${data.source.retrieved}. Aggregated and regrouped for this chart. `);
  source.append('a').attr('href', `${import.meta.env.BASE_URL}data/phase-sankey.json`).attr('download', 'phase-sankey.json').text('Download chart data');
  const table = detailBody.append('table');
  table.append('caption').text('Every ribbon in the selected cohort. Shares use all records in that cohort.');
  const tableHead = table.append('thead').append('tr');
  ['Operation', 'Recorded phase', 'Records', 'Cohort share'].forEach(d => tableHead.append('th').attr('scope', 'col').text(d));
  const tableBody = table.append('tbody');

  function clearSelection() { pinned = null; inspected = null; applyInspection(); }
  function description(d) {
    const sourceTotal = activeLinks.filter(x => x.source === d.source.id).reduce((n, x) => n + x.value, 0);
    return `${d.source.label} → ${d.target.label}: ${integer(d.value)} records; ${percent(d.value / total)} of ${integer(total)} records in this cohort; ${percent(d.value / sourceTotal)} of ${integer(sourceTotal)} ${d.source.label.toLowerCase()} records.`;
  }
  function applyInspection() {
    if (!graph) return;
    const selectedKey = pinned || inspected;
    const selected = graph.links.find(d => key(d) === selectedKey);
    links.selectAll('path').classed('is-muted', d => Boolean(selected) && key(d) !== selectedKey)
      .classed('is-active', d => key(d) === selectedKey)
      .attr('aria-pressed', d => String(key(d) === pinned));
    nodes.selectAll('g').classed('is-muted', d => Boolean(selected) && d.id !== selected.source.id && d.id !== selected.target.id);
    if (selected) {
      const sourceTotal = activeLinks.filter(d => d.source === selected.source.id).reduce((n, d) => n + d.value, 0);
      primary.text(`${integer(selected.value)} records · ${selected.source.label} → ${selected.target.label}`);
      secondary.text(`${percent(selected.value / total)} of ${integer(total)} cohort records${cohort === 'all' ? ` · ${percent(selected.value / sourceTotal)} of ${integer(sourceTotal)} ${selected.source.label.toLowerCase()} records` : ''} · ${pinned ? 'Pinned; reset or click again to release.' : 'Click or press Enter to pin.'}`);
    } else {
      const landing = activeLinks.filter(d => d.target === 'landing').reduce((n, d) => n + d.value, 0);
      primary.text(`${integer(landing)} of ${integer(total)} records were labeled approach / landing.`);
      secondary.text(`${percent(landing / total)} of this cohort · Hover or focus a ribbon to inspect; click to pin.`);
    }
    reset.property('disabled', !selectedKey);
  }
  function togglePin(d) { pinned = pinned === key(d) ? null : key(d); inspected = pinned; applyInspection(); }
  function render() {
    if (destroyed) return;
    activeLinks = data.links.filter(d => cohort === 'all' || d.source === 'scheduled');
    total = activeLinks.reduce((n, d) => n + d.value, 0);
    const sources = data.types.filter(d => activeLinks.some(l => l.source === d.id));
    const width = Math.max(680, plot.node().clientWidth || container.clientWidth || 1000);
    const height = Math.max(180, plot.node().clientHeight || 270);
    const left = width < 850 ? 142 : 168;
    const right = width < 850 ? 184 : 210;
    const layout = sankey().nodeId(d => d.id).nodeWidth(7).nodePadding(height < 240 ? 17 : 25)
      .nodeSort(null).linkSort(null).extent([[left, 29], [width - right, height - 14]]);
    graph = layout({ nodes: [...sources.map(d => ({ ...d, column: 'source' })), ...data.phases.map(d => ({ ...d, column: 'phase' }))], links: activeLinks.map(d => ({ ...d })) });
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    scope.text(`Worldwide archive · ${integer(total)} records · ${data.period}`);
    headers.selectAll('text').data([{ x: left - 12, anchor: 'end', label: 'OPERATION' }, { x: width - right + 19, anchor: 'start', label: 'RECORDED PHASE' }]).join('text')
      .attr('x', d => d.x).attr('y', 13).attr('text-anchor', d => d.anchor).text(d => d.label);
    const ribbons = links.selectAll('path').data(graph.links, key).join('path')
      .attr('d', sankeyLinkHorizontal()).attr('stroke', d => color(d.target.id))
      .attr('stroke-width', d => d.width).attr('fill', 'none').attr('tabindex', 0)
      .attr('role', 'button').attr('aria-label', description)
      .on('pointerenter', (_, d) => { if (!pinned) { inspected = key(d); applyInspection(); } })
      .on('pointerleave', () => { if (!pinned) { inspected = null; applyInspection(); } })
      .on('focus', (_, d) => { if (!pinned) { inspected = key(d); applyInspection(); } })
      .on('blur', () => { if (!pinned) { inspected = null; applyInspection(); } })
      .on('click', (_, d) => togglePin(d))
      .on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); togglePin(d); }
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); clearSelection(); }
      });
    ribbons.selectAll('title').data(d => [d]).join('title').text(description);
    const groups = nodes.selectAll('g').data(graph.nodes, d => d.id).join(enter => {
      const group = enter.append('g'); group.append('rect'); group.append('text'); return group;
    });
    groups.select('rect').attr('x', d => d.x0).attr('y', d => d.y0).attr('width', d => d.x1 - d.x0).attr('height', d => d.y1 - d.y0)
      .attr('fill', d => d.column === 'phase' ? color(d.id) : 'var(--viz-series-1)')
      .attr('class', d => d.id === 'unknown' ? 'phase-sankey__unknown' : null);
    groups.select('text').attr('x', d => d.column === 'source' ? d.x0 - 12 : d.x1 + 12)
      .attr('y', d => (d.y0 + d.y1) / 2).attr('dy', '0.35em').attr('text-anchor', d => d.column === 'source' ? 'end' : 'start')
      .text(d => d.label);
    applyInspection();
  }
  function updateTable() {
    tableBody.selectAll('tr').data(activeLinks, key).join('tr').selectAll('td')
      .data(d => [typeById.get(d.source).label, phaseById.get(d.target).label, integer(d.value), percent(d.value / total)])
      .join('td').text(d => d);
  }
  render();
  updateTable();
  const observer = new ResizeObserver(render);
  observer.observe(plot.node());
  return { resize: render, destroy() { destroyed = true; observer.disconnect(); root.remove(); } };
}
