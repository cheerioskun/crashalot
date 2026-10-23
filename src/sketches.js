import * as d3 from 'd3';

const blue = '#315c78', gold = '#cfab46', red = '#b9573e', gray = '#c5ced0';
const count = d3.format(',d'), pct = d3.format('.1%');
const root = document.querySelector('#experiment');
const W = 360;
let data;
const sketches = [
  ['small', 'Small risk', 'How small is small?', rarity],
  ['decades', 'Over time', 'What changes when we add context?', decades],
  ['types', 'Flight types', 'Which kind of flight?', flightTypes],
  ['causes', 'Causes', 'A smaller share—or fewer records?', causes],
  ['technical', 'Technical', 'What is inside “technical failure”?', technical],
  ['flow', 'Flight flow', 'Where do flights leave the journey?', flow],
  ['journey', 'Phase shapes', 'Where along the journey?', journey],
  ['context', 'Milestones', 'What else was changing?', milestones],
];

function node(tag, text, parent = root, cls) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (cls) el.className = cls;
  parent.append(el);
  return el;
}
function setup(i, model, prompt, caveat) {
  root.replaceChildren();
  node('p', model ? 'Constructed example · not an aviation estimate' : 'Observed records · 1970–2025', root, `badge ${model ? 'model' : ''}`);
  const title = node('h1', sketches[i][2]); title.tabIndex = -1;
  node('p', prompt, root, 'prompt');
  const controls = node('div', undefined, root, 'controls');
  const chart = node('div', undefined, root, 'chart');
  const readout = node('div', '', root, 'readout'); readout.setAttribute('role', 'status');
  node('p', caveat, root, 'caveat');
  return { controls, chart, readout };
}
function svgFor(chart, h, title) {
  chart.replaceChildren();
  const s = d3.select(chart).append('svg').attr('viewBox', `0 0 ${W} ${h}`).attr('role', 'group').attr('aria-label', title);
  s.append('title').text(title);
  return s;
}
function buttons(parent, labels, selected, callback) {
  const all = labels.map((label, i) => {
    const b = node('button', label, parent); b.type = 'button'; b.setAttribute('aria-pressed', String(i === selected));
    b.onclick = () => { all.forEach((el, j) => el.setAttribute('aria-pressed', String(i === j))); callback(i); };
    return b;
  });
}
function select(parent, label, options, callback, initial = 0) {
  const l = node('label', label, parent, 'control-label');
  const s = node('select', undefined, l);
  options.forEach(([value, name]) => { const o = node('option', name, s); o.value = value; });
  s.selectedIndex = initial; s.onchange = () => callback(s.value);
  return s;
}
function slider(parent, text, min, max, value, callback) {
  const l = node('label', text, parent, 'range-label');
  const input = node('input', undefined, l); input.type = 'range'; input.min = min; input.max = max; input.value = value;
  input.oninput = () => callback(+input.value);
  return input;
}
function accessible(selection, label, click) {
  selection.attr('role', 'button').attr('tabindex', 0).attr('aria-label', label)
    .on('click', (e, d) => click(d)).on('keydown', (e, d) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(d); } });
}
function legend(parent, names, colors) {
  const l = node('div', undefined, parent, 'legend');
  names.forEach((name, i) => { const t = node('span', undefined, l); const swatch = node('i', undefined, t); swatch.style.background = colors[i]; t.append(document.createTextNode(name)); });
}
function lineChart(chart, series, { index = false, year, h = 260, yLabel = 'Recorded accidents', start = 1970, end = 2025 } = {}) {
  const s = svgFor(chart, h, `${yLabel} by year`);
  const x = d3.scaleLinear().domain([start, end]).range([48, 346]);
  const max = d3.max(series.flatMap(d => d.values), d => d.value) || 1;
  const y = d3.scaleLinear().domain([0, max * 1.08]).nice().range([h - 38, 30]);
  s.append('g').attr('transform', `translate(0,${h - 38})`).call(d3.axisBottom(x).tickValues([start, 1990, 2010, end].filter((d, i, a) => a.indexOf(d) === i)).tickFormat(d3.format('d')));
  s.append('g').attr('transform', 'translate(48,0)').call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('~s')));
  s.append('text').attr('x', 48).attr('y', 12).text(index ? 'Index · 1970 = 100' : yLabel);
  const line = d3.line().defined(d => d.value !== null).x(d => x(d.year)).y(d => y(d.value));
  series.forEach((ser, i) => {
    s.append('path').datum(ser.values).attr('d', line).attr('fill', 'none').attr('stroke', ser.color).attr('stroke-width', 2).attr('stroke-dasharray', i ? '4 3' : null);
    if (year !== undefined) {
      const d = ser.values.find(d => d.year === year);
      if (d) s.append('circle').attr('cx', x(year)).attr('cy', y(d.value)).attr('r', 4).attr('fill', ser.color).attr('stroke', '#fffdf6');
    }
  });
  if (year !== undefined) s.append('line').attr('x1', x(year)).attr('x2', x(year)).attr('y1', 25).attr('y2', h - 38).attr('stroke', blue).attr('opacity', .25);
  return { s, x, y };
}

