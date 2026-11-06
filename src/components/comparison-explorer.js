import {axisBottom,axisLeft,brushX,format,group,max,scaleLinear,scaleUtc,select,utcYear} from 'd3';
import './comparison-explorer.css';

let dataset;
const shared={start:1970,end:2025,operation:'scheduled',manufacturer:null};
const listeners=new Set();
const number=format(',d');
function change(patch) {
  if(Object.entries(patch).every(([key,value])=>shared[key]===value))return;
  Object.assign(shared,patch);listeners.forEach(render=>render());
}
async function load() {
  dataset ??= fetch(`${import.meta.env.BASE_URL}data/comparison-records.json`).then(async response=>{
    if(!response.ok)throw new Error('Comparison records unavailable');
    const data=await response.json();
    data.records=data.rows.map(row=>Object.fromEntries(data.columns.map((key,i)=>[key,row[i]])));
    data.records.forEach(row=>{row.time=Date.parse(`${row.date}T00:00:00Z`);});
    return data;
  });
  return dataset;
}
function cells(rows,key) {
  return [...group(rows,row=>row[key])].map(([label,records])=>({label,count:records.length,recordIds:records.map(r=>r.source_id)}))
    .sort((a,b)=>b.count-a.count || a.label.localeCompare(b.label));
}
const ids=rows=>rows.map(row=>row.source_id);
const byYears=row=>row.year>=shared.start && row.year<shared.end;
const byOperation=row=>shared.operation==='all' || row.operation===shared.operation;
const byManufacturer=row=>!shared.manufacturer || row.manufacturer===shared.manufacturer;

