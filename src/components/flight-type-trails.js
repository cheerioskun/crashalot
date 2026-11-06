import {area,axisBottom,curveMonotoneX,format,group,max,range,scaleLinear,select} from 'd3';

const integer=format(',d');
// Annual frequencies share one count scale. Curves only interpolate the observed
// years; no density normalization or per-flight risk is implied by their height.
export function createFlightTypeTrails({element,tooltip,labels,onSelect}){
 const svg=select(element);let series=[],x,y,height,plotLeft,plotRight,chosen='all',start,end,focusedYear=null;
 let lastReveal={stage:0,progress:1};
 const id=`type-trail-${element.closest('section').id}`;
 svg.append('defs').append('clipPath').attr('id',id).append('rect');
 const grid=svg.append('g').attr('class','trail-grid');
 const marks=svg.append('g').attr('class','trail-marks');
 const cursor=svg.append('g').attr('class','trail-cursor').attr('pointer-events','none').attr('visibility','hidden');
 cursor.append('line');cursor.append('circle').attr('class','trail-total-dot').attr('r',3);cursor.append('circle').attr('class','trail-fatal-dot').attr('r',3);
 const axis=svg.append('g').attr('class','comparison-axis trail-axis');
 svg.append('text').attr('class','comparison-axis-title trail-axis-title').attr('text-anchor','middle').text('Year of recorded crash');
 const visibleProgress=row=>Number(row.getAttribute('data-trail-progress')||0);
 function hide(){tooltip.hidden=true;cursor.attr('visibility','hidden');marks.selectAll('.type-row').classed('is-inspected',false);}
 function inspect(event,row,year){
  if(visibleProgress(event.currentTarget)<.99)return;
  const annual=row.years.find(d=>d.year===year);if(!annual)return;
  focusedYear=year;marks.selectAll('.type-row').classed('is-inspected',d=>d===row);
  cursor.attr('visibility','visible');
  cursor.select('line').attr('x1',x(year)).attr('x2',x(year)).attr('y1',14).attr('y2',height-53);
  cursor.select('.trail-total-dot').attr('cx',x(year)).attr('cy',row.baseline-y(annual.count));
  cursor.select('.trail-fatal-dot').attr('cx',x(year)).attr('cy',row.baseline-y(annual.fatalCount));
  tooltip.replaceChildren();
  for(const [tag,text] of [['strong',`${labels[row.label]} · ${year}`],['span',`${integer(annual.count)} recorded crashes · ${integer(annual.fatalCount)} fatal · ${integer(annual.count-annual.fatalCount)} nonfatal`],['span',`${start}–${end}: ${integer(row.count)} recorded crashes · ${integer(row.fatalCount)} fatal`]]){
   const node=document.createElement(tag);node.textContent=text;tooltip.append(node);
  }
  tooltip.hidden=false;
  const box=element.getBoundingClientRect(),left=event.clientX||box.left+x(year),top=event.clientY||box.top+row.baseline;
  tooltip.style.left=`${Math.max(12,Math.min(innerWidth-tooltip.offsetWidth-12,left+14))}px`;
  tooltip.style.top=`${Math.max(12,Math.min(innerHeight-tooltip.offsetHeight-12,top+16))}px`;
 }
 function toggle(row){onSelect(chosen===row.label?'all':row.label);}
 return {
  render(records,selection){
   hide();({start,end,operation:chosen}=selection);end-=1;
   const width=Math.max(260,element.clientWidth),narrow=width<500,rowHeight=narrow?62:59;
   plotLeft=narrow?102:132;plotRight=width-14;
   x=scaleLinear().domain([start-.5,end+.5]).range([plotLeft,plotRight]);
   const byType=group(records,r=>r.operation);
   series=Object.keys(labels).filter(key=>key!=='other').map((label,index)=>{
    const rows=byType.get(label)||[],byYear=group(rows,r=>r.year);
    return {label,baseline:63+index*rowHeight,count:rows.length,fatalCount:rows.filter(r=>r.fatalities>0).length,recordIds:rows.map(r=>r.source_id),years:range(start,end+1).map(year=>{
     const records=byYear.get(year)||[],fatal=records.filter(r=>r.fatalities>0);
     return {year,count:records.length,fatalCount:fatal.length,recordIds:records.map(r=>r.source_id),fatalRecordIds:fatal.map(r=>r.source_id)};
    })};
   });
   height=series.length*rowHeight+85;
   const maximum=max(series,row=>max(row.years,d=>d.count))||1;
   y=scaleLinear().domain([0,maximum]).range([0,rowHeight*1.08]);
   svg.attr('viewBox',`0 0 ${width} ${height}`).attr('aria-label',`Recorded crashes per year by kind of flying, ${start}–${end}. Hover a trail for annual counts. Click or press Enter to choose a flight type; left and right arrows inspect years.`);
   svg.select('clipPath rect').attr('x',plotLeft).attr('y',0).attr('width',plotRight-plotLeft).attr('height',height);
   const ticks=[...new Set([start,...range(Math.ceil(start/10)*10,end,10),end])];
   const shownTicks=narrow&&ticks.length>4?[start,...ticks.filter(t=>t>start+5&&t<end-5&&t%20===0),end]:ticks;
   grid.selectAll('line').data(shownTicks).join('line').attr('x1',x).attr('x2',x).attr('y1',10).attr('y2',height-53);
   axis.attr('transform',`translate(0,${height-48})`).call(axisBottom(x).tickValues(shownTicks).tickFormat(String).tickSize(4));
   svg.select('.trail-axis-title').attr('x',(plotLeft+plotRight)/2).attr('y',height-9);
   const rows=marks.selectAll('.type-row').data(series,r=>r.label).join(enter=>{
    const row=enter.append('g').attr('class','type-row').attr('role','button').attr('tabindex',0);
    row.append('line').attr('class','trail-baseline');
    const paths=row.append('g').attr('clip-path',`url(#${id})`);
    paths.append('path').attr('class','trail-area trail-total');paths.append('path').attr('class','trail-line trail-total-line');
    paths.append('path').attr('class','trail-area trail-fatal');paths.append('path').attr('class','trail-line trail-fatal-line');
    row.append('text').attr('class','type-label');row.append('rect').attr('class','type-hit').attr('fill','transparent');return row;
   });
   rows.attr('aria-pressed',row=>String(chosen===row.label)).classed('is-selected',row=>chosen===row.label)
    .attr('aria-label',row=>`${labels[row.label]}: ${integer(row.count)} recorded crashes, ${integer(row.fatalCount)} fatal, ${start}–${end}. Select this kind of flying.`)
    .on('pointerenter pointermove',(event,row)=>{
     const box=element.getBoundingClientRect(),local=(event.clientX-box.left)*width/box.width;
     inspect(event,row,Math.max(start,Math.min(end,Math.round(x.invert(local)))));
    }).on('focus',(event,row)=>inspect(event,row,focusedYear??end)).on('pointerleave blur',hide)
    .on('click',(_,row)=>toggle(row)).on('keydown',(event,row)=>{
     if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
      event.preventDefault();event.stopPropagation();
      const year=event.key==='Home'?start:event.key==='End'?end:Math.max(start,Math.min(end,(focusedYear??end)+(event.key==='ArrowLeft'?-1:1)));
      inspect(event,row,year);
     }else if(['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();toggle(row);}
     else if(event.key==='Escape')hide();
    });
   rows.select('.trail-baseline').attr('x1',plotLeft).attr('x2',plotRight).attr('y1',row=>row.baseline).attr('y2',row=>row.baseline);
   rows.select('.type-label').attr('x',0).attr('y',row=>row.baseline-6).text(row=>labels[row.label]);
   rows.select('.type-hit').attr('x',0).attr('y',row=>row.baseline-rowHeight+5).attr('width',width).attr('height',rowHeight-2);
   this.reveal(lastReveal);
   return {start,end,maximum,series};
  },
  reveal(state){
   lastReveal=state;
   const {stage,progress}=state;
   marks.selectAll('.type-row').each(function(row){
    const p=stage===0?0:stage===1?(row.label==='scheduled'?progress:0):stage===2?(row.label==='scheduled'?1:progress):1;
    select(this).attr('data-trail-progress',p).attr('aria-disabled',String(p<.99));
    // A one-year brush still occupies a full calendar-year bin.
    const samples=row.years.length===1?[{...row.years[0],year:row.years[0].year-.5},row.years[0],{...row.years[0],year:row.years[0].year+.5}]:row.years;
    for(const [key,areaClass,lineClass]of [['count','.trail-total','.trail-total-line'],['fatalCount','.trail-fatal','.trail-fatal-line']]){
     const generator=area().x(d=>x(d.year)).y0(row.baseline).y1(d=>row.baseline-y(d[key])*p).curve(curveMonotoneX);
     select(this).select(areaClass).attr('d',generator(samples)).attr('opacity',p>0?1:0);
     select(this).select(lineClass).attr('d',generator.lineY1()(samples)).attr('opacity',p>0?1:0);
    }
   });
  },
  hide,
 };
}