function rarity() {
  const {controls, chart, readout} = setup(0, true, 'A field of 100,000 imagined flights. Tap a block to look inside it.', 'This is a scale experiment, not a probability estimate. A marked block contains an accident; it does not mean every flight in the block had one. The example is deliberately constructed, not a random sample.');
  let k = 1, active = null;
  slider(controls, 'Constructed accident flights per 100,000: 1–10', 1, 10, k, v => { k = v; draw(); });
  const inspect = node('button', 'Look inside a marked block', controls);
  inspect.onclick = () => { active = 17; draw(); };
  const back = node('button', 'Zoom out', controls); back.onclick = () => { active = null; draw(); };
  legend(controls, ['Unmarked block / flight', 'Contains an accident / accident flight'], ['#dce5e5', red]);
  function draw() {
    const marked = Array.from({length:k}, (_, i) => (17 + i * 23) % 100);
    const zoomed = active !== null;
    back.disabled = !zoomed;
    const s = svgFor(chart, zoomed ? 310 : 330, zoomed ? 'One thousand individual constructed flights' : 'One hundred blocks of one thousand constructed flights');
    if (!zoomed) {
      const squares = s.selectAll('rect').data(d3.range(100)).join('rect').attr('x', d => 30 + d % 10 * 30).attr('y', d => 20 + Math.floor(d / 10) * 30).attr('width', 24).attr('height', 24).attr('rx', 2).attr('fill', '#dce5e5').attr('stroke', d => marked.includes(d) ? red : '#93a8ac').attr('stroke-width', d => marked.includes(d) ? 3 : .6);
      accessible(squares, d => `Inspect block ${d + 1}, 1,000 flights, ${marked.includes(d) ? 'contains one accident' : 'no accidents in this constructed block'}`, d => { active = d; draw(); });
      readout.textContent = `${count(k)} accident flight${k > 1 ? 's' : ''} among 100,000 constructed flights. Each square groups 1,000 flights. ${k} outlined block${k > 1 ? 's contain one accident each' : ' contains one accident'}.`;
    } else {
      const hasAccident = marked.includes(active);
      s.selectAll('circle').data(d3.range(1000)).join('circle').attr('cx', d => 17 + d % 40 * 8.3).attr('cy', d => 25 + Math.floor(d / 40) * 10).attr('r', d => hasAccident && d === 417 ? 3.5 : 2.3).attr('fill', d => hasAccident && d === 417 ? red : '#9bb2b5');
      readout.textContent = `Inside block ${active + 1}: ${hasAccident ? 'one marked accident flight and 999 other flights' : '1,000 flights without an accident in this example'}. Each dot is now one flight. The total scenario is unchanged.`;
    }
  }
  draw();
}

