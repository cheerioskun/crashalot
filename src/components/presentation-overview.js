// Keep Reveal's overview navigation, with an all-slide grid for this fluid layout.
export function installPresentationOverview({presentation,charts,finishSlide,suspendOpening,resume}) {
  const host=presentation.getRevealElement(),slides=presentation.getSlidesElement();
  const heading=document.createElement('div');heading.className='presentation-overview-heading';heading.hidden=true;
  heading.innerHTML='<div><h2>Choose a slide</h2><p>Open at its final reveal.</p></div><button type="button" class="text-button">Close overview</button>';
  host.append(heading);
  let chosen=null,previousFocus;
  const previous=new Map();
  function layout(){
    if(!presentation.isOverview())return;
    const width=Math.max(960,host.clientWidth),height=width*10/16;
    host.style.setProperty('--overview-deck-width',`${width}px`);
    host.style.setProperty('--overview-deck-height',`${height}px`);
    const cards=presentation.getHorizontalSlides();
    host.style.setProperty('--overview-card-height',`${cards[0].clientWidth*10/16}px`);
    for(const slide of cards)slide.style.setProperty('--overview-scale',slide.clientWidth/width);
  }
  function selectSlide(slide){
    chosen=slide;
    presentation.toggleOverview(false);
    presentation.slide(presentation.getHorizontalSlides().indexOf(slide));
  }
  // Capture the target before Reveal exits overview in its own section click handler.
  slides.addEventListener('click',event=>{
    if(presentation.isOverview())chosen=event.target.closest('.slides>section');
  },true);
  slides.addEventListener('keydown',event=>{
    if(!presentation.isOverview())return;
    const slide=event.target.closest('.slides>section');
    if(slide&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();event.stopPropagation();
      const list=presentation.getHorizontalSlides(),columns=getComputedStyle(slides).gridTemplateColumns.split(' ').length;
      const shift={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.key];
      list[Math.max(0,Math.min(list.length-1,list.indexOf(slide)+shift))].focus();
    }
    if(slide&&['Enter',' '].includes(event.key)){
      event.preventDefault();event.stopPropagation();selectSlide(slide);
    }
  },true);
  document.addEventListener('keydown',event=>{
    if(presentation.isOverview()&&event.key==='Escape'){
      event.preventDefault();event.stopImmediatePropagation();presentation.toggleOverview(false);
    }
  },true);
  heading.querySelector('button').addEventListener('click',()=>presentation.toggleOverview(false));
  presentation.on('overviewshown',()=>{
    previousFocus=document.activeElement;chosen=null;
    document.body.classList.add('presentation-overview');heading.hidden=false;
    charts().forEach(chart=>chart.setActive?.(false));suspendOpening();
    presentation.getHorizontalSlides().forEach((slide,index)=>{
      const view=slide.querySelector('.view');
      previous.set(slide,{tabindex:slide.getAttribute('tabindex'),role:slide.getAttribute('role'),label:slide.getAttribute('aria-label'),viewInert:view?.inert});
      const titleNode=slide.querySelector('h1');
      const title=titleNode?[...titleNode.childNodes].map(node=>node.textContent).join(' ').replace(/\s+/g,' ').trim():slide.dataset.beat;
      slide.dataset.overviewLabel=`${index+1} · ${title}`;
      slide.hidden=false;slide.removeAttribute('aria-hidden');
      slide.setAttribute('role','button');slide.setAttribute('tabindex','0');
      slide.setAttribute('aria-label',`Slide ${index+1}: ${title}. Open at final reveal.`);
      if(view)view.inert=true;
    });
    layout();heading.querySelector('button').focus({preventScroll:true});
  });
  presentation.on('overviewhidden',()=>{
    document.body.classList.remove('presentation-overview');heading.hidden=true;
    for(const [slide,saved]of previous){
      for(const key of ['tabindex','role'])saved[key]===null?slide.removeAttribute(key):slide.setAttribute(key,saved[key]);
      saved.label===null?slide.removeAttribute('aria-label'):slide.setAttribute('aria-label',saved.label);
      const view=slide.querySelector('.view');if(view)view.inert=saved.viewInert;
    }
    previous.clear();
    // Reveal's native click handler changes slides after emitting overviewhidden.
    queueMicrotask(()=>{
      resume();
      if(chosen){
        finishSlide(chosen);
        chosen.querySelector('.view')?.scrollTo({top:0,behavior:'instant'});
        const title=chosen.querySelector('h1');
        if(title){title.setAttribute('tabindex','-1');title.focus({preventScroll:true});}
      }else previousFocus?.focus?.({preventScroll:true});
      chosen=null;
    });
  });
  window.addEventListener('resize',layout);
}
