// The footer reflects the same clock that schedules the next reveal.
export function createFooterBeatTimer({footer,read}){
 const position=footer.querySelector('[data-story-position]'),group=document.createElement('div');group.className='story-location';position.before(group);group.append(position);
 const label=document.createElement('span');label.className='beat-timer-label';label.setAttribute('aria-hidden','true');group.append(label);
 const wick=document.createElement('div');wick.className='beat-wick';wick.setAttribute('role','progressbar');wick.setAttribute('aria-label','Automatic beat timing');wick.setAttribute('aria-valuemin','0');wick.setAttribute('aria-valuemax','100');wick.innerHTML='<i></i>';footer.append(wick);
 let frame=null,lastMode='';
 function paint(){
  frame=null;
  const timing=read(),mode=timing?.mode||'hidden';
  footer.dataset.timingState=mode;
  const moving=mode==='countdown'||mode==='revealing',fraction=Math.max(0,Math.min(1,timing?.fraction||0));
  wick.style.setProperty('--beat-progress',fraction);wick.hidden=['hidden','start','loading'].includes(mode);
  wick.setAttribute('aria-valuenow',String(Math.round(fraction*100)));
  const seconds=Math.max(.1,Math.ceil((timing?.remainingMs||0)/100)/10).toFixed(1);
  const text=mode==='countdown'?`Next in ${seconds}s`:mode==='revealing'?`Revealing · ${seconds}s`:mode==='paused'?'Paused':mode==='next'?'Next when ready →':mode==='start'?'Next to begin':'';
  if(label.textContent!==text){label.textContent=text;wick.setAttribute('aria-valuetext',text);}
  if(lastMode!==mode){lastMode=mode;footer.dispatchEvent(new CustomEvent('crashalot:timer-state',{detail:mode}));}
  if(moving)frame=requestAnimationFrame(paint);
 }
 function refresh(){if(frame===null)frame=requestAnimationFrame(paint);}
 document.addEventListener('beattimingchange',refresh);document.addEventListener('visibilitychange',refresh);refresh();
 return {refresh,destroy(){if(frame!==null)cancelAnimationFrame(frame);document.removeEventListener('beattimingchange',refresh);document.removeEventListener('visibilitychange',refresh);wick.remove();label.remove();group.replaceWith(position);}};
}