function decades() {
  const {controls, chart, readout} = setup(1, false, 'Move through time. Then change what the lines measure.', 'The indexed view aligns both series to 100 in 1970. It compares change, not absolute magnitude or risk. The accident and departure populations are not proven compatible; dividing them would produce an unvalidated rate. Both views stop at 2023, the last nonmissing World Bank year.');
  let mode = 0, cohort = 'scheduled', year = 2023;
  select(controls, 'Recorded flight type', [['scheduled','Scheduled revenue'],['private','Private'],['all','All source flight types']], v => { cohort = v; draw(); });
  buttons(controls, ['Record counts','With departures (index)'], 0, v => { mode = v; draw(); });
  slider(controls, 'Year · 1970–2023', 1970, 2023, year, v => { year = v; draw(); });
  legend(controls, ['Accident records', 'Registered-carrier departures (index mode)'], [blue, gold]);
  function draw() {
    const rs = data.cohorts[cohort].annual.filter(d => d.year <= 2023);
    const flights = data.departures.filter(d => d.year >= 1970 && d.year <= 2023);
    const base = rs[0].count, fb = flights.find(d => d.year === 1970).value;
    const series = [{color:blue,values:rs.map(d => ({year:d.year,value:mode ? d.count/base*100 : d.count}))}];
    if (mode) series.push({color:gold,values:flights.map(d => ({year:d.year,value:d.value/fb*100}))});
    lineChart(chart,series,{year,index:!!mode,end:2023});
    const n = rs.find(d => d.year === year).count, f = flights.find(d => d.year === year);
    readout.textContent = `${year}: ${count(n)} recorded accidents in the selected flight type. World Bank context: ${f ? d3.format('.3s')(f.value) : 'missing'} registered-carrier departures worldwide.${mode ? ' Both lines show relative change from 1970.' : ''}`;
  }
  draw();
}

function flightTypes() {
  const {controls,chart,readout} = setup(2,false,'Compare outcomes among people aboard recorded accidents—not risk per ordinary flight. Tap a type or change the measure.','Fatality fraction is pooled onboard deaths ÷ occupants among usable recorded accidents. It is conditional on a recorded accident, not deaths per ordinary flight. “Scheduled revenue” is a source category, not a verified passenger-only cohort. Different exclusions and accident reporting can affect comparisons.');
  let mode = 0;
  const labels = ['Scheduled revenue','Private','Charter / taxi','Corporate / business'];
  buttons(controls,['Fatality fraction','Accident records'],0,v => { mode = v; draw(); });
  function describe(d,i) { readout.textContent = `${labels[i]}: ${count(d.fatalities)} onboard deaths / ${count(d.occupants)} occupants = ${pct(d.fraction)}. ${count(d.validRecords)} usable accident records; ${count(d.excluded)} excluded. All ${count(d.records)} records count in record-count mode.`; }
  function draw() {
    const s = svgFor(chart,315,mode ? 'Accident record counts by flight type' : 'Fatality fraction among people aboard usable recorded accidents');
    const x = d3.scaleLinear().domain([0,mode ? d3.max(data.flightTypes,d=>d.records)*1.1 : 1]).range([8,348]);
    data.flightTypes.forEach((d,i) => {
      const g = s.append('g').attr('transform',`translate(0,${i*65+8})`);
      g.append('rect').attr('width',360).attr('height',62).attr('fill','transparent');
      g.append('text').attr('x',8).attr('y',12).text(labels[i]);
      g.append('rect').attr('x',8).attr('y',23).attr('height',22).attr('width',x(mode?d.records:d.fraction)-8).attr('fill',i===0?blue:'#7f9ca8');
      g.append('text').attr('x',348).attr('y',12).attr('text-anchor','end').text(mode?count(d.records):pct(d.fraction));
      accessible(g,`${labels[i]}, show counts and exclusions`,()=>describe(d,i));
    });
    s.append('g').attr('transform','translate(0,280)').call(d3.axisBottom(x).ticks(mode?4:5).tickFormat(mode?d3.format('~s'):d3.format('.0%')));
    describe(data.flightTypes[0],0);
  }
  draw();
}

