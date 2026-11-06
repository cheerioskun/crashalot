import {axisBottom,axisLeft,bin,brushX,format,group,max,quantileSorted,range,scaleLinear,scaleUtc,select,utcYear} from 'd3';
import './comparison-explorer.css';
import {createComparisonBeats} from './comparison-beats.js';

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
  return [...group(rows,row=>row[key])].map(([label,records])=>({label,count:records.length,fatalCount:records.filter(r=>r.fatalities>0).length,recordIds:records.map(r=>r.source_id),fatalRecordIds:records.filter(r=>r.fatalities>0).map(r=>r.source_id)}))
    .sort((a,b)=>b.fatalCount-a.fatalCount || b.count-a.count || a.label.localeCompare(b.label));
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
    <p class="comparison-scope"></p><div class="comparison-outcome-key" aria-label="Crash outcomes"><span><i class="outcome-fatal"></i>Fatal crashes</span><span><i class="outcome-nonfatal"></i>Nonfatal crashes</span></div>
    ${aircraft ? `
      <div class="aircraft-comparison-grid">
        <div class="comparison-scatter-wrap">
          <p class="comparison-measure">Aircraft age at recorded crash · years</p>
          <svg class="comparison-scatter" role="group" aria-label="Crash date versus aircraft age. Drag across years to select records; the year fields provide a keyboard alternative."></svg>
          <p class="comparison-brush-hint">Drag across years. The bars on the selection’s right edge show aircraft ages in five-year groups.</p>
        </div>
        <aside class="comparison-linked">

          <div class="comparison-maker-controls"><h2>Aircraft in this period</h2>
          <label class="comparison-manufacturer">Manufacturer label <select data-manufacturer aria-label="Manufacturer"></select></label>
          <p class="comparison-manufacturer-context"></p>
          <div class="comparison-manufacturer-bars record-bars" aria-label="Manufacturers in the selected period"></div></div>
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
    <div class="comparison-tooltip" role="tooltip" hidden></div>
    <details class="evidence-source comparison-source"><summary>Source, scope & selection</summary>
      <p>Worldwide archive · 1970–2024 · recorded airborne phases. Counts describe records in this archive; they do not estimate accident probability per flight or rank operational or manufacturer safety. Fleet size, flight activity, mission and reporting coverage are not controlled here.</p>
      <p class="comparison-source-age"></p><p class="comparison-age-evidence" hidden>The archive contains crashes, not all aircraft in service or all flights. It cannot isolate how age changes per-flight risk. Regulatory context: <a href="https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-84_CHG_1.pdf" target="_blank" rel="noreferrer">FAA · Aging Aircraft Inspections and Records Reviews</a>; <a href="https://uscode.house.gov/us/usc/119-120/t49/s44717/" target="_blank" rel="noreferrer">49 U.S.C. § 44717</a>. These U.S. requirements are context, not a worldwide measure of maintenance compliance.</p>
      <p>Manufacturer labels come from a reviewed list of literal aircraft-name prefixes, with unmatched names kept unclassified. They do not resolve historical ownership or prove that a manufacturer caused an accident. Aircraft age uses the crash year minus the recorded manufacture year.</p>
      <p>Original source IDs are preserved throughout brushing, grouping and record inspection. <a href="${data.source.url}" target="_blank" rel="noreferrer">MauroPello · PlaneCrashData</a> · CC BY 4.0 · retained revision ${data.source.revision.slice(0,12)}.</p>
      <p><a href="${import.meta.env.BASE_URL}data/comparison-records.json" download>Download the retained comparison records</a></p>
    </details>`;
  const q=selector=>root.querySelector(selector);
  const option=(value,label)=>{const node=document.createElement('option');node.value=value;node.textContent=label;return node;};
  q('[data-operation]').append(option('all','All kinds of flying'),...Object.entries(labels).map(([value,label])=>option(value,label)));
  let active=false,destroyed=false,brushing=false,scatterKey='',selectionKey='',limit=8,currentSelected=[];
  const editingYears=new Set();
  let scatter,points,x,y,brush,brushLayer,histogramLayer,cohortLayer,pointReveal,typeRows,typeScale,narrative,lastStoryStage=-1,liveBrush=null;
  const ageCeiling=Math.max(10,Math.ceil((max(data.records,r=>r.age)||10)/5)*5+5);
  const ageBinner=bin().value(r=>r.age).domain([0,ageCeiling]).thresholds(range(5,ageCeiling,5));
  const eligible=data.records.filter(row=>!aircraft || row.age!==null);
  const skipped=data.records.length-eligible.length;
  q('.comparison-age-evidence').hidden=!aircraft;
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
  function describeOutcome(cell,label=cell.label) {
    return `${label}: ${number(cell.fatalCount)} fatal crashes, ${number(cell.count-cell.fatalCount)} nonfatal crashes; ${number(cell.count)} total.`;
  }
  function showOutcome(event,cell,label=cell.label) {
    const tooltip=q('.comparison-tooltip');
    tooltip.replaceChildren();
    const title=document.createElement('strong');title.textContent=label;
    const values=document.createElement('span');values.textContent=`${number(cell.fatalCount)} fatal · ${number(cell.count-cell.fatalCount)} nonfatal · ${number(cell.count)} total`;
    tooltip.append(title,values);tooltip.hidden=false;
    const bounds=event.currentTarget.getBoundingClientRect();
    const left=event.clientX || bounds.left+Math.min(100,bounds.width/2);
    tooltip.style.left=`${Math.max(12,Math.min(innerWidth-tooltip.offsetWidth-12,left))}px`;
    tooltip.style.top=`${Math.max(12,Math.min(innerHeight-tooltip.offsetHeight-12,bounds.bottom+7))}px`;
  }
  function hideOutcome() {q('.comparison-tooltip').hidden=true;}
  function recordBars(element,rows,{interactive=false}={}) {
    const scale=scaleLinear().domain([0,max(rows,r=>r.count)||1]).range([0,100]);
    const nodes=select(element).selectAll('.record-bar').data(rows,r=>r.label).join(enter=>{
      const row=enter.append(interactive?'button':'div').attr('class','record-bar');
      if(interactive)row.attr('type','button');
      row.append('span').attr('class','record-bar-name');row.append('strong');
      const track=row.append('span').attr('class','record-bar-track').attr('aria-hidden','true');track.append('i').attr('class','outcome-nonfatal');track.append('i').attr('class','outcome-fatal');return row;
    });
    nodes.select('.record-bar-name').text(r=>r.label);nodes.select('strong').text(r=>`${number(r.fatalCount)} fatal`);
    nodes.attr('aria-label',r=>describeOutcome(r)).attr('tabindex',interactive?null:0)
      .on('pointerenter focus',showOutcome).on('pointermove',showOutcome).on('pointerleave blur',hideOutcome);
    nodes.select('.outcome-nonfatal').style('left',r=>`${scale(r.fatalCount)}%`).style('width',r=>`${scale(r.count-r.fatalCount)}%`);
    nodes.select('.outcome-fatal').style('width',r=>`${scale(r.fatalCount)}%`);
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
      row.append('rect').attr('class','type-bar outcome-nonfatal').attr('height',15);row.append('rect').attr('class','type-bar outcome-fatal').attr('height',15);return row;
    });
    rows.attr('transform',(_,i)=>`translate(0,${i*rowHeight+4})`).attr('aria-pressed',r=>String(shared.operation===r.label))
      .attr('aria-label',r=>`${describeOutcome(r,labels[r.label])} Select this kind of flying.`)
      .classed('is-selected',r=>shared.operation===r.label)
      .on('pointerenter focus',(event,r)=>showOutcome(event,r,labels[r.label])).on('pointermove',(event,r)=>showOutcome(event,r,labels[r.label])).on('pointerleave blur',hideOutcome)
      .on('click',(_,r)=>change({operation:r.label})).on('keydown',(event,r)=>{
        if(['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();change({operation:r.label});}
      });
    rows.select('.type-hit').attr('width',width).attr('height',rowHeight-3);
    rows.select('.type-label').attr('x',0).attr('y',17).text(r=>labels[r.label]);
    rows.select('.type-value').attr('x',width-4).attr('y',17).text(r=>`${number(r.fatalCount)} fatal`);
    rows.select('.outcome-fatal').attr('x',0).attr('y',27).attr('width',r=>scale(r.fatalCount));
    rows.select('.outcome-nonfatal').attr('x',r=>scale(r.fatalCount)).attr('y',27).attr('width',r=>scale(r.count-r.fatalCount));
    typeRows=rows;typeScale=scale;
  }
  function drawScatter(base,selectedIds) {
    const width=Math.max(260,q('.comparison-scatter').clientWidth),height=340;
    const gutter=width<500?56:92,plotRight=width-gutter;
    const key=`${width}:${shared.operation}`;
    if(scatterKey!==key) {
      scatterKey=key;
      scatter=select(q('.comparison-scatter')).attr('viewBox',`0 0 ${width} ${height}`);
      scatter.selectAll('*').remove();
      x=scaleUtc().domain([new Date(Date.UTC(1970,0,1)),new Date(Date.UTC(2025,0,1))]).range([42,plotRight]);
      y=scaleLinear().domain([0,ageCeiling]).range([height-45,18]);
      scatter.append('g').attr('class','comparison-axis').attr('transform',`translate(42,0)`).call(axisLeft(y).ticks(5).tickSize(-(plotRight-42))).call(g=>g.select('.domain').remove());
      scatter.append('g').attr('class','comparison-axis').attr('transform',`translate(0,${height-45})`).call(axisBottom(x).ticks(utcYear.every(width<500?20:10)).tickFormat(date=>String(date.getUTCFullYear())));
      scatter.append('text').attr('class','comparison-axis-title').attr('x',(plotRight+42)/2).attr('y',height-5).attr('text-anchor','middle').text('Year of recorded crash');
      pointReveal=scatter.append('defs').append('clipPath').attr('id','comparison-points-reveal').append('rect').attr('x',42).attr('y',12).attr('height',height-57);
      points=scatter.append('g').attr('class','comparison-points').attr('clip-path','url(#comparison-points-reveal)').selectAll('circle').data(base,r=>r.source_id).join('circle')
        .attr('data-record-id',r=>r.source_id).attr('cx',r=>x(new Date(r.time))).attr('cy',r=>y(r.age)).attr('r',2.5);
      brush=brushX().extent([[42,12],[plotRight,height-45]]).handleSize(12)
        .on('start',event=>{if(event.sourceEvent)brushing=true;})
        .on('brush end',event=>{
          if(!event.sourceEvent)return;
          liveBrush=event.selection;
          if(event.type==='end'){brushing=false;liveBrush=null;}
          if(!event.selection||Math.abs(event.selection[1]-event.selection[0])<1){if(event.type!=='end')return;liveBrush=null;change({start:1970,end:2025});if(!brushing){syncBrush();drawAgeDistribution(width);}return;}
          const [left,right]=event.selection.map(x.invert);
          const start=Math.max(1970,Math.min(2024,left.getUTCFullYear()));
          const boundary=Date.UTC(right.getUTCFullYear(),0,1);
          const end=Math.min(2025,Math.max(start+1,right.getUTCFullYear()+(+right>boundary?1:0)));
          change({start,end});
          if(!brushing)syncBrush();drawAgeDistribution(width);
        });
      brushLayer=scatter.append('g').attr('class','comparison-brush').call(brush);
      cohortLayer=scatter.append('g').attr('class','comparison-age-annotation').attr('pointer-events','none');
      histogramLayer=scatter.append('g').attr('class','comparison-age-histogram').attr('role','group').attr('aria-label','Selected aircraft ages, five-year bins; widths encode record counts.');
    }
    points.attr('data-selected',r=>String(selectedIds.has(r.source_id))).attr('fill-opacity',r=>selectedIds.has(r.source_id) ? .65 : .055);
    if(!brushing)syncBrush();
    drawAgeDistribution(width);
    drawAgeSpread(base.filter(byManufacturer),width);
  }
  function syncBrush() {
    if(!brushLayer)return;
    const selection=shared.start===1970 && shared.end===2025 ? null
      : [x(new Date(Date.UTC(shared.start,0,1))),x(new Date(Date.UTC(shared.end,0,1)))];
    brushLayer.call(brush.move,selection);
  }
  function drawAgeDistribution(width) {
    const bins=ageBinner(currentSelected);
    const boundary=brushing&&liveBrush?liveBrush[1]:x(new Date(Date.UTC(shared.end,0,1)));
    const maxWidth=width<500?46:76;
    const largest=max(bins,b=>b.length)||0;
    const scale=scaleLinear().domain([0,largest||1]).range([0,maxWidth]);
    const rows=histogramLayer.selectAll('g.age-bin').data(bins,b=>b.x0).join(enter=>{
      const row=enter.append('g').attr('class','age-bin').attr('role','img').attr('tabindex',0);
      row.append('rect').attr('class','age-bin-nonfatal');row.append('rect').attr('class','age-bin-fatal');return row;
    });
    rows.attr('data-age-from',b=>b.x0).attr('data-count',b=>b.length)
      .attr('aria-label',b=>`${b.x0}–${b.x1-1} years: ${number(b.length)} selected records.`)
      .on('focus',(event,b)=>showOutcome(event,{label:`Age ${b.x0}–${b.x1-1}`,count:b.length,fatalCount:b.filter(r=>r.fatalities>0).length})).on('blur',hideOutcome);
    const geometry=(node,b,fatal)=>{
      const fatalWidth=scale(b.filter(r=>r.fatalities>0).length),totalWidth=scale(b.length);
      const target={x:boundary+(fatal?0:fatalWidth),width:fatal?fatalWidth:totalWidth-fatalWidth,y:y(b.x1)+.5,height:Math.max(0,y(b.x0)-y(b.x1)-1)};
      const selection=select(node);selection.interrupt('age-distribution');
      // Follow the pointer directly while dragging; ease discrete field/filter changes.
      const update=brushing||matchMedia('(prefers-reduced-motion: reduce)').matches||!node.hasAttribute('x')?selection:selection.transition('age-distribution').duration(180);
      for(const [key,value]of Object.entries(target))update.attr(key,value);
    };
    rows.select('.age-bin-nonfatal').each(function(b){geometry(this,b,false);});
    rows.select('.age-bin-fatal').each(function(b){geometry(this,b,true);});
    histogramLayer.selectAll('line').data([null]).join('line').attr('x1',boundary).attr('x2',boundary).attr('y1',18).attr('y2',295);
    const labelX=Math.max(46,Math.min(width-116,boundary));
    histogramLayer.selectAll('text').data([`Age counts · max ${number(largest)}`]).join('text').attr('x',labelX).attr('y',10).text(d=>d);
    root.comparisonState.ageBins=bins.map(b=>({from:b.x0,to:b.x1,count:b.length,fatalCount:b.filter(r=>r.fatalities>0).length,recordIds:ids(b)}));
    root.comparisonState.histogram={edge:boundary,maxWidth,maxCount:largest,binYears:5,direction:'outward'};
  }
  function drawAgeSpread(base,width) {
    const summarize=rows=>{
      const ages=rows.map(r=>r.age).sort((a,b)=>a-b);
      const p10=quantileSorted(ages,.1),p90=quantileSorted(ages,.9);
      return {count:rows.length,p10,p90,span:p90-p10,recordIds:ids(rows)};
    };
    const early=summarize(base.filter(r=>r.year<1990));
    const late=summarize(base.filter(r=>r.year>=2005));
    const widened=early.count>=10 && late.count>=10 && late.span>early.span;
    const lines=widened?['Aircraft ages at crash','become more spread out','as the years go by.']:['Aircraft ages at crash','span a range of ages','in the later years.'];
    cohortLayer.selectAll('*').remove();
    const labelX=width<500?48:65,labelY=35;
    const label=cohortLayer.append('text').attr('x',labelX).attr('y',labelY);
    lines.forEach((line,i)=>label.append('tspan').attr('x',labelX).attr('dy',i?16:0).attr('class',i?'':'age-annotation-title').text(line));
    const brackets=[{year:1980,stats:early},{year:2015,stats:late}].filter(d=>d.stats.count>=10);
    for(const {year,stats}of brackets){
      const at=x(new Date(Date.UTC(year,0,1))),top=y(stats.p90),bottom=y(stats.p10);
      cohortLayer.append('path').attr('class','age-spread-bracket').attr('d',`M${at-5},${top}H${at+5}M${at},${top}V${bottom}M${at-5},${bottom}H${at+5}`);
    }
    if(late.count>=10)cohortLayer.append('path').attr('class','cohort-connector').attr('d',`M${labelX+135},${labelY+40}L${x(new Date(Date.UTC(2015,0,1)))},${y(late.p90)-6}`);
    root.comparisonState.ageSpread={early:{years:[1970,1989],...early},late:{years:[2005,2024],...late},widened,annotation:lines.join(' ')};
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
    const typeCells=Object.keys(labels).map(label=>{const records=typeContext.filter(r=>r.operation===label);return {label,count:records.length,fatalCount:records.filter(r=>r.fatalities>0).length,recordIds:ids(records),fatalRecordIds:ids(records.filter(r=>r.fatalities>0))};});
    const stateKey=JSON.stringify(shared);if(stateKey!==selectionKey){selectionKey=stateKey;limit=8;}
    root.dataset.selectionCount=String(currentSelected.length);root.dataset.startYear=String(shared.start);root.dataset.endYear=String(shared.end-1);
    root.comparisonState={source:data.source,kind,filter:{...shared,ageRequired:aircraft},recordIds:ids(currentSelected),recordKeys:currentSelected.map(r=>`${data.source.dataset}@${data.source.revision}:${r.source_id}`),contextRecordIds:ids(context),typeCells,manufacturerCells:makers,modelCells:models};
    q('.comparison-scope').textContent=`${shared.start}–${shared.end-1} · Worldwide${aircraft?' · Known aircraft age':''}`;
    if(aircraft) {
      q('[data-manufacturer]').value=shared.manufacturer||'';
      const displayed=makers.slice(0,7);
      if(shared.manufacturer&&!displayed.some(r=>r.label===shared.manufacturer)){
        const chosen=makers.find(r=>r.label===shared.manufacturer);if(chosen)displayed.push(chosen);
      }
      q('.comparison-manufacturer-context').textContent='Click a choice to filter on it.';
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
    if(narrative)paintNarrative(narrative.state);
    root.dispatchEvent(new CustomEvent('crashalot:comparison-selection',{bubbles:true,detail:root.comparisonState}));
  }
  function paintNarrative({stage,progress,reduced}) {
    root.classList.toggle('is-exploring',stage===3);
    if(aircraft) {
      root.closest('section').dataset.aircraftBeat=String(stage);
      const intro=container.closest('main').querySelector('[data-aircraft-intro]');
      if(intro)intro.hidden=stage===0;
      for(const selector of ['.comparison-toolbar','.comparison-scope','.comparison-outcome-key','.aircraft-comparison-grid','.comparison-model-grid','.comparison-selection','.comparison-source'])q(selector).hidden=stage<2;
      const width=Math.max(260,q('.comparison-scatter').clientWidth);
      const graphProgress=stage<2?0:stage===2?progress:1;
      if(pointReveal)pointReveal.attr('width',(width-(width<500?56:92)-42)*graphProgress);
      select(q('.aircraft-comparison-grid')).style('opacity',stage===2?Math.min(1,progress*3):1);
      select(q('.aircraft-comparison-grid')).selectAll('.record-bar-track').style('transform',`scaleX(${graphProgress})`).style('transform-origin','left');
      cohortLayer?.attr('opacity',stage<3?0:progress);
      histogramLayer?.attr('opacity',graphProgress).attr('aria-hidden',String(stage<2));
      histogramLayer?.selectAll('.age-bin').attr('tabindex',b=>stage<2||!b.length?-1:0);
      q('.comparison-maker-controls').hidden=stage<2;
      q('.comparison-brush-hint').textContent=stage<2?'': 'Drag across years. Age distributions face outward from the selection’s right edge. Click outside the brush to clear it.';
    } else {
      if(typeRows) {
        const reveal=r=>stage===0?0:stage===1?(r.label==='scheduled'?progress:0):stage===2?(r.label==='scheduled'?1:progress):1;
        typeRows.select('.outcome-fatal').attr('width',r=>typeScale(r.fatalCount)*reveal(r));
        typeRows.select('.outcome-nonfatal').attr('x',r=>typeScale(r.fatalCount)*reveal(r)).attr('width',r=>typeScale(r.count-r.fatalCount)*reveal(r));
        typeRows.select('.type-value').attr('opacity',r=>reveal(r)>=1?1:0);
      }
      if(stage!==lastStoryStage){
        const stories=[['Different kinds of flying','An airline, a private aircraft and a training flight share the archive. They operate in different settings.'],['Start with scheduled services.','Scheduled revenue services form one part of this worldwide archive.'],['The archive extends beyond airlines.','Private, charter, cargo and training flights also contribute to the crash records.'],['Which flights belong in your comparison?','Choose a kind of flying to carry into the aircraft view. Comparing per-flight safety also requires flight activity for each group.']];
        q('.comparison-type-note h2').textContent=stories[stage][0];
        q('.comparison-type-note>p:not(.eyebrow)').textContent=stories[stage][1];
      }
    }
    if(stage!==lastStoryStage){
      const story=aircraft?container.closest('main').querySelector('[data-aircraft-intro]'):q('.comparison-type-note');
      story.classList.remove('comparison-copy-enter');
      if(!reduced&&(!aircraft||stage===1)){void story.offsetWidth;story.classList.add('comparison-copy-enter');}
      lastStoryStage=stage;
    }
  }
  narrative=createComparisonBeats({root,container,aircraft,paint:paintNarrative});
  // An intentional data interaction opens exploration immediately and suspends Auto.
  root.addEventListener('pointerdown',event=>{
    if(event.target.closest('input,select,.type-row,.record-bar,.comparison-brush,[data-reset-years],[data-clear-maker]'))narrative.explore();
  },true);
  root.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&event.target.closest('.type-row,.record-bar'))narrative.explore();},true);
  root.addEventListener('input',event=>{if(event.target.matches('input,select'))narrative.explore();},true);
  root.addEventListener('change',event=>{if(event.target.matches('input,select'))narrative.explore();},true);
  const observer=new ResizeObserver(()=>{if(active)render();});observer.observe(root);
  listeners.add(render);render();
  return {
    resize(){if(active){scatterKey='';render();}},
    setActive(value){active=value;narrative.setActive(value);if(active)render();},
    setPlaybackMode:value=>narrative.setPlaybackMode(value),
    getNavigationState:()=>narrative.getNavigationState(),
    finishBeat:()=>narrative.finishBeat(),
    nextBeat:()=>narrative.nextBeat(),
    previousBeat:()=>narrative.previousBeat(),
    showLastBeat:()=>narrative.showLastBeat(),
    destroy(){destroyed=true;narrative.destroy();listeners.delete(render);observer.disconnect();root.remove();},
  };
}
export const mountFlightTypes=container=>mount(container,'types');
export const mountAircraftExplorer=container=>mount(container,'aircraft');
