import {area,axisBottom,curveMonotoneX,format,group,max,pointer,range,scaleBand,scaleLinear,select} from 'd3';

const integer=format(',d');
// Standard ridgeline structure: a category band scale plus one shared linear
// height scale. See the D3 Graph Gallery and Visdecode references in the docs.
export function createFlightTypeRidgeline({element,tooltip,labels,onSelect}){
 const svg=select(element);let series=[],x,y,height,plotLeft,plotRight,chosen='all',start,end,focusedYear=null;
 let lastReveal={stage:0,progress:1};
 // Largest recent tail at the back; scheduled service stays in the foreground.
 const operations=['private','charter','scheduled'],overlap=3.5;
 const id=`type-trail-${element.closest('section').id}`;
 const defs=svg.append('defs');
 defs.append('clipPath').attr('id',id).append('rect');
 // Share the gradient's count scale across all ridges, rather than stretching
 // it to each profile's peak. An opaque base preserves back-to-front occlusion.
 const gradient=defs.append('linearGradient').attr('id',`${id}-height`).attr('class','ridge-height-gradient')
  .attr('gradientUnits','userSpaceOnUse').attr('x1',0).attr('x2',0).attr('y1',0);
 gradient.selectAll('stop').data([0,.18,.55,1]).join('stop').attr('offset',d=>`${d*100}%`).attr('class',(_,i)=>`ridge-height-stop ridge-height-stop-${i}`);
 const grid=svg.append('g').attr('class','trail-grid');
 const marks=svg.append('g').attr('class','trail-marks');
 const cursor=svg.append('g').attr('class','trail-cursor').attr('pointer-events','none').attr('visibility','hidden');
 cursor.append('path').attr('class','trail-inspect-area').attr('fill',`url(#${id}-height)`);
 const guides=cursor.append('g').attr('class','ridge-count-guides');
 cursor.append('path').attr('class','trail-inspect-profile');cursor.append('line').attr('class','trail-year-cursor');cursor.append('circle').attr('class','trail-fatal-dot').attr('r',3.5);
 const axis=svg.append('g').attr('class','comparison-axis trail-axis');
 svg.append('text').attr('class','comparison-axis-title trail-axis-title').attr('text-anchor','middle').text('Year of recorded crash');
 const visibleProgress=row=>Number(row.getAttribute('data-trail-progress')||0);
 function positionAxis(baseline){axis.attr('transform',`translate(0,${baseline})`);svg.select('.trail-axis-title').attr('y',baseline+39);}
 function hide(){tooltip.hidden=true;cursor.attr('visibility','hidden');marks.classed('has-inspection',false).selectAll('.type-row').classed('is-inspected',false);if(height)positionAxis(height-48);}
 function inspect(event,row,year){
  if(visibleProgress(event.currentTarget)<.99)return;
  const annual=row.years.find(d=>d.year===year);if(!annual)return;
  focusedYear=year;marks.classed('has-inspection',true).selectAll('.type-row').classed('is-inspected',d=>d===row);
  cursor.attr('visibility','visible');
  cursor.select('.trail-inspect-area').attr('d',select(event.currentTarget).select('.trail-fatal').attr('d')).attr('transform',`translate(0,${row.baseline})`);
  cursor.select('.trail-inspect-profile').attr('d',select(event.currentTarget).select('.trail-fatal-line').attr('d')).attr('transform',`translate(0,${row.baseline})`);
  positionAxis(row.baseline);
  guides.attr('transform',`translate(0,${row.baseline})`).selectAll('g').data(y.ticks(3).filter(value=>value>0)).join(enter=>{const tick=enter.append('g');tick.append('line');tick.append('text');return tick;})
   .each(function(value){select(this).select('line').attr('x1',plotLeft).attr('x2',plotRight).attr('y1',y(value)).attr('y2',y(value));select(this).select('text').attr('x',plotLeft-8).attr('y',y(value)+3).attr('text-anchor','end').text(value);});
  cursor.select('.trail-year-cursor').attr('x1',x(year)).attr('x2',x(year)).attr('y1',row.baseline+y(y.domain()[1])).attr('y2',row.baseline);
  cursor.select('.trail-fatal-dot').attr('cx',x(year)).attr('cy',row.baseline+y(annual.fatalCount));
  tooltip.replaceChildren();
  for(const [tag,text] of [['strong',`${labels[row.label]} · ${year}`],['span',`${integer(annual.count)} fatal crashes`],['span',`${start}–${end}: ${integer(row.count)} fatal crashes`]]){
   const node=document.createElement(tag);node.textContent=text;tooltip.append(node);
  }
  tooltip.hidden=false;
  const anchor=new DOMPoint(x(year),row.baseline+y(annual.fatalCount)).matrixTransform(element.getScreenCTM());
  const left=event.clientX??anchor.x,top=event.clientY??anchor.y;
  tooltip.style.left=`${Math.max(12,Math.min(innerWidth-tooltip.offsetWidth-12,left+14))}px`;
  tooltip.style.top=`${Math.max(12,Math.min(innerHeight-tooltip.offsetHeight-12,top+16))}px`;
 }
 function toggle(row){onSelect(chosen===row.label?'all':row.label);}
 return {
  render(records,selection){
   hide();({start,end,operation:chosen}=selection);end-=1;
   const width=Math.max(260,element.clientWidth),narrow=width<500;
   const activityScale=scaleBand().domain(operations).range([0,150]);
   const rowHeight=activityScale.step(),amplitude=overlap*rowHeight;
   plotLeft=narrow?28:36;plotRight=width-(narrow?106:144);
   x=scaleLinear().domain([start-.5,end+.5]).range([plotLeft,plotRight]);
   const byType=group(records.filter(r=>r.fatalities>0),r=>r.operation);
   series=operations.map(label=>{
    const rows=byType.get(label)||[],byYear=group(rows,r=>r.year);
    return {label,baseline:amplitude+12+activityScale(label),count:rows.length,fatalCount:rows.filter(r=>r.fatalities>0).length,recordIds:rows.map(r=>r.source_id),years:range(start,end+1).map(year=>{
     const records=byYear.get(year)||[],fatal=records.filter(r=>r.fatalities>0);
     return {year,count:records.length,fatalCount:fatal.length,recordIds:records.map(r=>r.source_id),fatalRecordIds:fatal.map(r=>r.source_id)};
    })};
   });
   height=amplitude+12+(series.length-1)*rowHeight+65;
   const maximum=max(series,row=>max(row.years,d=>d.count))||1;
   y=scaleLinear().domain([0,maximum]).range([0,-amplitude]);
   gradient.attr('y2',-amplitude);
   svg.attr('viewBox',`0 0 ${width} ${height}`).attr('aria-label',`Ridgeline chart of fatal crashes per year: scheduled revenue, private and charter / taxi, ${start}–${end}. Hover a trail for annual counts. Click or press Enter to choose a flight type; left and right arrows inspect years.`);
   svg.select('clipPath rect').attr('x',plotLeft).attr('y',-amplitude-3).attr('width',plotRight-plotLeft).attr('height',amplitude+6);
   const ticks=[...new Set([start,...range(Math.ceil(start/10)*10,end,10),end])];
   const shownTicks=narrow&&ticks.length>4?[start,...ticks.filter(t=>t>start+5&&t<end-5&&t%20===0),end]:ticks;
   grid.selectAll('line').data(shownTicks).join('line').attr('x1',x).attr('x2',x).attr('y1',10).attr('y2',height-53);
   axis.call(axisBottom(x).tickValues(shownTicks).tickFormat(String).tickSize(4));positionAxis(height-48);
   svg.select('.trail-axis-title').attr('x',(plotLeft+plotRight)/2);
   const rows=marks.selectAll('.type-row').data(series,r=>r.label).join(enter=>{
    const row=enter.append('g').attr('class','type-row ridge').attr('role','button').attr('tabindex',0);
    row.append('line').attr('class','trail-baseline');
    const paths=row.append('g').attr('class','ridge-shape').attr('clip-path',`url(#${id})`);
    paths.append('path').attr('class','trail-area trail-fatal').attr('fill',`url(#${id}-height)`);
    paths.append('path').attr('class','trail-line trail-fatal-line');
    row.append('text').attr('class','type-label');row.append('rect').attr('class','type-hit').attr('fill','transparent');return row;
   });
   rows.order().attr('transform',row=>`translate(0,${row.baseline})`).attr('aria-pressed',row=>String(chosen===row.label)).classed('is-selected',row=>chosen===row.label)
    .attr('aria-label',row=>`${labels[row.label]}: ${integer(row.count)} fatal crashes, ${start}–${end}. Select this kind of flying.`)
    .on('pointerenter pointermove',(event,row)=>{
     const [local]=pointer(event,element);
     inspect(event,row,Math.max(start,Math.min(end,Math.round(x.invert(local)))));
    }).on('focus',(event,row)=>inspect(event,row,focusedYear??end)).on('pointerleave blur',hide)
    .on('click',(_,row)=>toggle(row)).on('keydown',(event,row)=>{
     if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
      event.preventDefault();event.stopPropagation();
      const year=event.key==='Home'?start:event.key==='End'?end:Math.max(start,Math.min(end,(focusedYear??end)+(event.key==='ArrowLeft'?-1:1)));
      inspect(event,row,year);
     }else if(['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();toggle(row);}
     else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();hide();}
    });
   rows.select('.trail-baseline').attr('x1',plotLeft).attr('x2',plotRight).attr('y1',0).attr('y2',0);
   rows.select('.type-label').attr('x',plotRight+12).attr('y',4).text(row=>labels[row.label]);
   rows.select('.type-hit').attr('x',plotRight+4).attr('y',-20).attr('width',width-plotRight-4).attr('height',40);
   this.reveal(lastReveal);
   return {start,end,maximum,series,layout:{type:'ridgeline',rowSpacing:rowHeight,amplitude,overlap,overlapping:true},outcome:'fatal'};
  },
  reveal(state){
   lastReveal=state;
   const {stage,progress}=state;
   marks.selectAll('.type-row').each(function(row){
    const p=stage===0?0:stage===1?(row.label==='scheduled'?progress:0):stage===2?(row.label==='scheduled'?1:progress):1;
    select(this).attr('data-trail-progress',p).attr('aria-disabled',String(p<.99));
    // A one-year brush still occupies a full calendar-year bin.
    const samples=row.years.length===1?[{...row.years[0],year:row.years[0].year-.5},row.years[0],{...row.years[0],year:row.years[0].year+.5}]:row.years;
    const areaGenerator=area().x(d=>x(d.year)).y0(0).y1(d=>y(d.count)*p).curve(curveMonotoneX);
    select(this).select('.trail-fatal').attr('d',areaGenerator(samples)).attr('opacity',p>0?1:0);
    select(this).select('.trail-fatal-line').attr('d',areaGenerator.lineY1()(samples)).attr('opacity',p>0?1:0);
   });
  },
  hide,
 };
}