const causeColors = ['#cfab46','#315c78','#6f9d92','#a16d73','#8a8193','#d0d5d2'];
function causes() {
  const {controls,chart,readout} = setup(3,false,'A category can occupy a smaller slice without falling in number. Compare the two views.','The source assigns one broad cause or leaves it unknown. Unknown stays visible and remains in the denominator. A larger human-factor share is not evidence that human error became more frequent per flight. These records do not establish causal effects.');
  let mode=0,cohort='all';
  select(controls,'Flight type',[['all','All source flight types'],['scheduled','Scheduled revenue']],v=>{cohort=v;draw();});
  buttons(controls,['Share of records','Number of records'],0,v=>{mode=v;draw();});
  legend(controls,['Technical','Human factor','Weather','Deliberate acts','Other','Unknown'],causeColors);
  function draw(){
    const rows=data.cohorts[cohort].causes;
    const s=svgFor(chart,285,mode?'Cause counts over time':'Cause shares over time including unknown');
    const stack=d3.stack().keys(data.causeNames).offset(mode?d3.stackOffsetNone:d3.stackOffsetExpand)(rows);
    const x=d3.scaleLinear().domain([1970,2025]).range([43,348]);
    const y=d3.scaleLinear().domain([0,mode?d3.max(rows,r=>d3.sum(data.causeNames,k=>r[k])):1]).range([245,20]);
    const area=d3.area().x(d=>x(d.data.year)).y0(d=>y(d[0])).y1(d=>y(d[1]));
    s.selectAll('path.area').data(stack).join('path').attr('d',area).attr('fill',(d,i)=>causeColors[i]).attr('stroke','#fffdf6').attr('stroke-width',.4);
    s.append('g').attr('transform','translate(0,245)').call(d3.axisBottom(x).tickValues([1970,1990,2010,2025]).tickFormat(d3.format('d')));
    s.append('g').attr('transform','translate(43,0)').call(d3.axisLeft(y).ticks(4).tickFormat(mode?d3.format('~s'):d3.format('.0%')));
    const first=rows.filter(d=>d.year<1980),last=rows.filter(d=>d.year>=2020);
    const stat=rs=>{const total=d3.sum(rs,r=>d3.sum(data.causeNames,k=>r[k]));return `${pct(d3.sum(rs,r=>r['Technical failure'])/total)} technical, ${pct(d3.sum(rs,r=>r.Unknown)/total)} unknown`;};
    readout.textContent=`1970–1979: ${stat(first)}. 2020–2025: ${stat(last)}. These periods have different lengths; use the annual count chart to inspect absolute change.`;
  }
  draw();
}

function technical(){
  const {controls,chart,readout}=setup(4,false,'Tap a square to inspect the words behind it. Does a technical category mean the same thing across periods?','These are case-insensitive keyword mentions inside narratives labeled “Technical failure,” not validated failure subtypes. Engine: engine/powerplant; systems: hydraulic/electrical/avionics/instrument; structure: structure/wing/fuselage; maintenance: maintenance/inspection/repair. Terms overlap; percentages do not add to 100%. Unequal periods are normalized by technical-record count.');
  let cohort='all';
  select(controls,'Flight type',[['all','All source flight types'],['scheduled','Scheduled revenue']],v=>{cohort=v;draw();});
  function describe(d){
    readout.replaceChildren();
    node('p',`${d.term}, ${d.period}: ${count(d.n)} / ${count(d.denominator)} technical records (${d.share===null?'not available':pct(d.share)}) contain a matching word.`,readout);
    d.examples.forEach(r=>node('p',`#${r.id} · ${r.date} · ${r.aircraft}: ${r.text}…`,readout,'record-excerpt'));
    if(!d.examples.length)node('p','No matching records in this cell.',readout);
  }
  function draw(){
    const rows=data.cohorts[cohort].heatmap;
    const terms=['Engine','Systems','Structure','Maintenance'];
    const periods=[...new Set(rows.map(d=>d.period))];
    const s=svgFor(chart,270,'Technical narrative mention share by period and term');
    const color=d3.scaleSequential(d3.interpolateBlues).domain([0,1]);
    terms.forEach((t,i)=>s.append('text').attr('x',0).attr('y',68+i*49).text(t));
    periods.forEach((p,i)=>{s.append('text').attr('x',119+i*60).attr('y',19).attr('text-anchor','middle').text(p.slice(0,4));s.append('text').attr('x',119+i*60).attr('y',33).attr('text-anchor','middle').text('–'+p.slice(-4));});
    const cells=s.selectAll('g.cell').data(rows).join('g').attr('transform',d=>`translate(${92+periods.indexOf(d.period)*60},${44+terms.indexOf(d.term)*49})`);
    cells.append('rect').attr('width',54).attr('height',43).attr('rx',2).attr('fill',d=>d.share===null?'#eee':color(d.share)).attr('stroke','#809aa8');
    cells.append('text').attr('x',27).attr('y',26).attr('text-anchor','middle').style('fill',d=>d.share>.55?'white':'#203c51').text(d=>d.share===null?'—':d3.format('.0%')(d.share));
    accessible(cells,d=>`${d.term}, ${d.period}, ${d.n} matching records out of ${d.denominator}`,describe);
    describe(rows[0]);
  }
  draw();
}

