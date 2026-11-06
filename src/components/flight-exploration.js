import React from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import view from "./flight-exploration/view.html?raw";
import "./flight-exploration/style.css";
import { createRoot } from "react-dom/client";
import { AreaBump } from "@nivo/bump";
import { createBeatPlayback } from "./beat-playback.js";
export async function mountFlightExploration(container) {
  const response = await fetch(
    `${import.meta.env.BASE_URL}data/flight-exploration.json`,
  );
  if (!response.ok) throw new Error("Flight exploration data unavailable");
  const data = await response.json();
  container.innerHTML = view;
  const root = container.querySelector(".flight-exploration");
  let active = false,
    destroyed = false,
    hasRenderedArea = false,
    tableCohort = null;

  const meta = data.rows.map((row) =>
    Object.fromEntries(data.columns.map((c, i) => [c, row[i]])),
  );
  const byId = new Map(meta.map((r) => [r.source_id, r]));
  const phases = ['departure','in_flight','arrival'];
  // Retain canonical metadata, but plot only records with a known airborne phase.
  const records = meta.filter(r=>phases.includes(r.phase)).map(r=>[r.source_id,r.phase]);
  root.dataset.excludedPhaseCount=String(meta.length-records.length);
  const phaseNames = {
    all: "All records",
    ordered: "Known airborne phase",
    later: "Crash after departure",
    arrival: "Crash during arrival",
    departure: "Crash during departure",
    in_flight: "Crash in flight",
  };
  const groups = {
    all: records,
    ordered: records,
    later: records.filter((r) => ["in_flight", "arrival"].includes(r[1])),
    ...Object.fromEntries(
      ["departure", "in_flight", "arrival"].map((k) => [
        k,
        records.filter((r) => r[1] === k),
      ]),
    ),
  };

  const phaseLabels = { departure:'Departure', in_flight:'In flight', arrival:'Arrival' };
  const beats = [
    { label:'0', end:0, hold:1100 },
    { label:'1', end:0, hold:3200 },
    { label:'1.5', phase:'departure', end:1, duration:2100, hold:650 },
    { label:'2', phase:'departure', causes:true, end:1, hold:3400 },
    { label:'2.5', phase:'in_flight', end:1, hold:1700 },
    { label:'3', phase:'in_flight', end:2, duration:2100, hold:650 },
    { label:'3.5', phase:'in_flight', causes:true, end:2, hold:3400 },
    { label:'4', phase:'arrival', end:2, hold:1800 },
    { label:'4.5', phase:'arrival', end:3, duration:2600, hold:700 },
    { label:'5', phase:'arrival', causes:true, end:3, hold:3800 },
    { label:'5.5', end:3, hold:0 },
  ];
  const scene = () => beats[revealStage];
  const complete = () => revealStage===beats.length-1 && revealProgress>=phases.length;
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  let revealStage = 0, revealProgress = 0, running = false, lastPaint = -Infinity, navigationKey = '', commentaryKey = '';
  let revealedIds = new Set(), visibleGroups = Object.fromEntries(Object.keys(groups).map(k => [k, []]));
  // Build each phase across its cause categories together. These are source-ID
  // subsets for a visual reveal, never a fabricated chronological sequence.
  const phaseBuckets = phases.map(phase => d3.group(groups[phase], r => byId.get(r[0]).cause));
  const members = key => visibleGroups[key];
  function rebuildMembership() {
    revealedIds = new Set();
    phases.forEach((phase, i) => {
      const fraction = smooth(revealProgress - i);
      for (const bucket of phaseBuckets[i].values()) {
        bucket.slice(0, Math.round(bucket.length * fraction)).forEach(([id]) => revealedIds.add(id));
      }
    });
    visibleGroups = Object.fromEntries(Object.entries(groups).map(([key, rows]) => [key, rows.filter(([id]) => revealedIds.has(id))]));
    tableCohort = null;
    root.revealData = { beat:scene().label, phase:scene().phase || null, progress:revealProgress, recordIds:members('all').map(([id]) => id) };
    root.dataset.revealedCount = String(revealedIds.size);
  }
  let selected = "all",
    cell = null,
    hoverBin = 0,
    measure = "count";
  const format = d3.format(","),
    percent = d3.format(".1%");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const svg = d3.select(root.querySelector(".flight-flow"));
  let graph, unit, vertical, width, overlay, linkPath, flowBands = [];
  const color = d => d.outcome ? "var(--viz-series-2)" : "var(--viz-series-1)";
  const identity = (id) =>
    `${data.source.dataset}@${data.source.revision}:${id}`;
  const causeOrder = data.rules.area_display.causes;
  const displayLabels = data.rules.area_display.labels;
  const causeColors = {
    technical: "var(--viz-series-1)",
    human: "var(--viz-series-2)",
    weather: "var(--viz-series-3)",
    other: "var(--viz-series-4)",
    intentional: "var(--viz-series-4)",
    unknown: "var(--muted-foreground)",
  };
  const areaElement = root.querySelector(".area-stage"),
    reactRoot = createRoot(areaElement);
  function selectedRecords() {
    return members(selected).filter(([id]) => {
      const r = byId.get(id);
      return (
        !cell ||
        (r.cause === cell.cause &&
          (cell.binStart == null ||
            (r.year >= cell.binStart && r.year <= cell.binEnd)))
      );
    });
  }
  function payload() {
    const ids = selectedRecords().map((r) => r[0]);
    const denominatorRecordIds = members(selected)
      .map((r) => r[0])
      .filter((id) => {
        const r = byId.get(id);
        return (
          causeOrder.includes(r.cause) &&
          (!cell ||
            cell.binStart == null ||
            (r.year >= cell.binStart && r.year <= cell.binEnd))
        );
      });
    return {
      dataset: data.source.dataset,
      revision: data.source.revision,
      filter: data.rules.filter,
      cohort: selected,
      periodPolicy: data.rules.periods,
      measure,
      cell,
      recordIds: ids,
      revealedRecordIds: members('all').map(([id]) => id),
      revealPhase: scene().phase || null,
      phaseFilter: [...phases],
      recordKeys: ids.map(identity),
      denominatorRecordIds,
    };
  }
  function announce(persist) {
    const p = payload();
    root.querySelector('.selection-label').setAttribute('aria-live',persist ? 'polite' : 'off');
    root.querySelector(".selection-label").textContent = cell
      ? `${phaseNames[selected]} · highlighting ${displayLabels[cell.cause]}${cell.binStart != null ? " / " + cell.binStart + "–" + cell.binEnd : ""} · ${format(p.recordIds.length)} matching records`
      : selected === 'all' && revealProgress < phases.length
        ? `${format(p.recordIds.length)} of ${format(records.length)} crash records introduced`
        : `${phaseNames[selected]} · ${format(p.recordIds.length)} crashes`;
    root.querySelectorAll('[data-cohort]').forEach(b => {
      b.setAttribute('aria-pressed',String(b.dataset.cohort === selected));
      b.textContent = `${b.dataset.cohort === 'all' ? 'All' : phaseLabels[b.dataset.cohort]} · ${format(members(b.dataset.cohort).length)}`;
    });
    root
      .querySelectorAll(".cause-legend [data-cause]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.cause === cell?.cause)),
      );
    root
      .querySelectorAll(".exact-table [data-cause]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(
            cell?.cause === b.dataset.cause &&
              cell?.binStart === +b.dataset.period,
          ),
        ),
      );
    root.querySelector("[data-clear-selection]").disabled =
      selected === "all" && !cell;
    svg
      .selectAll("[data-cohort-key]")
      .attr("aria-pressed", (d) => String(selected === d.key));
    root.selection = p;
    root.dispatchEvent(
      new CustomEvent("flight-phase:select", { bubbles: true, detail: p }),
    );
    root.dispatchEvent(
      new CustomEvent("flight-safety:selection", { bubbles: true, detail: p }),
    );
    inspect(p);
    renderCommentary();
  }
  function choose(key) {
    playback.hold(); showAll();
    selected = selected === key ? "all" : key;
    cell = null;
    root.querySelector(".area-detail").textContent = "";
    update(true);
    renderArea();
    announce(true);
  }
  function update(animate) {
    if (!overlay) return;
    const active = new Set(selectedRecords().map((r) => r[0]));
    // Each source phase remains a contiguous band. A cause-period cell may select a
    // noncontiguous subset inside a phase; compress it proportionally within that band.
    const target =
      animate && !reduced.matches
        ? overlay.interrupt().transition().duration(420).ease(d3.easeCubicOut)
        : overlay.interrupt();
    const selectedCount = (d) =>
      selected === 'all' && !cell
        ? groups[d.terminal].length
        : members(d.terminal).reduce((n, r) => n + active.has(r[0]), 0);
    target
      .attr("stroke-width", (d) => selectedCount(d) * unit)
      .attr("d", (d) => {
        const shift =
          (-d.link.value / 2 + d.bandOffset + selectedCount(d) / 2) * unit;
        return linkPath({
          ...d.link,
          y0: d.link.y0 + shift,
          y1: d.link.y1 + shift,
        });
      });
  }

  function periodBins() {
    const p = data.rules.periods;
    return d3
      .range(p.start_inclusive, p.end_exclusive, p.width_years)
      .map((start) => ({
        start,
        end: start + p.width_years - 1,
        id: `${start}–${start + p.width_years - 1}`,
        label: `${start}–${String(start + p.width_years - 1).slice(-2)}`,
        width: p.width_years,
      }));
  }
  function resolved(token) {
    const c = getComputedStyle(root)
      .getPropertyValue(token.slice(4, -1))
      .trim();
    return c || token;
  }
  function renderArea() {
    if (destroyed || !active) return;
    const bins = periodBins(),
      cohortRows = members(selected).map(([id]) => byId.get(id));
    const displayed = cohortRows.filter((r) => causeOrder.includes(r.cause));
    const excluded = cohortRows.filter((r) => !causeOrder.includes(r.cause));
    const totals = bins.map(
      (b) =>
        displayed.filter((r) => r.year >= b.start && r.year <= b.end).length,
    );
    const allCells = [];
    const series = causeOrder.map((cause) => ({
      id: cause,
      data: bins.map((b, i) => {
        const ids = cohortRows
          .filter(
            (r) => r.year >= b.start && r.year <= b.end && r.cause === cause,
          )
          .map((r) => r.source_id);
        const y = totals[i] ? ids.length / totals[i] : 0;
        allCells.push({
          cause,
          binStart: b.start,
          binEnd: b.end,
          count: ids.length,
          denominator: totals[i],
          share: y,
          recordIds: ids,
        });
        return {
          x: b.id,
          y: measure === "percentage" ? y : ids.length,
          count: ids.length,
          denominator: totals[i],
          period: b,
        };
      }),
    }));
    root.areaData = {
      measure,
      recordIds: cohortRows.map(r => r.source_id),
      bins,
      series,
      cells: allCells,
      displayedCount: displayed.length,
      excludedCount: excluded.length,
    };
    const w = areaElement.getBoundingClientRect().width,
      h = areaElement.getBoundingClientRect().height;
    if (w < 1) return;
    const margin = { top: 26, right: 34, bottom: 52, left: 34 };
    const tickStep = w >= 780 ? 1 : w >= 480 ? 2 : 5;
    const tickIndices = new Set(d3.range(0, bins.length, tickStep));
    const pointIndex = (e) =>
      Math.max(
        0,
        Math.min(
          bins.length - 1,
          Math.round(
            ((e.clientX -
              areaElement.getBoundingClientRect().left -
              margin.left) /
              (w - margin.left - margin.right)) *
              (bins.length - 1),
          ),
        ),
      );
    const describe = (cause, i) => {
      const row = series.find((s) => s.id === cause).data[i];
      return `${displayLabels[cause]} · ${row.period.start}–${row.period.end} · ${row.denominator ? percent(row.count / row.denominator) : "— (no denominator)"} · ${format(row.count)} of ${format(row.denominator)} displayed records`;
    };
    const tooltip = ({ serie }) => {
      const i = Math.min(hoverBin, bins.length - 1);
      return React.createElement(
        "div",
        {
          style: {
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            padding: "10px 12px",
            maxWidth: 260,
          },
        },
        describe(serie.id, i),
      );
    };
    const fg = resolved("var(--foreground)"),
      border = resolved("var(--border)");
    renderExactTable(allCells, bins);
    const Frame = ({ innerWidth, innerHeight }) =>
      React.createElement("rect", {
        width: innerWidth,
        height: innerHeight,
        fill: "none",
        stroke: border,
        strokeWidth: 1,
        pointerEvents: "none",
      });
    reactRoot.render(
      React.createElement(AreaBump, {
        key: measure,
        width: w,
        height: h,
        margin,
        data: series,
        align: "end",
        spacing: 3,
        xPadding: 0.5,
        interpolation: "smooth",
        colors: (s) => resolved(causeColors[s.id]),
        blendMode: "normal",
        fillOpacity: (s) => (cell && cell.cause !== s.id ? 0.18 : 0.65),
        activeFillOpacity: 0.85,
        inactiveFillOpacity: 0.2,
        borderWidth: 0,
        activeBorderWidth: 0,
        inactiveBorderWidth: 0,
        startLabel: false,
        endLabel: false,
        enableGridX: false,
        axisTop: null,
        axisBottom: {
          tickSize: 4,
          tickPadding: 10,
          tickValues: bins.map((b) => b.id),
          format: (v) =>
            tickIndices.has(bins.findIndex((b) => b.id === v))
              ? bins.find((b) => b.id === v)?.label
              : "",
          legend: "Five-year period · calendar years",
          legendPosition: "middle",
          legendOffset: 38,
        },
        theme: {
          text: { fill: fg, fontSize: 12 },
          axis: {
            ticks: { text: { fill: fg, fontSize: 12 } },
            legend: { text: { fill: fg, fontSize: 12 } },
            domain: { line: { stroke: border } },
          },
        },
        animate: active && hasRenderedArea && !reduced.matches,
        motionConfig: { tension: 210, friction: 30 },
        layers: [Frame, "axes", "areas"],
        tooltip,
        onMouseEnter: (s, e) => {
          hoverBin = pointIndex(e);
          root.querySelector(".area-detail").textContent = describe(
            s.id,
            hoverBin,
          );
        },
        onMouseMove: (s, e) => {
          hoverBin = pointIndex(e);
          root.querySelector(".area-detail").textContent = describe(
            s.id,
            hoverBin,
          );
        },
        onClick: (s, e) => {
          playback.hold();
          const b = bins[pointIndex(e)];
          const same = cell?.cause === s.id && cell?.binStart === b.start;
          cell = same
            ? null
            : { cause: s.id, binStart: b.start, binEnd: b.end };
          update(true);
          renderArea();
          announce(true);
          root.querySelector(".area-detail").textContent = describe(
            s.id,
            pointIndex(e),
          );
        },
        role: "img",
        ariaLabel: `Area bump: ${measure === "percentage" ? "percentages of the four displayed causes" : "raw counts"} across eleven five-year periods, anchored at zero at the bottom`,
      }),
    );
    hasRenderedArea = true;
    const otherCount = excluded.filter((r) => r.cause === "other").length,
      unknownCount = excluded.filter((r) => r.cause === "unknown").length;
    root.querySelector(".area-caption").textContent =
      measure === "percentage" ? "Shares compare the four named causes within each period." : "";
    root.querySelector(".area-caption").hidden = measure !== "percentage";
    root.querySelector(".source-cause-coverage").textContent =
      `${format(displayed.length)} of ${format(cohortRows.length)} selected records have one of the four named causes. Other causes: ${format(otherCount)}; cause not recorded: ${format(unknownCount)}.`;
    root.querySelector(".area-reading").textContent =
      `Order = rank · thickness = ${measure === "count" ? "raw count" : "percentage of the four displayed causes"}.`;
    root
      .querySelectorAll("[data-measure]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.measure === measure)),
      );
    if (!cell)
      root.querySelector(".area-detail").textContent =
        `${format(displayed.length)} of ${format(cohortRows.length)} crashes have one of these four recorded causes.`;
  }
  function renderExactTable(cells, bins) {
    if (!root.querySelector(".source-inspector").open && revealProgress < phases.length) return;
    if (tableCohort === selected) return;
    tableCohort = selected;
    const body = root.querySelector(".exact-table tbody");
    body.replaceChildren();
    for (const bin of bins) {
      const row = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = bin.id;
      row.append(th);
      for (const cause of causeOrder) {
        const value = cells.find(
          (c) => c.cause === cause && c.binStart === bin.start,
        );
        const td = document.createElement("td"),
          button = document.createElement("button");
        button.type = "button";
        button.className = "exact-value";
        button.dataset.cause = cause;
        button.dataset.period = bin.start;
        button.textContent = `${format(value.count)} · ${value.denominator ? percent(value.share) : "—"}`;
        button.setAttribute(
          "aria-label",
          `${displayLabels[cause]}, ${bin.id}: ${value.count} of ${value.denominator} displayed records, ${value.denominator ? percent(value.share) : "no denominator"}. Highlight these records.`,
        );
        button.setAttribute(
          "aria-pressed",
          String(cell?.cause === cause && cell?.binStart === bin.start),
        );
        button.addEventListener("click", () => {
          playback.hold();
          cell =
            cell?.cause === cause && cell?.binStart === bin.start
              ? null
              : { cause, binStart: bin.start, binEnd: bin.end };
          update(true);
          renderArea();
          announce(true);
          root.querySelector(".area-detail").textContent =
            `${displayLabels[cause]} · ${bin.id} · ${value.denominator ? percent(value.share) : "— (no denominator)"} · ${format(value.count)} of ${format(value.denominator)} displayed records`;
        });
        td.append(button);
        row.append(td);
      }
      body.append(row);
    }
  }
  function inspect(p) {
    const out = root.querySelector(".inspect-rows");
    out.replaceChildren();
    root.querySelector(".inspector-caption").textContent =
      `First ${Math.min(5, p.recordIds.length)} of ${format(p.recordIds.length)} selected source records; IDs are preserved, never renumbered.`;
    for (const id of p.recordIds.slice(0, 5)) {
      const r = byId.get(id),
        div = document.createElement("div");
      div.className = "inspect-record text-small";
      const a = document.createElement("div");
      a.textContent = `Source ID ${id} · ${r.date} · ${r.aircraft}`;
      const b = document.createElement("div");
      b.textContent = `flight_phase: ${r.raw_phase || "(blank)"} → ${r.phase}; crash_cause: ${r.raw_cause || "(blank)"} → ${r.cause}`;
      div.append(a, b);
      out.append(div);
    }
    root.querySelector(".provenance").textContent =
      `${data.source.dataset} · revision ${data.source.revision.slice(0, 12)} · mapping ${data.rules.version}. Source IDs are unique within this pinned snapshot. Full record keys include dataset + revision + ID. Five-year periods and raw-count semantics are versioned; no technical-domain inference.`;
  }

  function draw() {
    if (destroyed || !active) return;
    width = root.querySelector('.sankey-stage').getBoundingClientRect().width;
    if (width < 1) return;
    vertical = width < 560;
    const W = vertical ? 610 : width;
    unit = (vertical ? Math.min(95, width * .29) : 90) / records.length;
    const end = vertical ? 560 : W - 18;
    const xs = vertical ? [52,172,292,412] : [16,W*.245,W*.49,W*.735];
    const yMain = vertical ? 18 : 58, ySink = vertical ? width - 110 : 150;
    const specs = [
      ['all',xs[0],yMain], ['ordered',xs[1],yMain], ['later',xs[2],yMain],
      ['arrival',xs[3],yMain], ['crash',end,ySink],
    ];
    const nodes = specs.map(([id,x,y]) => ({ id,x0:x,x1:x+7,y0:y,sourceLinks:[],targetLinks:[] }));
    const nodeMap = new Map(nodes.map(node => [node.id,node]));
    const links = [
      ['all','ordered','ordered',0],
      ['ordered','later','later',0], ['ordered','crash','departure',3,true],
      ['later','arrival','arrival',0], ['later','crash','in_flight',2,true],
      ['arrival','crash','arrival',1,true],
    ].map(([source,target,key,rank,outcome]) => {
      const link = { source:nodeMap.get(source), target:nodeMap.get(target), key, rank, outcome,
        value:groups[key].length };
      link.width = link.value * unit;
      link.source.sourceLinks.push(link); link.target.targetLinks.push(link);
      return link;
    });
    nodes.forEach(n => {
      n.value = Math.max(d3.sum(n.sourceLinks,l => l.value),d3.sum(n.targetLinks,l => l.value));
      n.y1 = n.y0 + n.value * unit;
      n.sourceLinks.sort((a,b) => a.rank-b.rank); n.targetLinks.sort((a,b) => a.rank-b.rank);
    });
    graph = { nodes,links };
    sankey().update(graph);
    root.sankeyData = { recordIds:members('all').map(([id]) => id), links:links.map(l => ({ key:l.key,source:l.source.id,target:l.target.id,recordIds:members(l.key).map(([id]) => id),value:members(l.key).length })) };
    svg.attr('viewBox',`0 0 ${width} ${vertical ? 620 : 270}`).attr('height',vertical ? 620 : 270);
    svg.selectAll('desc').data([0]).join('desc').text(`Crashes grouped by recorded phase. ${format(revealedIds.size)} of ${format(records.length)} archive records revealed.`);
    const path = linkPath = vertical ? d3.linkVertical().source(d => [d.y0,d.source.x1]).target(d => [d.y1,d.target.x0]) : sankeyLinkHorizontal();
    // Geometry uses the final cohort throughout: progress changes path length,
    // never thickness or the positions of already-drawn phase bands.
    const bands = links.flatMap(link => {
      let offset = 0;
      return ['arrival','in_flight','departure'].flatMap(terminal => {
        if (!groups[link.key].some(r => r[1] === terminal)) return [];
        const shift = (-link.value / 2 + offset + groups[terminal].length / 2) * unit;
        const band = { link,terminal,bandOffset:offset,
          path:path({...link,y0:link.y0+shift,y1:link.y1+shift}),
          startY:link.y0+shift,endY:link.y1+shift };
        offset += groups[terminal].length;
        return [band];
      });
    });
    const bandKey = d => d.link.source.id+':'+d.link.target.id+':'+d.terminal;
    const base = svg.selectAll('path.flow-base').data(bands,bandKey).join('path')
      .attr('class','flow-base').attr('d',d => d.path).attr('stroke',d => color(d.link))
      .attr('stroke-width',d => groups[d.terminal].length*unit)
      .attr('pathLength',1).attr('data-terminal',d => d.terminal);
    base.each(function(d) { d.length = this.getTotalLength(); });
    // Each phase travels from the source through consecutive links to its sink.
    // Normalized dashes follow the actual curved path, including the mobile layout.
    for (const terminal of phases) {
      const route = bands.filter(d => d.terminal === terminal).sort((a,b) => a.link.source.x0-b.link.source.x0);
      const total = d3.sum(route,d => d.length);
      let offset = 0;
      for (const band of route) { band.routeStart=offset; band.routeLength=total; offset+=band.length; }
    }
    flowBands = bands;
    overlay = svg.selectAll('path.flow-selected').data(bands,bandKey).join('path')
      .attr('class','flow-selected').attr('d',d => d.path).attr('stroke',d => color(d.link))
      .attr('stroke-width',0).attr('pathLength',1).attr('data-terminal',d => d.terminal);
    svg.selectAll('path.flow-hit').data(links,l => l.source.id+':'+l.target.id).join('path')
      .attr('class','flow-hit cursor-interaction').attr('d',path).attr('stroke-width',l => Math.max(l.width,32))
      .attr('data-cohort-key',l => l.key).attr('role','button')
      .attr('aria-pressed',l => String(selected === l.key))
      .attr('aria-label',l => `${phaseNames[l.key]}: ${format(members(l.key).length)} records. Select this cohort.`)
      .on('click',(_,l) => { if (members(l.key).length) choose(l.key); })
      .on('keydown',(e,l) => { if (members(l.key).length && ['Enter',' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); choose(l.key); } });
    const nodeBands = new Map();
    for (const band of bands) {
      for (const [node,y,distance] of [[band.link.source,band.startY,band.routeStart],[band.link.target,band.endY,band.routeStart+band.length]]) {
        nodeBands.set(node.id+':'+band.terminal,{node,terminal:band.terminal,y,distance,routeLength:band.routeLength});
      }
    }
    svg.selectAll('rect.flow-node').data([...nodeBands.values()],d => d.node.id+':'+d.terminal).join('rect').attr('class','flow-node')
      .attr('x',d => vertical ? d.y-groups[d.terminal].length*unit/2 : d.node.x0)
      .attr('y',d => vertical ? d.node.x0 : d.y-groups[d.terminal].length*unit/2)
      .attr('width',d => vertical ? groups[d.terminal].length*unit : 7)
      .attr('height',d => vertical ? 7 : groups[d.terminal].length*unit);
    const labels = [];
    const add = (key,x,y,text,second='',anchor='start') => labels.push({key,x,y,text,second,anchor});
    if (!vertical) {
      add('all',16,22,'Crashes',format(revealedIds.size));
      add('departure',xs[1],22,'Departure'); add('in_flight',xs[2],22,'In flight'); add('arrival',xs[3],22,'Arrival');
      add('dep-count',xs[1]+14,165,format(members('departure').length));
      add('flight-count',xs[2]+14,179,format(members('in_flight').length));
      add('arrival-count',width-18,116,format(members('arrival').length),'','end');
    } else {
      const tx = Math.min(width-142,130);
      add('all',tx,47,'Crashes',format(revealedIds.size));
      add('departure',tx,167,'Departure',members('departure').length ? format(members('departure').length) : '');
      add('in_flight',tx,287,'In flight',members('in_flight').length ? format(members('in_flight').length) : '');
      add('arrival',tx,407,'Arrival',members('arrival').length ? format(members('arrival').length) : '');
      add('known',width-16,600,`${format(members('ordered').length)} airborne-phase crashes`,'','end');
    }
    const text = svg.selectAll('text.flow-label').data(labels,d => d.key).join('text').attr('class','flow-label')
      .attr('x',d => d.x).attr('y',d => d.y).attr('text-anchor',d => d.anchor);
    text.each(function(d) {
      d3.select(this).selectAll('tspan').data([d.text,...(d.second ? [d.second] : [])]).join('tspan')
        .attr('x',d.x).attr('dy',(_,i) => i ? 19 : 0).text(t => t);
    });
    update(false);
    renderFlowProgress();
  }

  function phaseProgress(terminal) {
    return smooth(revealProgress-phases.indexOf(terminal));
  }
  function renderFlowProgress() {
    const focus=selected==='all' && !complete() ? scene().phase : null;
    for (const band of flowBands) {
      const progress = phaseProgress(band.terminal);
      band.progress = progress === 1 ? 1 : clamp((progress*band.routeLength-band.routeStart)/band.length);
    }
    svg.selectAll('path.flow-base, path.flow-selected')
      .attr('stroke-dasharray',d => `${d.progress} 1`)
      .attr('visibility',d => d.progress > 0 ? 'visible' : 'hidden')
      .style('stroke-opacity',function(d) {
        const emphasized=!focus || d.terminal===focus;
        return this.classList.contains('flow-selected') ? emphasized ? .76 : .26 : emphasized ? .22 : .1;
      });
    svg.selectAll('text.flow-label').classed('is-current',d=>Boolean(focus && (d.key===focus || d.key==={departure:'dep-count',in_flight:'flight-count',arrival:'arrival-count'}[focus])))
      .attr('visibility',d=>['dep-count','flight-count','arrival-count'].includes(d.key) && !members({'dep-count':'departure','flight-count':'in_flight','arrival-count':'arrival'}[d.key]).length ? 'hidden' : 'visible');
    // Do not leave invisible future stretches of ribbon as interactive hit targets.
    svg.selectAll('path.flow-hit')
      .attr('visibility',link => flowBands.filter(d => d.link===link).every(d => d.progress===1) ? 'visible' : 'hidden')
      .attr('tabindex',link => flowBands.filter(d => d.link===link).every(d => d.progress===1) ? 0 : -1)
      .attr('aria-hidden',link => String(!flowBands.filter(d => d.link===link).every(d => d.progress===1)));
    svg.selectAll('rect.flow-node').attr('visibility',d => phaseProgress(d.terminal)>0 && phaseProgress(d.terminal)*d.routeLength>=d.distance-.01 ? 'visible' : 'hidden');
  }

  function renderCommentary() {
    const key = selected === 'all' ? scene().phase || 'ordered' : selected;
    const rows = members(key).map(([id]) => byId.get(id));
    const counts = d3.rollup(rows,v => v.length,r => r.cause);
    const fullCounts = d3.rollup(groups[key],v => v.length,r => byId.get(r[0]).cause);
    const leaders = [...causeOrder].sort((a,b) => (fullCounts.get(b)||0)-(fullCounts.get(a)||0)).slice(0,2).map(cause => ({cause,count:counts.get(cause)||0}));
    const exploring = selected !== 'all' || complete();
    const causesVisible = selected !== 'all' || scene().causes;
    const phaseCopy = {
      departure:['Human factor and technical failures lead.','Together, they account for 396 of the 610 departure crashes.'],
      in_flight:['Human factor leads in flight.','Technical failures are the second-largest recorded cause.'],
      arrival:['Human factor stands out on arrival.','It accounts for 859 of 1,527 arrival crashes—over half.'],
      ordered:['Human factor leads across the flight.','Technical failures come next among the recorded causes.'],
      later:['Arrival accounts for most of this group.','Human factor is the leading recorded cause across these later phases.'],
    }[key];
    let title=phaseCopy[0], explanation=phaseCopy[1], label=phaseLabels[key] || phaseNames[key];
    if(selected==='all') {
      if(revealStage<=1) {
        label='Recorded airborne phases';title='Three broad phases.';
        explanation='Departure, in flight, arrival. Wider ribbons represent more recorded crashes.';
      } else if(revealStage===2) {
        title='First, departure.';explanation=`About ${Math.round(groups.departure.length/records.length*100)}% of these crashes were recorded during takeoff or climb.`;
      } else if(revealStage===4 || revealStage===5) {
        title='Then, in flight.';explanation=`About ${Math.round(groups.in_flight.length/records.length*100)}% were recorded in flight.`;
      } else if(revealStage===7 || revealStage===8) {
        title='Finally, arrival.';explanation=`About ${Math.round(groups.arrival.length/records.length*100)}% were recorded during descent, approach or landing.`;
      } else if(complete()) {
        label='The full view';title='Arrival accounts for over half.';
        explanation='1,527 of 2,792 recorded airborne-phase crashes were during arrival. The phase filters below show how their causes differ.';
      }
    }
    const nextKey = `${selected}:${revealStage}:${key}`;
    if(commentaryKey!==nextKey) {
      commentaryKey=nextKey;
      root.querySelector('[data-phase-label]').textContent=label;
      const heading=root.querySelector('[data-phase-takeaway]');
      if(heading.textContent!==title) {
        heading.classList.remove('phase-copy-enter');heading.textContent=title;
        void heading.offsetWidth;heading.classList.add('phase-copy-enter');
      }
      root.querySelector('[data-phase-explanation]').textContent=explanation;
    }
    const rowsEl = d3.select(root.querySelector('.phase-cause-leaders')).selectAll('div').data(causesVisible ? leaders : [],d=>d.cause).join('div').attr('class','phase-cause-leader');
    rowsEl.each(function(d) {
      const el=d3.select(this);
      el.selectAll('span').data([displayLabels[d.cause]]).join('span').text(v=>v).style('--leader-color',causeColors[d.cause]);
      el.selectAll('strong').data([d.count]).join('strong').text(format);
    });
    root.querySelector('.phase-commentary-total').textContent=causesVisible ? `${format(rows.length)} ${phaseLabels[key]?.toLowerCase() || 'selected'} crashes` : '';
    const summary = selected==='all' && complete()
      ? phases.map(phase=>({phase,label:phaseLabels[phase],count:members(phase).length})) : [];
    d3.select(root.querySelector('.phase-summary')).selectAll('div').data(summary,d=>d.phase).join('div')
      .attr('class',d=>`phase-summary-row${d.phase==='arrival' ? ' is-emphasized' : ''}`)
      .each(function(d){
        d3.select(this).selectAll('span').data([d.label]).join('span').text(v=>v);
        d3.select(this).selectAll('strong').data([d.count]).join('strong').text(format);
      });
    root.commentary={phase:key,recordIds:rows.map(r=>r.source_id),causeCounts:Object.fromEntries(counts),leaders};
    root.dataset.attentionPhase=selected==='all' && !complete() ? scene().phase || '' : '';
    root.querySelector('.flight-commentary').classList.toggle('is-visible',revealStage>0 || exploring);
  }
  function renderRevealControls() {
    root.dataset.revealStage=String(revealStage);root.dataset.revealProgress=String(revealProgress);
    root.dataset.storyBeat=scene().label;root.dataset.playback=playback.status;
    root.classList.toggle('has-started',revealStage>0);
    root.classList.toggle('has-records',revealedIds.size>0);
    root.querySelector('.area-section').inert=revealedIds.size===0;
    root.querySelector('.selection-row').inert=revealedIds.size===0;
    const ready=complete() || selected!=='all';
    root.querySelector('.phase-controls').classList.toggle('is-ready',ready);
    root.querySelector('.phase-controls').inert=!ready;
    const status=playback.status;
    const key=`${revealStage}:${status}:${complete()}`;
    if(navigationKey!==key) {navigationKey=key;container.dispatchEvent(new CustomEvent('storybeat',{bubbles:true}));}
    const button=root.querySelector('[data-flight-pause]');
    button.textContent=status==='running'||status==='waiting' ? 'Pause' : 'Resume';button.disabled=complete();
    root.querySelector('[data-flight-show-all]').disabled=complete();
    root.querySelector('.flight-reveal-status').textContent=`${format(revealedIds.size)} / ${format(records.length)} records${status==='paused' ? ' · paused' : ''}`;
  }
  function renderReveal() {
    if(destroyed)return;
    renderRevealControls();
    if(active) {draw();renderArea();announce(false);}
  }
  function stopReveal() {d3.select(root).interrupt('phase-reveal');running=false;}
  function playReveal() {
    if(!active || document.hidden || revealProgress>=scene().end)return;
    running=true;renderRevealControls();
    const start=revealProgress,end=scene().end;
    if(reduced.matches) {revealProgress=end;rebuildMembership();renderReveal();running=false;playback.settled();return;}
    lastPaint=-Infinity;
    d3.select(root).transition('phase-reveal').duration((end-start)*scene().duration).ease(d3.easeLinear)
      .tween('phase-records',()=>t=>{
        revealProgress=start+(end-start)*t;
        if(d3.now()-lastPaint>=80 || t===1) {lastPaint=d3.now();rebuildMembership();renderReveal();}
        else renderFlowProgress();
      }).on('end',()=>{running=false;playback.settled();});
  }
  function advanceReveal() {
    if(revealStage>=beats.length-1)return;
    revealStage++;renderReveal();playReveal();playback.settled();
  }
  function showAll() {stopReveal();revealStage=beats.length-1;revealProgress=phases.length;rebuildMembership();renderReveal();}
  const playback=createBeatPlayback({
    state:()=>({key:revealStage,running,complete:complete(),atBoundary:revealProgress>=scene().end,remainingMs:Math.max(0,scene().end-revealProgress)*(scene().duration||0),durationMs:scene().duration||0,terminal:revealStage===beats.length-1}),
    play:playReveal,pause:stopReveal,advance:advanceReveal,holdMs:()=>scene().hold,reduced,showAll,changed:renderRevealControls,
  });
  root.querySelector('[data-flight-pause]').addEventListener('click',()=>playback.togglePause());
  root.querySelector('[data-flight-replay]').addEventListener('click',()=>{
    playback.engage();stopReveal();revealStage=0;revealProgress=0;selected='all';cell=null;
    root.querySelector('.area-detail').textContent='';
    rebuildMembership();renderReveal();playback.settled();
  });
  root.querySelector('[data-flight-show-all]').addEventListener('click',()=>{playback.hold();showAll();});
  root.querySelector('.source-inspector').addEventListener('toggle',()=>{if(root.querySelector('.source-inspector').open){playback.hold();renderArea();}});

  for (const cause of causeOrder) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cursor-interaction text-small";
    b.dataset.cause = cause;
    b.setAttribute("aria-pressed", "false");
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = causeColors[cause];
    b.append(sw, document.createTextNode(displayLabels[cause]));
    b.addEventListener("click", () => {
      playback.hold();
      cell = cell?.cause === cause && cell?.binStart == null ? null : { cause };
      update(true);
      renderArea();
      announce(true);
    });
    root.querySelector(".cause-legend").append(b);
  }
  root.querySelectorAll("[data-cohort]").forEach((b) => {
    const k = b.dataset.cohort;
    const short = {
      all: "All",
      departure: "Departure",
      in_flight: "In flight",
      arrival: "Arrival",
      };
    b.textContent = `${short[k]} · ${format(groups[k].length)}`;
    b.addEventListener("click", () => choose(k));
  });
  root.querySelector(".cohort-caption").textContent =
    `Worldwide scheduled-revenue archive · 1970–2024 · Recorded airborne phases`;
  root.querySelectorAll("[data-measure]").forEach((b) =>
    b.addEventListener("click", () => {
      playback.hold();
      measure = b.dataset.measure;
      root.querySelector(".area-detail").textContent = "";
      renderArea();
      announce(true);
    }),
  );
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      clearSelection();
    } else if (
      e.target.closest('button, select, input, summary, a, [role="button"]')
    )
      e.stopPropagation();
  });
  root
    .querySelector("[data-clear-selection]")
    .addEventListener("click", clearSelection);
  root.querySelector(".jump-to-causes").addEventListener("click", () => {
    root.querySelector("#flight-causes-title").focus({ preventScroll: true });
    root
      .querySelector(".area-section")
      .scrollIntoView({
        behavior: reduced.matches ? "instant" : "smooth",
        block: "start",
      });
  });
  function clearSelection() {
    playback.hold(); showAll();
    selected = "all";
    cell = null;
    root.querySelector(".area-detail").textContent = "";
    update(true);
    renderArea();
    announce(true);
  }

  const observer = new ResizeObserver(() => {
    draw();
    renderArea();
  });
  observer.observe(root.querySelector(".sankey-stage"));
  function onTheme() {
    renderArea();
  }
  function onMotion() {
    if (reduced.matches) {
      svg.selectAll("*").interrupt();
      update(false);
    }
    hasRenderedArea = false;
    renderArea();
  }
  window.addEventListener("themechange", onTheme);
  reduced.addEventListener("change", onMotion);
  rebuildMembership();
  announce(false);
  return {
    resize() {
      draw();
      renderArea();
    },
    setPlaybackMode:value => playback.setMode(value),
    showLastBeat(){playback.hold();showAll();},
    finishBeat() { playback.engage(); stopReveal(); revealProgress=scene().end; rebuildMembership(); renderReveal(); playback.settled(); },
    getPlaybackTiming:()=>playback.timing,
    getNavigationState() { return {step:revealStage+1,total:beats.length,running,inProgress:revealProgress<scene().end,action:complete() ? 'Continue the story' : 'Reveal the next beat'}; },
    nextBeat() { if(complete())return false;playback.engage();advanceReveal();return true; },
    previousBeat() {
      if(revealStage===0)return false;
      playback.hold();revealStage--;revealProgress=scene().end;
      selected='all'; cell=null; rebuildMembership(); renderReveal(); return true;
    },
    setActive(value) {
      if (active===value) return;
      active=value; playback.setActive(value);
      if (!active) { svg.selectAll('*').interrupt(); reactRoot.render(null); return; }
      hasRenderedArea=false; draw(); renderArea(); announce(false);
    },
    destroy() {
      playback.destroy();
      destroyed = true;
      observer.disconnect();
      window.removeEventListener("themechange", onTheme);
      reduced.removeEventListener("change", onMotion);
      svg.selectAll("*").interrupt();
      reactRoot.unmount();
      root.remove();
    },
  };
}
