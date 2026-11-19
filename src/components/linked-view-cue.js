import './linked-view-cue.css';

// A viewport-anchored invitation to an available linked view farther down the slide.
export function createLinkedViewCue({view,target,section,label,className='',ready}) {
  section.classList.add('linked-view-section');
  const button=document.createElement('button');
  button.type='button';button.className=`linked-view-cue ${className}`.trim();button.hidden=true;
  const copy=document.createElement('span');copy.textContent=label;
  const arrow=document.createElement('span');arrow.className='linked-view-cue-arrow';arrow.textContent='↓';arrow.setAttribute('aria-hidden','true');
  button.append(copy,arrow);view.closest('section').append(button);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let active=false,frame=null,invited=false;
  function paint() {
    frame=null;
    const viewport=view.getBoundingClientRect();
    if(active&&section.getClientRects().length&&matchMedia('(min-width: 981px)').matches) {
      // Let the upper view fill the screen, accounting for its actual heading,
      // controls and chart height rather than assuming a fixed desktop size.
      const margin=parseFloat(getComputedStyle(section).marginTop)||0;
      const naturalTop=section.getBoundingClientRect().top-margin-viewport.top+view.scrollTop;
      const gap=Math.max(32,view.clientHeight-naturalTop+32);
      section.style.setProperty('--linked-view-gap',`${gap}px`);
    }
    const heading=target.getBoundingClientRect();
    const show=active && ready() && view.scrollHeight>view.clientHeight+1 && heading.height>0 &&
      getComputedStyle(target).visibility==='visible' && heading.bottom>viewport.bottom-12;
    button.hidden=!show;
    if(show&&!invited){button.classList.add('is-inviting');invited=true;}
    if(!show)button.classList.remove('is-inviting');
  }
  function refresh(){if(frame===null)frame=requestAnimationFrame(paint);}
  button.addEventListener('click',()=>{
    const top=view.scrollTop+target.getBoundingClientRect().top-view.getBoundingClientRect().top-24;
    target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
    view.scrollTo({top,behavior:reduced.matches?'instant':'smooth'});
    button.hidden=true;
  });
  const observer=new ResizeObserver(refresh);observer.observe(view);observer.observe(target);
  view.addEventListener('scroll',refresh,{passive:true});
  view.addEventListener('transitionend',refresh);
  return {
    refresh,
    setActive(value){active=value;if(!value){invited=false;button.classList.remove('is-inviting');button.hidden=true;}refresh();},
    destroy(){if(frame!==null)cancelAnimationFrame(frame);observer.disconnect();view.removeEventListener('scroll',refresh);view.removeEventListener('transitionend',refresh);button.remove();},
  };
}