async function mount(container,kind) {
  const data=await load(), aircraft=kind==='aircraft';
  const labels=data.scope.operationLabels;
  const root=document.createElement('div');root.className=`comparison-explorer comparison-${kind}`;
  container.replaceChildren(root);
  root.innerHTML=`
    <div class="comparison-toolbar">
      <fieldset class="comparison-years"><legend>Years</legend>
        <label>From <input type="number" min="1970" max="2024" data-start aria-label="First year"></label>
        <span aria-hidden="true">—</span>
        <label>To <input type="number" min="1970" max="2024" data-end aria-label="Last year"></label>
      </fieldset>
      <label class="comparison-operation">Kind of flying <select data-operation aria-label="Kind of flying"></select></label>
      <button type="button" class="text-button" data-reset-years>Reset years</button>
      <button type="button" class="text-button" data-clear-maker hidden></button>
    </div>
    <p class="comparison-scope"></p>
    ${aircraft ? `
      <div class="aircraft-comparison-grid">
        <div class="comparison-scatter-wrap">
          <p class="comparison-measure">Aircraft age at recorded crash · years</p>
          <svg class="comparison-scatter" role="group" aria-label="Crash date versus aircraft age. Drag across years to select records; the year fields provide a keyboard alternative."></svg>
          <p class="comparison-brush-hint">Drag across the years to compare a period.</p>
        </div>
        <aside class="comparison-linked">
          <h2>Aircraft in this period</h2>
          <label class="comparison-manufacturer">Manufacturer label <select data-manufacturer aria-label="Manufacturer"></select></label>
          <p class="comparison-manufacturer-context"></p>
          <div class="comparison-manufacturer-bars record-bars" aria-label="Manufacturers in the selected period"></div>
        </aside>
      </div>
      <div class="comparison-selection" role="status" aria-live="polite"></div>
      <div class="comparison-model-grid">
        <div><h2 class="comparison-model-heading">Models in the selection</h2><div class="comparison-model-bars record-bars"></div></div>
        <div class="comparison-records"><h2>Selected crash records</h2><p class="comparison-record-caption"></p><ol class="comparison-record-list"></ol><div class="comparison-record-actions"><button type="button" class="text-button" data-more>Show more records</button><button type="button" class="text-button" data-download>Download selection</button></div></div>
      </div>` : `
      <div class="type-comparison-grid">
        <div><p class="comparison-measure">Recorded crashes by kind of flying</p><svg class="comparison-types-chart" role="group" aria-label="Recorded crash counts by flight type. Choose a type for the aircraft comparison."></svg></div>
        <aside class="comparison-type-note"><p class="eyebrow">Different kinds of flying</p><h2>Which flights are in the picture?</h2><p>A scheduled airline, a private aircraft and a charter operate in different settings. Their records belong to different comparisons.</p><div class="comparison-type-selection" role="status" aria-live="polite"></div><p class="comparison-type-carry">Your chosen flight type and years carry into the aircraft view.</p></aside>
      </div>`}
    <details class="evidence-source comparison-source"><summary>Source, scope & selection</summary>
      <p>Worldwide archive · 1970–2024 · recorded airborne phases. Counts describe records in this archive; they do not estimate accident probability per flight or rank operational or manufacturer safety. Fleet size, flight activity, mission and reporting coverage are not controlled here.</p>
      <p class="comparison-source-age"></p>
      <p>Manufacturer labels come from a reviewed list of literal aircraft-name prefixes, with unmatched names kept unclassified. They do not resolve historical ownership or prove that a manufacturer caused an accident. Aircraft age uses the crash year minus the recorded manufacture year.</p>
      <p>Original source IDs are preserved throughout brushing, grouping and record inspection. <a href="${data.source.url}" target="_blank" rel="noreferrer">MauroPello · PlaneCrashData</a> · CC BY 4.0 · retained revision ${data.source.revision.slice(0,12)}.</p>
      <p><a href="${import.meta.env.BASE_URL}data/comparison-records.json" download>Download the retained comparison records</a></p>
    </details>`;
  const q=selector=>root.querySelector(selector);
  const option=(value,label)=>{const node=document.createElement('option');node.value=value;node.textContent=label;return node;};
  q('[data-operation]').append(option('all','All kinds of flying'),...Object.entries(labels).map(([value,label])=>option(value,label)));
  let active=false,destroyed=false,brushing=false,scatterKey='',selectionKey='',limit=8,currentSelected=[];
  const editingYears=new Set();
  let scatter,points,x,brush,brushLayer;
  const eligible=data.records.filter(row=>!aircraft || row.age!==null);
  const skipped=data.records.length-eligible.length;
  q('.comparison-source-age').textContent=aircraft
    ? `${number(skipped)} records with missing or invalid manufacture years are omitted from both the scatterplot and its linked breakdown. ${number(eligible.length)} usable-age records remain across all flight types. The time and type choices carry between chapters; the preceding flight-type chart also includes unknown-age records.`
    : `All ${number(data.records.length)} airborne-phase records are eligible here, including records without usable aircraft ages. The following age scatterplot omits those records. No raw record is deleted from the retained source.`;
  q('[data-operation]').addEventListener('change',event=>change({operation:event.target.value}));
  function applyYears(which) {
    editingYears.delete(which);
    let start=Number(q('[data-start]').value),end=Number(q('[data-end]').value)+1;
    if(!Number.isInteger(start)||!Number.isInteger(end)){render();return;}
    start=Math.max(1970,Math.min(2024,start));end=Math.max(1971,Math.min(2025,end));
    if(start>=end){if(which==='start')end=start+1;else start=end-1;}
    change({start,end});render();
  }
  q('[data-start]').addEventListener('change',()=>applyYears('start'));
  q('[data-end]').addEventListener('change',()=>applyYears('end'));
  q('[data-start]').addEventListener('input',()=>editingYears.add('start'));
  q('[data-end]').addEventListener('input',()=>editingYears.add('end'));
  q('[data-reset-years]').addEventListener('click',()=>change({start:1970,end:2025}));
  q('[data-clear-maker]').addEventListener('click',()=>change({manufacturer:null}));
  root.addEventListener('keydown',event=>{
    if(event.target.closest('button,input,select,summary,a,[role="button"]'))event.stopPropagation();
  });
  if(aircraft) {
    q('[data-manufacturer]').append(option('','All manufacturers'),...cells(eligible,'manufacturer').sort((a,b)=>a.label.localeCompare(b.label)).map(c=>option(c.label,c.label)));
    q('[data-manufacturer]').addEventListener('change',event=>change({manufacturer:event.target.value||null}));
    q('[data-more]').addEventListener('click',()=>{limit+=8;renderRecords();});
    q('[data-download]').addEventListener('click',()=>{
      const payload={source:data.source,filter:{...shared,ageRequired:true,phases:data.scope.phases},recordIds:ids(currentSelected),records:currentSelected.map(({time,...r})=>r)};
      const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='crashalot-selection.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
  }
  function recordBars(element,rows,{interactive=false}={}) {
    const scale=scaleLinear().domain([0,max(rows,r=>r.count)||1]).range([0,100]);
    const nodes=select(element).selectAll('.record-bar').data(rows,r=>r.label).join(enter=>{
      const row=enter.append(interactive?'button':'div').attr('class','record-bar');
      if(interactive)row.attr('type','button');
      row.append('span').attr('class','record-bar-name');row.append('strong');
      row.append('span').attr('class','record-bar-track').attr('aria-hidden','true').append('i');return row;
    });
    nodes.select('.record-bar-name').text(r=>r.label);nodes.select('strong').text(r=>number(r.count));
    nodes.select('i').style('width',r=>`${scale(r.count)}%`);
    if(interactive)nodes.attr('aria-pressed',r=>String(shared.manufacturer===r.label))
      .on('click',(_,r)=>change({manufacturer:shared.manufacturer===r.label?null:r.label}));
  }
  function drawTypes(typeCells) {
    const chart=select(q('.comparison-types-chart')),width=Math.max(260,q('.comparison-types-chart').clientWidth);
    const rowHeight=59,scale=scaleLinear().domain([0,max(typeCells,r=>r.count)||1]).range([0,width-8]);
    chart.attr('viewBox',`0 0 ${width} ${typeCells.length*rowHeight+12}`);
    const rows=chart.selectAll('g.type-row').data(typeCells,r=>r.label).join(enter=>{
      const row=enter.append('g').attr('class','type-row').attr('role','button').attr('tabindex',0);
      row.append('rect').attr('class','type-hit').attr('fill','transparent');
      row.append('text').attr('class','type-label');row.append('text').attr('class','type-value').attr('text-anchor','end');
      row.append('rect').attr('class','type-bar').attr('height',15);return row;
    });
    rows.attr('transform',(_,i)=>`translate(0,${i*rowHeight+4})`).attr('aria-pressed',r=>String(shared.operation===r.label))
      .attr('aria-label',r=>`${labels[r.label]}: ${number(r.count)} recorded crashes. Select this kind of flying.`)
      .classed('is-selected',r=>shared.operation===r.label)
      .on('click',(_,r)=>change({operation:r.label})).on('keydown',(event,r)=>{
        if(['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();change({operation:r.label});}
      });
    rows.select('.type-hit').attr('width',width).attr('height',rowHeight-3);
    rows.select('.type-label').attr('x',0).attr('y',17).text(r=>labels[r.label]);
    rows.select('.type-value').attr('x',width-4).attr('y',17).text(r=>number(r.count));
    rows.select('.type-bar').attr('x',0).attr('y',27).attr('width',r=>scale(r.count));
  }
  function drawScatter(base,selectedIds) {
    const width=Math.max(260,q('.comparison-scatter').clientWidth),height=340;
    const key=`${width}:${shared.operation}`;
    if(scatterKey!==key) {
      scatterKey=key;
      scatter=select(q('.comparison-scatter')).attr('viewBox',`0 0 ${width} ${height}`);
      scatter.selectAll('*').remove();
      x=scaleUtc().domain([new Date(Date.UTC(1970,0,1)),new Date(Date.UTC(2025,0,1))]).range([42,width-12]);
      const y=scaleLinear().domain([0,Math.max(10,Math.ceil((max(eligible,r=>r.age)||10)/10)*10)]).range([height-45,18]);
      scatter.append('g').attr('class','comparison-axis').attr('transform',`translate(42,0)`).call(axisLeft(y).ticks(5).tickSize(-(width-54))).call(g=>g.select('.domain').remove());
      scatter.append('g').attr('class','comparison-axis').attr('transform',`translate(0,${height-45})`).call(axisBottom(x).ticks(utcYear.every(width<500?20:10)).tickFormat(date=>String(date.getUTCFullYear())));
      scatter.append('text').attr('class','comparison-axis-title').attr('x',(width+30)/2).attr('y',height-5).attr('text-anchor','middle').text('Year of recorded crash');
      points=scatter.append('g').selectAll('circle').data(base,r=>r.source_id).join('circle')
        .attr('data-record-id',r=>r.source_id).attr('cx',r=>x(new Date(r.time))).attr('cy',r=>y(r.age)).attr('r',2.5);
      brush=brushX().extent([[42,12],[width-12,height-45]]).handleSize(12)
        .on('start',event=>{if(event.sourceEvent)brushing=true;})
        .on('brush end',event=>{
          if(!event.sourceEvent)return;
          if(event.type==='end')brushing=false;
          if(!event.selection){change({start:1970,end:2025});if(!brushing)syncBrush();return;}
          const [left,right]=event.selection.map(x.invert);
          const start=Math.max(1970,Math.min(2024,left.getUTCFullYear()));
          const boundary=Date.UTC(right.getUTCFullYear(),0,1);
          const end=Math.min(2025,Math.max(start+1,right.getUTCFullYear()+(+right>boundary?1:0)));
          change({start,end});if(!brushing)syncBrush();
        });
      brushLayer=scatter.append('g').attr('class','comparison-brush').call(brush);
    }
    points.attr('data-selected',r=>String(selectedIds.has(r.source_id))).attr('fill-opacity',r=>selectedIds.has(r.source_id) ? .65 : .055);
    if(!brushing)syncBrush();
  }
  function syncBrush() {
    if(!brushLayer)return;
    const selection=shared.start===1970 && shared.end===2025 ? null
      : [x(new Date(Date.UTC(shared.start,0,1))),x(new Date(Date.UTC(shared.end,0,1)))];
    brushLayer.call(brush.move,selection);
  }
  function renderRecords() {
    if(!aircraft)return;
    const shown=currentSelected.slice(0,limit);
    q('.comparison-record-caption').textContent=currentSelected.length
      ? `First ${number(shown.length)} of ${number(currentSelected.length)} selected records, ordered by date.`
      : 'No records match this selection.';
    const nodes=select(q('.comparison-record-list')).selectAll('li').data(shown,r=>r.source_id).join(enter=>{
      const node=enter.append('li');node.append('span').attr('class','comparison-record-date');node.append('strong');node.append('span').attr('class','comparison-record-meta');return node;
    });
    nodes.select('.comparison-record-date').text(r=>r.date);
    nodes.select('strong').text(r=>r.aircraft);
    nodes.select('.comparison-record-meta').text(r=>`${r.age} years old · ${number(r.fatalities)} fatalities · Source ID ${r.source_id}`);
    q('[data-more]').hidden=shown.length>=currentSelected.length;
    q('[data-download]').disabled=!currentSelected.length;
  }
  function render() {
    if(destroyed)return;
    if(!editingYears.has('start'))q('[data-start]').value=shared.start;
    if(!editingYears.has('end'))q('[data-end]').value=shared.end-1;
    q('[data-operation]').value=shared.operation;
    q('[data-clear-maker]').hidden=!shared.manufacturer;
    q('[data-clear-maker]').textContent=shared.manufacturer?`${shared.manufacturer} ×`:'';
    const context=eligible.filter(byYears).filter(byOperation);
    currentSelected=context.filter(byManufacturer);
    const selectedIds=new Set(ids(currentSelected));
    const makers=cells(context,'manufacturer'),models=cells(currentSelected,'aircraft');
    const typeContext=data.records.filter(byYears).filter(byManufacturer);
    const typeCells=Object.keys(labels).map(label=>{const records=typeContext.filter(r=>r.operation===label);return {label,count:records.length,recordIds:ids(records)};});
    const stateKey=JSON.stringify(shared);if(stateKey!==selectionKey){selectionKey=stateKey;limit=8;}
    root.dataset.selectionCount=String(currentSelected.length);root.dataset.startYear=String(shared.start);root.dataset.endYear=String(shared.end-1);
    root.comparisonState={source:data.source,kind,filter:{...shared,ageRequired:aircraft},recordIds:ids(currentSelected),recordKeys:currentSelected.map(r=>`${data.source.dataset}@${data.source.revision}:${r.source_id}`),contextRecordIds:ids(context),typeCells,manufacturerCells:makers,modelCells:models};
    q('.comparison-scope').textContent=`${shared.start}–${shared.end-1} · Worldwide · Recorded airborne phases${aircraft?' · Known aircraft age':''}`;
    if(aircraft) {
      q('[data-manufacturer]').value=shared.manufacturer||'';
      const displayed=makers.slice(0,7);
      if(shared.manufacturer&&!displayed.some(r=>r.label===shared.manufacturer)){
        const chosen=makers.find(r=>r.label===shared.manufacturer);if(chosen)displayed.push(chosen);
      }
      q('.comparison-manufacturer-context').textContent=`Recorded crashes · ${number(context.length)} in this time/type selection`;
      recordBars(q('.comparison-manufacturer-bars'),displayed,{interactive:true});
      recordBars(q('.comparison-model-bars'),models.slice(0,7));
      q('.comparison-selection').textContent=`${number(currentSelected.length)} selected records${shared.manufacturer?' · '+shared.manufacturer:''} · ${shared.operation==='all'?'All kinds of flying':labels[shared.operation]} · ${shared.start}–${shared.end-1}`;
      renderRecords();
      if(active)drawScatter(eligible.filter(byOperation),selectedIds);
    } else {
      if(active)drawTypes(typeCells);
      const label=shared.operation==='all'?'All kinds of flying':labels[shared.operation];
      q('.comparison-type-selection').textContent=`${label} · ${number(currentSelected.length)} recorded crashes in ${shared.start}–${shared.end-1}`;
    }
    root.dispatchEvent(new CustomEvent('crashalot:comparison-selection',{bubbles:true,detail:root.comparisonState}));
  }
  const observer=new ResizeObserver(()=>{if(active)render();});observer.observe(root);
  listeners.add(render);render();
  return {
    resize(){if(active){scatterKey='';render();}},
    setActive(value){active=value;if(active)render();},
    destroy(){destroyed=true;listeners.delete(render);observer.disconnect();root.remove();},
  };
}
export const mountFlightTypes=container=>mount(container,'types');
export const mountAircraftExplorer=container=>mount(container,'aircraft');