function flow(){
  const {controls,chart,readout}=setup(5,true,'Follow a constructed flight cohort. Then magnify only the flights with an accident.','This is a conservation-of-flow interaction model, not measured accident probability. The source has no successful-flight cohort. Tiny accident ribbons remain at their true scale; magnification changes the denominator. The four stages here are illustrative and cannot be inferred from the source’s combined phase labels.');
  let magnified=false;
  buttons(controls,['All 100,000 flights','Only 11 accident flights'],0,v=>{magnified=!!v;draw();});
  function draw(){
    const s=svgFor(chart,390,'Constructed flight cohort progressing through four stages with accident branches');
    const lost=[3,2,4,2],labels=['Takeoff','En route','Landing','Taxi after landing'];
    const total=magnified?11:100000,scale=155/total,left=35,bottom=340;
    let remaining=total, accumulated=0;
    s.append('text').attr('x',112).attr('y',18).attr('text-anchor','middle').text(`${count(total)} flights in this view`);
    labels.forEach((label,i)=>{
      const y=40+i*70,w=remaining*scale,next=remaining-lost[i],ribbon=lost[i]*scale;
      const sourceLeft=left+next*scale,sourceRight=left+w;
      const targetLeft=195+accumulated*scale,targetRight=targetLeft+ribbon;
      s.append('path').attr('d',`M${sourceLeft},${y}C${sourceLeft+40},${y+35} ${targetLeft},${bottom-45} ${targetLeft},${bottom}L${targetRight},${bottom}C${targetRight},${bottom-45} ${sourceRight+40},${y+35} ${sourceRight},${y}Z`).attr('fill',red).attr('fill-opacity',.75);
      s.append('path').attr('d',`M${left},${y}L${sourceLeft},${y}L${sourceLeft},${y+52}L${left},${y+52}Z`).attr('fill','#86a7ad');
      s.append('text').attr('x',9).attr('y',y+66).text(label);
      s.append('text').attr('x',240).attr('y',y+24).attr('class','flow-label').text(`${lost[i]} accident flights`);
      accumulated+=lost[i];
      remaining=next;
    });
    s.append('rect').attr('x',195).attr('y',340).attr('width',11*scale).attr('height',8).attr('fill',red);
    s.append('text').attr('x',magnified?270:225).attr('y',374).attr('text-anchor','middle').text('11 accident flights');
    if(!magnified)s.append('text').attr('x',112).attr('y',340).attr('text-anchor','middle').text('99,989 complete');
    readout.textContent=magnified?'Now the denominator is only the 11 accident flights: 3 takeoff, 2 en route, 4 landing, 2 taxi. We have magnified the branches, not increased the assumed risk.':'100,000 = 99,989 complete + 11 accident flights. At this scale, the accident ribbons are almost invisible. Switch views to inspect their composition.';
  }
  draw();
}

