import {axisBottom,axisLeft,bin,brushX,easeCubicInOut,format,group,max,quantileSorted,range,scaleLinear,scaleUtc,select,utcYear} from 'd3';
import './comparison-explorer.css';
import {createComparisonBeats} from './comparison-beats.js';
import {createFlightTypeRidgeline} from './flight-type-ridgeline.js';
import {createAircraftModelPacking} from './aircraft-model-packing.js';

let dataset;
const shared={start:1970,end:2025,operation:'all',manufacturer:null};
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
  const namedOperations=Object.entries(labels).filter(([key])=>key!=='other');
  const root=document.createElement('div');root.className=`comparison-explorer comparison-${kind}`;
  container.replaceChildren(root);
  root.innerHTML=`
    ${aircraft?`<div class="comparison-toolbar">
      <fieldset class="comparison-years"><legend>Years</legend>
        <label>From <input type="number" min="1970" max="2024" data-start aria-label="First year"></label>
        <span aria-hidden="true">—</span>
        <label>To <input type="number" min="1970" max="2024" data-end aria-label="Last year"></label>
      </fieldset>
      <label class="comparison-operation">Kind of flying <select data-operation aria-label="Kind of flying"></select></label>
      <button type="button" class="text-button" data-reset-years>Reset years</button>
      <button type="button" class="text-button" data-clear-maker hidden></button>
    </div>
    `:''}<p class="comparison-scope"></p><div class="comparison-outcome-key" aria-label="Crash outcomes"><span><i class="outcome-fatal"></i>Fatal crashes</span>${aircraft?'<span><i class="outcome-nonfatal"></i>Nonfatal crashes</span>':''}</div>
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
      <div class="comparison-model-grid"></div>` : `
      <div class="type-comparison-grid">
        <div><p class="comparison-measure">Fatal crashes per year</p><svg class="comparison-types-chart" role="group" aria-label="Fatal crashes per year by kind of flying. Hover for counts; click to choose a flight type."></svg></div>
        <aside class="comparison-type-note"><p class="eyebrow">Beyond the airline headline</p><h2>Which flights are in the picture?</h2><p>A scheduled airline, a private aircraft and a charter operate in different settings. Their records belong to different comparisons.</p><p class="comparison-type-hint">Hover to inspect a year.<br>Click a trail to choose a kind of flying.</p></aside>
      </div>`}
    <div class="comparison-tooltip" role="tooltip" hidden></div>
    <details class="evidence-source comparison-source"><summary>Source, scope & selection</summary>
      <p>Worldwide archive · 1970–2024 · known airborne phases. Each record describes an aircraft involved in a crash; a collision may contribute two records. These counts have no flight-exposure denominator. The three overlapping trails show annual fatal crashes for Scheduled Revenue, Private and Charter/Taxi, all on the same vertical count scale. Opaque profiles overlap like layers in a landscape; the curves interpolate the yearly counts. Other flight types and nonfatal records are left out of those trails, but remain in “All kinds of flying” and the aircraft view.</p>
      ${aircraft?'':'<p>Safety context: <a href="https://www.ntsb.gov/safety/Pages/research.aspx" target="_blank" rel="noreferrer">NTSB 2024 U.S. aviation statistics, Table 1</a>: scheduled airline service had 0 fatal accidents per 100,000 flight hours; general aviation had 0.72. That exposure-based comparison supports the narration. The trails above show annual fatal-crash counts in the worldwide archive.</p>'}
      <p class="comparison-source-age"></p><p class="comparison-age-evidence" hidden>The archive contains crashes, not all aircraft in service or all flights. It cannot isolate how age changes per-flight risk. Regulatory context: <a href="https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-84_CHG_1.pdf" target="_blank" rel="noreferrer">FAA · Aging Aircraft Inspections and Records Reviews</a>; <a href="https://uscode.house.gov/us/usc/119-120/t49/s44717/" target="_blank" rel="noreferrer">49 U.S.C. § 44717</a>. These U.S. requirements are context, not a worldwide measure of maintenance compliance.</p>
      <p>Manufacturer labels use aircraft-name prefixes, preserving historical names. Unclassified names are omitted from the manufacturer choices and bars, but remain in the full scatter and model view. Aircraft age is crash year minus manufacture year.</p>
      <p>Original source IDs are preserved throughout brushing, grouping and the downloadable source data. <a href="${data.source.url}" target="_blank" rel="noreferrer">MauroPello · PlaneCrashData</a> · CC BY 4.0 · retained revision ${data.source.revision.slice(0,12)}.</p>
      <p><a href="${import.meta.env.BASE_URL}data/comparison-records.json" download>Download the retained comparison records</a></p>
    </details>`;
  const q=selector=>root.querySelector(selector);
  const option=(value,label)=>{const node=document.createElement('option');node.value=value;node.textContent=label;return node;};
  q('[data-operation]')?.append(option('all','All kinds of flying'),...namedOperations.map(([value,label])=>option(value,label)));
  let active=false,destroyed=false,brushing=false,scatterKey='',currentSelected=[];
  const editingYears=new Set();
  let scatter,points,pointYears,x,y,brush,brushLayer,histogramLayer,cohortLayer,narrative,lastStoryStage=-1,liveBrush=null;
  const ageCeiling=Math.max(10,Math.ceil((max(data.records,r=>r.age)||10)/5)*5+5);
  const ageBinner=bin().value(r=>r.age).domain([0,ageCeiling]).thresholds(range(5,ageCeiling,5));
  const eligible=data.records.filter(row=>!aircraft || row.age!==null);
  const skipped=data.records.length-eligible.length;
  q('.comparison-age-evidence').hidden=!aircraft;
  q('.comparison-source-age').textContent=aircraft
    ? `${number(skipped)} records with missing or invalid manufacture years are omitted from both the scatterplot and its linked breakdown. ${number(eligible.length)} usable-age records remain across all flight types. The time and type choices carry between chapters; the preceding flight-type chart also includes unknown-age records.`
    : `The retained source has ${number(data.records.length)} airborne-phase records, including unknown-age and nonfatal records. The three trails select fatal crashes in scheduled revenue, private and charter/taxi flying. Choosing a type carries that operation into the aircraft view, which includes both fatal and nonfatal crashes with a known aircraft age. No raw source record is deleted.`;
  q('[data-operation]')?.addEventListener('change',event=>change({operation:event.target.value}));
  function applyYears(which) {
    editingYears.delete(which);
    let start=Number(q('[data-start]').value),end=Number(q('[data-end]').value)+1;
    if(!Number.isInteger(start)||!Number.isInteger(end)){render();return;}
    start=Math.max(1970,Math.min(2024,start));end=Math.max(1971,Math.min(2025,end));
    if(start>=end){if(which==='start')end=start+1;else start=end-1;}
    change({start,end});render();
  }
  q('[data-start]')?.addEventListener('change',()=>applyYears('start'));
  q('[data-end]')?.addEventListener('change',()=>applyYears('end'));
  q('[data-start]')?.addEventListener('input',()=>editingYears.add('start'));
  q('[data-end]')?.addEventListener('input',()=>editingYears.add('end'));
  q('[data-reset-years]')?.addEventListener('click',()=>change({start:1970,end:2025}));
  q('[data-clear-maker]')?.addEventListener('click',()=>change({manufacturer:null}));
  root.addEventListener('keydown',event=>{
    if(event.key!=='Escape'&&event.target.closest('button,input,select,summary,a,[role="button"]'))event.stopPropagation();
  });
  if(aircraft) {
    q('[data-manufacturer]').append(option('','All manufacturers'),...cells(eligible,'manufacturer').filter(c=>c.label!=='Unclassified name').sort((a,b)=>a.label.localeCompare(b.label)).map(c=>option(c.label,c.label)));
    q('[data-manufacturer]').addEventListener('change',event=>change({manufacturer:event.target.value||null}));
  }
  const modelPacking=aircraft?createAircraftModelPacking({host:q('.comparison-model-grid'),tooltip:q('.comparison-tooltip'),onSelect:model=>{root.comparisonState.modelPacking.selectedModel=model;}}):null;
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
  const typeTrails=aircraft?null:createFlightTypeRidgeline({element:q('.comparison-types-chart'),tooltip:q('.comparison-tooltip'),labels,onSelect:operation=>change({operation})});
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
      // Fade successive year cohorts rather than wiping across already drawn marks.
      // Every circle keeps its source identity for the linked selection views.
      pointYears=scatter.append('g').attr('class','comparison-points').selectAll('g').data([...group(base,r=>r.year)].sort(([a],[b])=>a-b),d=>d[0]).join('g')
        .attr('class','comparison-point-year').attr('data-year',d=>d[0]);
      points=pointYears.selectAll('circle').data(([,records])=>records,r=>r.source_id).join('circle')
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
  function render() {
    if(destroyed)return;
    if(aircraft){
    if(!editingYears.has('start'))q('[data-start]').value=shared.start;
    if(!editingYears.has('end'))q('[data-end]').value=shared.end-1;
    q('[data-operation]').value=shared.operation;
    q('[data-clear-maker]').hidden=!shared.manufacturer;
    q('[data-clear-maker]').textContent=shared.manufacturer?`${shared.manufacturer} ×`:'';
    }
    const context=eligible.filter(byYears).filter(byOperation);
    currentSelected=aircraft?context.filter(byManufacturer):context;
    const selectedIds=new Set(ids(currentSelected));
    const makers=cells(context,'manufacturer'),models=cells(currentSelected,'aircraft');
    const typeContext=data.records.filter(byYears);
    const typeCells=Object.keys(labels).map(label=>{const records=typeContext.filter(r=>r.operation===label);return {label,count:records.length,fatalCount:records.filter(r=>r.fatalities>0).length,recordIds:ids(records),fatalRecordIds:ids(records.filter(r=>r.fatalities>0))};});
    root.dataset.selectionCount=String(currentSelected.length);root.dataset.startYear=String(shared.start);root.dataset.endYear=String(shared.end-1);
    root.comparisonState={source:data.source,kind,filter:{...shared,manufacturer:aircraft?shared.manufacturer:null,ageRequired:aircraft},recordIds:ids(currentSelected),recordKeys:currentSelected.map(r=>`${data.source.dataset}@${data.source.revision}:${r.source_id}`),contextRecordIds:ids(context),typeCells,manufacturerCells:makers,modelCells:models};
    q('.comparison-scope').textContent=`${shared.start}–${shared.end-1} · Worldwide${aircraft?' · Known aircraft age':''}`;
    if(aircraft) {
      q('[data-manufacturer]').value=shared.manufacturer||'';
      const displayed=makers.filter(c=>c.label!=='Unclassified name').slice(0,7);
      if(shared.manufacturer&&!displayed.some(r=>r.label===shared.manufacturer)){
        const chosen=makers.find(r=>r.label===shared.manufacturer);if(chosen)displayed.push(chosen);
      }
      q('.comparison-manufacturer-context').textContent='Click a choice to filter on it.';
      recordBars(q('.comparison-manufacturer-bars'),displayed,{interactive:true});
      root.comparisonState.modelPacking=modelPacking.render(models);
      q('.comparison-selection').textContent=`${number(currentSelected.length)} selected records${shared.manufacturer?' · '+shared.manufacturer:''} · ${shared.operation==='all'?'All kinds of flying':labels[shared.operation]} · ${shared.start}–${shared.end-1}`;
      if(active)drawScatter(eligible.filter(byOperation),selectedIds);
    } else {
      if(active)root.comparisonState.typeTrails=typeTrails.render(typeContext,shared);
    }
    if(narrative)paintNarrative(narrative.state);
    root.dispatchEvent(new CustomEvent('crashalot:comparison-selection',{bubbles:true,detail:root.comparisonState}));
  }
  function paintNarrative({stage,progress,reduced}) {
    root.classList.toggle('is-exploring',stage===(aircraft?4:3));
    if(aircraft) {
      root.closest('section').dataset.aircraftBeat=['0','1','2','3','3.5'][stage];
      const intro=container.closest('main').querySelector('[data-aircraft-intro]');
      if(intro)intro.hidden=stage===0;
      const scaffoldOpacity=stage===0?0:stage===1?easeCubicInOut(progress):1;
      if(intro)intro.style.opacity=String(scaffoldOpacity);
      for(const selector of ['.comparison-toolbar','.comparison-scope','.comparison-outcome-key','.aircraft-comparison-grid','.comparison-model-grid','.comparison-selection','.comparison-source']) {
        q(selector).hidden=stage<1;
        q(selector).style.opacity=String(scaffoldOpacity);
      }
      const graphProgress=stage<2?0:stage===2?progress:1;
      root.dataset.dataProgress=String(graphProgress);
      pointYears?.attr('opacity',([year])=>Math.max(0,Math.min(1,(graphProgress*59-(year-1970))/5)));
      select(q('.aircraft-comparison-grid')).selectAll('.record-bar>strong').style('opacity',graphProgress);
      q('.comparison-model-grid').hidden=stage<2;
      modelPacking.reveal(graphProgress);
      q('.comparison-selection').hidden=stage<2;
      select(q('.aircraft-comparison-grid')).selectAll('.record-bar-track').style('transform',`scaleX(${graphProgress})`).style('transform-origin','left');
      cohortLayer?.attr('opacity',stage<4?0:progress);
      histogramLayer?.attr('opacity',graphProgress).attr('aria-hidden',String(stage<2));
      histogramLayer?.selectAll('.age-bin').attr('tabindex',b=>stage<2||!b.length?-1:0);
      q('.comparison-maker-controls').hidden=stage<1;
      q('.comparison-brush-hint').textContent=stage<1?'': 'Drag across years. Age distributions face outward from the selection’s right edge. Click outside the brush to clear it.';
    } else {
      typeTrails.reveal({stage,progress});
      if(stage!==lastStoryStage){
        const stories=[
          ['A commercial airliner is really the safest bet.','Professional crews. Scheduled maintenance. A whole system built around getting passengers there safely.'],
          ['First, scheduled airlines.','These are the scheduled revenue flights we’ve followed so far.'],
          ['Private flying and charter flights.','Their fatal crashes appear in the same headlines as scheduled airlines.'],
          ['A commercial airliner is really the safest bet.','A crash headline can describe any one of these kinds of flying.'],
        ];
        q('.comparison-type-note h2').textContent=stories[stage][0];
        q('.comparison-type-note>p:not(.eyebrow)').textContent=stories[stage][1];
      }
    }
    if(stage!==lastStoryStage){
      const story=aircraft?container.closest('main').querySelector('[data-aircraft-intro]'):q('.comparison-type-note');
      story.classList.remove('comparison-copy-enter');
      if(!reduced&&!aircraft){void story.offsetWidth;story.classList.add('comparison-copy-enter');}
      lastStoryStage=stage;
    }
  }
  narrative=createComparisonBeats({root,container,aircraft,paint:paintNarrative});
  // An intentional data interaction opens exploration immediately and suspends Auto.
  root.addEventListener('pointerdown',event=>{
    if(event.target.closest('input,select,.type-row,.record-bar,.model-circle,.comparison-brush,[data-reset-years],[data-clear-maker]'))narrative.explore();
  },true);
  root.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&event.target.closest('.type-row,.record-bar,.model-circle'))narrative.explore();},true);
  root.addEventListener('input',event=>{if(event.target.matches('input,select'))narrative.explore();},true);
  root.addEventListener('change',event=>{if(event.target.matches('input,select'))narrative.explore();},true);
  const observer=new ResizeObserver(()=>{if(active)render();});observer.observe(root);
  listeners.add(render);render();
  return {
    resize(){if(active){scatterKey='';render();}},
    setActive(value){active=value;narrative.setActive(value);if(active)render();},
    setPlaybackMode:value=>narrative.setPlaybackMode(value),
    getNavigationState:()=>narrative.getNavigationState(),
    getPlaybackTiming:()=>narrative.getPlaybackTiming(),
    finishBeat:()=>narrative.finishBeat(),
    nextBeat:()=>narrative.nextBeat(),
    previousBeat:()=>narrative.previousBeat(),
    showLastBeat:()=>narrative.showLastBeat(),
    destroy(){destroyed=true;typeTrails?.hide();narrative.destroy();listeners.delete(render);observer.disconnect();root.remove();},
  };
}
export const mountFlightTypes=container=>mount(container,'types');
export const mountAircraftExplorer=container=>mount(container,'aircraft');
