import {hierarchy,hsl,pack,select} from 'd3';
import catalogue from '../data/aircraft-schematics.json';

const number=new Intl.NumberFormat('en-US');
const percent=new Intl.NumberFormat('en-US',{style:'percent',maximumFractionDigits:1});
// Fixed yellow hue and lightness: only saturation varies with the fatal share.
export const modelColor=share=>hsl(46,share,.62).formatHsl();
const drawings=new Map(catalogue.models.map(model=>[model.model,model]));

export function createAircraftModelPacking({host,tooltip,onSelect}) {
  host.innerHTML=`<div class="model-packing-view">
    <div class="model-packing-head"><h2>Models in the selection</h2><p>Choose a circle to see the aircraft.</p></div>
    <div class="model-packing-key"><span>Circle area · recorded crashes</span><span class="model-saturation-key">Fatal share <i aria-hidden="true"></i><span>0% — 100%</span></span></div>
    <svg class="model-packing" role="group" aria-label="Aircraft models. Circle area shows recorded crash count; yellow saturation shows the share with fatalities."></svg>
    <p class="model-packing-empty" hidden>No models in this selection.</p>
  </div><aside class="model-schematic-panel" aria-label="Selected aircraft schematic">
    <label>Aircraft model<select data-model-choice aria-label="Aircraft model"></select></label>
    <div class="model-polaroid-stage" aria-live="polite"></div>
  </aside>`;
  const svg=select(host.querySelector('svg')),chooser=host.querySelector('[data-model-choice]'),stage=host.querySelector('.model-polaroid-stage');
  let selected=null,rows=[],geometry=[],layoutKey='',cardKey='',marks,progress=1;
  const hideTooltip=()=>{tooltip.hidden=true;};
  function showTooltip(event,node) {
    const cell=node.data;tooltip.replaceChildren();
    const name=document.createElement('strong');name.textContent=cell.label;
    const values=document.createElement('span');values.textContent=`${number.format(cell.count)} recorded crashes · ${number.format(cell.fatalCount)} fatal (${percent.format(cell.fatalCount/cell.count)})`;
    tooltip.append(name,values);tooltip.hidden=false;
    const box=event.currentTarget.getBoundingClientRect();
    tooltip.style.left=`${Math.max(12,Math.min(innerWidth-tooltip.offsetWidth-12,event.clientX||box.x+box.width/2))}px`;
    tooltip.style.top=`${Math.max(12,Math.min(innerHeight-tooltip.offsetHeight-12,box.bottom+7))}px`;
  }
  function showCard() {
    const cell=rows.find(row=>row.label===selected),drawing=drawings.get(selected);
    const key=selected||'';
    if(key!==cardKey||!stage.firstChild) {
      cardKey=key;
      const figure=document.createElement('figure');figure.className='hook-polaroid model-polaroid';
      const picture=document.createElement('div');picture.className='model-schematic-image';
      if(drawing?.asset) {
        const img=document.createElement('img');img.src=`${import.meta.env.BASE_URL}${drawing.asset}`;
        img.alt=drawing.alt||`${drawing.subject||selected} schematic`;img.decoding='async';
        img.addEventListener('error',()=>{picture.replaceChildren(placeholder('Schematic unavailable'));});
        picture.append(img);
      } else picture.append(placeholder(cell?'Schematic not available':'No aircraft selected'));
      const caption=document.createElement('figcaption'),name=document.createElement('span');name.textContent=selected||'Choose a model';caption.append(name);
      const stats=document.createElement('small');stats.className='model-schematic-stats';caption.append(stats);
      if(drawing?.asset) {
        const credit=document.createElement('a');credit.href=drawing.sourceUrl;credit.target='_blank';credit.rel='noreferrer';
        credit.textContent=drawing.credit;caption.append(credit);
        if(drawing.subject&&drawing.subject!==selected){const subject=document.createElement('small');subject.className='model-schematic-subject';subject.textContent=`Drawing: ${drawing.subject}`;caption.append(subject);}
      } else if(drawing?.reason) {
        const reason=document.createElement('small');reason.textContent=drawing.reason;caption.append(reason);
        if(drawing.referenceUrl){const link=document.createElement('a');link.href=drawing.referenceUrl;link.target='_blank';link.rel='noreferrer';link.textContent='Reviewed source listing';caption.append(link);}
      }
      figure.append(picture,caption);stage.replaceChildren(figure);
    }
    stage.querySelector('.model-schematic-stats').textContent=cell?`${number.format(cell.count)} recorded crashes · ${percent.format(cell.fatalCount/cell.count)} involved fatalities`:'';
    stage.dataset.model=selected||'';stage.dataset.hasSchematic=String(Boolean(drawing?.asset));
    chooser.value=selected||'';
    marks?.attr('aria-pressed',node=>String(node.data.label===selected)).attr('tabindex',node=>node.data.label===selected?0:-1);
  }
  function placeholder(text) {
    const empty=document.createElement('div');empty.className='model-schematic-placeholder';
    // A generic missing-image symbol, never presented as a drawing of the selected model.
    empty.innerHTML='<svg viewBox="0 0 180 140" fill="none" aria-hidden="true"><path d="M90 15v110M20 70h140" stroke="currentColor" opacity=".18" stroke-dasharray="4 5"/><path d="m90 31 8 48 42 20v7l-43-7-3 15h-8l-3-15-43 7v-7l42-20 8-48Z" stroke="currentColor" stroke-width="1.5"/></svg>';
    const label=document.createElement('span');label.textContent=text;empty.append(label);return empty;
  }
  function choose(label) {
    if(!rows.some(row=>row.label===label))return;
    selected=label;hideTooltip();showCard();onSelect(selected);
  }
  chooser.addEventListener('change',()=>choose(chooser.value));
  function reveal(value) {
    if(progress===0&&value>0) {
      const card=stage.firstElementChild;
      if(card){card.style.animation='none';void card.offsetWidth;card.style.animation='';}
    }
    progress=value;
    marks?.select('circle').attr('r',node=>node.r*Math.sqrt(value));
    marks?.select('text').attr('opacity',value===1?1:0);
    host.querySelector('.model-schematic-panel').style.opacity=String(value);
  }
  return {
    render(cells) {
      rows=[...cells].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
      if(!rows.some(row=>row.label===selected))selected=rows[0]?.label||null;
      const width=Math.max(260,host.querySelector('.model-packing-view').clientWidth||620),size=Math.min(720,width);
      const key=JSON.stringify([size,rows.map(row=>[row.label,row.count,row.fatalCount])]);
      if(key!==layoutKey) {
        layoutKey=key;hideTooltip();
        const root=hierarchy({children:rows}).sum(row=>row.count||0).sort((a,b)=>b.value-a.value||a.data.label?.localeCompare(b.data.label));
        pack().size([size,size]).padding(1.3)(root);
        const nodes=root.leaves().filter(node=>node.data.count);
        svg.attr('viewBox',`-3 -3 ${size+6} ${size+6}`);
        marks=svg.selectAll('.model-circle').data(nodes,node=>node.data.label).join(enter=>{
          const node=enter.append('g').attr('class','model-circle').attr('role','button').attr('tabindex',0);
          node.append('circle');node.append('text').attr('text-anchor','middle').attr('dominant-baseline','middle').attr('pointer-events','none');return node;
        });
        marks.attr('transform',node=>`translate(${node.x},${node.y})`).attr('data-model',node=>node.data.label)
          .attr('aria-label',node=>`${node.data.label}: ${number.format(node.data.count)} recorded crashes; ${percent.format(node.data.fatalCount/node.data.count)} with fatalities. Show schematic.`)
          .on('pointerenter focus',showTooltip).on('pointermove',showTooltip).on('pointerleave blur',hideTooltip)
          .on('click',(_,node)=>choose(node.data.label)).on('keydown',(event,node)=>{
            if(['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();choose(node.data.label);}
            const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
            if(direction){
              event.preventDefault();event.stopPropagation();
              const [dx,dy]=direction;
              const candidates=marks.data().filter(other=>(other.x-node.x)*dx+(other.y-node.y)*dy>1);
              const score=other=>Math.hypot(other.x-node.x,other.y-node.y)+2*Math.abs((other.x-node.x)*dy-(other.y-node.y)*dx);
              const target=candidates.sort((a,b)=>score(a)-score(b))[0];
              if(target){marks.attr('tabindex',other=>other===target?0:-1);marks.filter(other=>other===target).node().focus();}
            }
          });
        marks.select('circle').attr('fill',node=>modelColor(node.data.fatalCount/node.data.count));
        marks.select('text').each(function(node){
          const text=select(this);text.selectAll('*').remove();
          if(node.r<29)return;
          const name=node.data.label.replace(/\s*\([^)]*\)/g,'').replace(/^(PZL-Mielec|Douglas|Britten-Norman|Piper|De Havilland|Cessna|Beechcraft|Lockheed|Mitsubishi|Fokker|Pilatus|Antonov|Let|Boeing)\s+/,'').replaceAll('/',' ');
          const words=name.split(' '),lines=[];
          const measure=value=>{text.text(value);return text.node().getComputedTextLength()||value.length*5.8;};
          let line='';
          for(const word of words){if(line&&measure(line+' '+word)>node.r*1.55){lines.push(line);line=word;}else line+=(line?' ':'')+word;}
          if(line)lines.push(line);
          text.text(null);
          lines.slice(0,3).forEach((line,index)=>{
            const span=text.append('tspan').attr('x',0).attr('dy',index?13:-(Math.min(3,lines.length)-1)*6.5).text(line);
            while(span.node().getComputedTextLength()>node.r*1.55&&line.length>2){line=line.slice(0,-1);span.text(line+'…');}
          });
        });
        select(chooser).selectAll('option').data(rows,row=>row.label).join('option').attr('value',row=>row.label).text(row=>row.label);
        geometry=nodes.map(node=>({model:node.data.label,x:node.x,y:node.y,r:node.r,count:node.data.count,fatalCount:node.data.fatalCount,fatalShare:node.data.fatalCount/node.data.count,fill:modelColor(node.data.fatalCount/node.data.count),recordIds:node.data.recordIds}));
      }
      // Two periods can have identical totals but different source occurrences.
      // Reuse their geometry, never the old membership behind those circles.
      const currentCells=new Map(rows.map(row=>[row.label,row]));
      marks?.each(node=>{node.data=currentCells.get(node.data.label);});
      geometry=geometry.map(circle=>({...circle,recordIds:currentCells.get(circle.model).recordIds}));
      chooser.disabled=!rows.length;host.querySelector('.model-packing-empty').hidden=Boolean(rows.length);svg.attr('hidden',rows.length?null:'');
      showCard();reveal(progress);
      return {circles:geometry,selectedModel:selected};
    },
    reveal,
  };
}