function journey(){
  const {controls,chart,readout}=setup(6,false,'Compare the shapes. Circle area shows the share of recorded accidents in each broad airborne phase.','The path is a symbolic altitude profile, not a measurement. Circle area encodes accident share, not phase-specific risk. The dataset combines takeoff/climb and approach/landing. Ground and unknown/other records remain in the denominator and are listed below. Short-versus-long comparisons require duration/exposure data not available here.');
  let pair=['all','scheduled'];
  select(controls,'Compare',[['all','All types / scheduled'],['private','Private / scheduled']],v=>{pair=[v,'scheduled'];draw();});
  function draw(){
    const s=svgFor(chart,340,'Two flight profiles with circles sized by observed broad phase accident share');
    const coords=[[53,43],[179,12],[306,43]];
    const names={all:'All source types',private:'Private',scheduled:'Scheduled revenue'};
    const radius=d3.scaleSqrt().domain([0,1]).range([0,31]);
    pair.forEach((key,j)=>{
      const top=j*145+40,rs=data.cohorts[key].phases;
      s.append('text').attr('x',8).attr('y',top-15).text(names[key]);
      s.append('path').attr('d',d3.line().curve(d3.curveMonotoneX)(coords.map(([x,y])=>[x,y+top]))).attr('fill','none').attr('stroke',blue).attr('stroke-width',1.5);
      coords.forEach(([x,y],i)=>{
        s.append('circle').attr('cx',x).attr('cy',y+top).attr('r',radius(rs[i].share)).attr('fill',j?gold:blue).attr('fill-opacity',.3).attr('stroke',j?'#937719':blue);
        s.append('text').attr('x',x).attr('y',top+85).attr('text-anchor','middle').text(pct(rs[i].share));
      });
    });
    ['Takeoff / climb','En route','Approach / landing'].forEach((t,i)=>s.append('text').attr('x',coords[i][0]).attr('y',331).attr('text-anchor','middle').style('font-size','10px').text(t));
    readout.textContent=pair.map(k=>{const c=data.cohorts[k];return `${names[k]}: ${count(c.n)} records; ground ${pct(c.phases[3].share)}, unknown/other ${pct(c.phases[4].share)}.`;}).join(' ');
  }
  draw();
}

function milestones(){
  const {controls,chart,readout}=setup(7,false,'Reveal historical context beside the recorded trend. Does timing alone explain the change?','These U.S. regulatory events are context for a global record series. Dates of rules are not dates of worldwide adoption. The chart does not estimate the effect of either technology, and temporal coincidence is not causal evidence.');
  const events=[{year:1974,name:'1974 · GPWS requirement',text:'The 2000 FAA rule recounts the 1974 requirement for ground-proximity warning systems for Part 121 and some Part 135 operators.'},{year:2000,name:'2000 · TAWS rule',text:'The FAA published a rule requiring terrain-awareness and warning systems on certain airplanes, with implementation requirements phased over time.'}];
  let chosen=events[0];
  buttons(controls,events.map(e=>e.name),0,v=>{chosen=events[v];draw();});
  const link=node('a','Read the FAA rule (PDF)',controls);link.href='https://www.govinfo.gov/content/pkg/FR-2000-03-29/pdf/00-7595.pdf';
  function draw(){
    lineChart(chart,[{color:blue,values:data.cohorts.scheduled.annual.map(d=>({year:d.year,value:d.count}))}],{year:chosen.year,yLabel:'Scheduled-revenue accident records'});
    readout.textContent=`${chosen.text} In ${chosen.year}, the source records ${count(data.cohorts.scheduled.annual.find(d=>d.year===chosen.year).count)} scheduled-revenue accidents globally.`;
  }
  draw();
}

function render(){
  let index=sketches.findIndex(s=>s[0]===location.hash.slice(1));
  if(index<0)index=0;
  sketches[index][3]();
  window.scrollTo({top:0,behavior:'instant'});
  document.querySelectorAll('#sketch-index a').forEach((a,i)=>{if(i===index)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.querySelector('#position').textContent=`${index+1} / ${sketches.length}`;
  const prev=document.querySelector('#previous'),next=document.querySelector('#next');
  prev.disabled=index===0;next.disabled=index===sketches.length-1;
  prev.onclick=()=>{location.hash=sketches[index-1][0];};next.onclick=()=>{location.hash=sketches[index+1][0];};
}

try {
  const response=await fetch('/data/sketch-data.json');
  if(!response.ok)throw new Error(`Data request failed (${response.status})`);
  data=await response.json();
  const nav=document.querySelector('#sketch-index');
  sketches.forEach(([id,label],i)=>{const a=node('a',`${i+1} ${label}`,nav);a.href=`#${id}`;});
  window.addEventListener('hashchange',render);
  render();
} catch(error) {
  root.replaceChildren();node('h1','The data could not load.');node('p','Run uv run python scripts/prepare_data.py, then reload.');node('p',error.message);
}
