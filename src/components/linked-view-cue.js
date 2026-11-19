import './linked-view-cue.css';

export function createLinkedViewCue({view,section,target,label,className='',ready}) {
  const button=document.createElement('button');
  button.type='button';button.className=`linked-view-cue ${className}`.trim();button.hidden=true;
  const copy=document.createElement('span');copy.textContent=label;
  const arrow=document.createElement('span');arrow.className='linked-view-cue-arrow';arrow.textContent='↓';arrow.setAttribute('aria-hidden','true');
  button.append(copy,arrow);view.closest('section').append(button);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let active=false,frame=null,invited=false;
  function paint() {
    frame=null;
    const viewport=view.getBoundingClientRect(),bounds=section.getBoundingClientRect();
    const visibleHeight=Math.max(0,Math.min(viewport.bottom,bounds.bottom)-Math.max(viewport.top,bounds.top));
    const visibleWidth=Math.max(0,Math.min(viewport.right,bounds.right)-Math.max(viewport.left,bounds.left));
    const fraction=bounds.width*bounds.height ? visibleWidth*visibleHeight/(bounds.width*bounds.height) : 0;
    const show=active&&ready()&&bounds.height>0&&getComputedStyle(section).visibility==='visible'&&
      fraction<=.5&&bounds.top>viewport.top+24;
    button.hidden=!show;
    if(show&&!invited){button.classList.add('is-inviting');invited=true;}
    if(!show)button.classList.remove('is-inviting');
  }
  function refresh(){if(frame===null)frame=requestAnimationFrame(paint);}
  button.addEventListener('click',()=>{
    const top=view.scrollTop+target.getBoundingClientRect().top-view.getBoundingClientRect().top-24;
    target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
    view.scrollTo({top,behavior:reduced.matches?'instant':'smooth'});
  });
  const observer=new ResizeObserver(refresh);observer.observe(view);observer.observe(section);
  view.addEventListener('scroll',refresh,{passive:true});
  view.addEventListener('transitionend',refresh);
  return {
    refresh,
    setActive(value){active=value;if(!value){invited=false;button.classList.remove('is-inviting');button.hidden=true;}refresh();},
    destroy(){if(frame!==null)cancelAnimationFrame(frame);observer.disconnect();view.removeEventListener('scroll',refresh);view.removeEventListener('transitionend',refresh);button.remove();},
  };
}
