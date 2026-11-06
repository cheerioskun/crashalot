import {easeCubicInOut,timer} from 'd3';
import {createBeatPlayback} from './beat-playback.js';
import {createConclusionGlobe} from './conclusion-globe.js';
import './conclusion.css';

const labels=['0','1','2','2.3','2.6','3','4','Exit'];
const durations=[0,650,500,500,500,500,750,1000];
const holds=[1800,3200,450,450,650,1800,0,0];
const clamp=t=>Math.max(0,Math.min(1,t));
export function mountConclusion(container){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 container.innerHTML=`<div class="conclusion-scene" data-beat="0">
  <div class="conclusion-landing">
   <div class="conclusion-narration">
    <div class="conclusion-copy" aria-live="polite">
     <h1 id="conclusion-title" data-closing-reveal="0">There’s really<br>nothing to fear.</h1>
     <p class="conclusion-progress-copy" data-closing-reveal="1">We’ve come a long way.<br>And we’re getting better still.</p>
     <div class="conclusion-fronts"><p data-closing-reveal="2">Technology</p><p data-closing-reveal="3">Protocols</p><p data-closing-reveal="4">Policy</p></div>
     <p class="conclusion-aside" data-closing-reveal="5">on all fronts, really.</p>
    </div>
    <p class="conclusion-farewell" aria-live="polite">So lean your seat back<br>and relax.<span>You’ll have a safe flight :)</span></p>
   </div>
   <div class="conclusion-globe-stage"></div>
  </div>
  <div class="conclusion-exit" aria-hidden="true">
   <div class="exit-luminaire">
    <svg viewBox="0 0 680 250" class="cabin-exit-sign" role="img" aria-label="EXIT — the end">
     <defs>
      <linearGradient id="exit-housing" x2="0" y2="1"><stop stop-color="var(--exit-housing-top)"/><stop offset=".5" stop-color="var(--exit-housing-mid)"/><stop offset="1" stop-color="var(--exit-housing-bottom)"/></linearGradient>
      <linearGradient id="exit-panel" x2="0" y2="1"><stop stop-color="#fffdf5"/><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#e9edef"/></linearGradient>
     </defs>
     <path class="exit-shell" d="M24 116C43 57 155 37 340 37s297 20 316 79c-18 64-134 98-316 98S42 180 24 116Z" fill="url(#exit-housing)"/>
     <path d="M53 104C112 64 228 56 340 56s228 8 287 48" fill="none" stroke="var(--exit-highlight)" stroke-width="1.5" opacity=".7"/>
     <rect x="108" y="57" width="464" height="133" rx="19" class="exit-panel-rim"/>
     <rect x="114" y="63" width="452" height="121" rx="14" fill="url(#exit-panel)"/>
     <g class="exit-letters" fill="#972e28">
      <path d="m164 91-30 32 30 32V91Zm352 0 30 32-30 32V91Z"/>
      <path d="M190 87h65v15h-46v13h40v15h-40v15h46v15h-65Zm77 0h22l17 24 17-24h22l-28 36 29 37h-23l-17-25-18 25h-22l29-37Zm92 0h20v73h-20Zm32 0h83v16h-31v57h-21v-57h-31Z"/>
     </g>
     <path d="M148 200c62 10 132 13 192 13s130-3 192-13" fill="none" stroke="var(--exit-highlight)" stroke-width="1.5" opacity=".55"/>
    </svg>
   </div>
   <button type="button" class="conclusion-restart" hidden aria-label="Back to the beginning">
    <span class="exit-person-tile" aria-hidden="true"><svg viewBox="0 0 80 80" class="exit-person">
     <path class="exit-door" d="M29 9h35v62H29V9Z"/>
     <g class="exit-runner" fill="currentColor">
      <circle cx="46" cy="23" r="5.5"/>
      <path d="m38 31 12 2 9 15-6 3-8-12-5 11 7 15h12v6H42l-8-17-10 17h-8l14-25 4-9-9 8H12v-6h10l12-10Z"/>
     </g>
     <path d="M20 73H8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg></span>
    <span class="exit-restart-label">Back to the beginning</span>
   </button>
  </div>
 </div>`;
 const root=container.firstElementChild,end=root.querySelector('.conclusion-exit'),restart=root.querySelector('.conclusion-restart');
 const globe=createConclusionGlobe(root.querySelector('.conclusion-globe-stage'),reduced);
 let stage=0,progress=1,running=false,active=false,clock,destroyed=false;
 const notify=()=>container.dispatchEvent(new CustomEvent('storybeat',{bubbles:true}));
 const complete=()=>stage===7&&progress===1;
 const autoComplete=()=>stage===6&&progress===1||complete();
 function render(){
  const ending=stage===7;
  root.dataset.beat=labels[stage];root.dataset.progress=String(progress);root.dataset.playback=playback.status;
  root.classList.toggle('is-farewell',stage===6);root.classList.toggle('is-exit',ending);
  root.style.setProperty('--exit-light',ending?easeCubicInOut(progress):0);
  root.querySelector('.conclusion-landing').inert=ending;
  root.querySelector('.conclusion-landing').setAttribute('aria-hidden',String(ending));
  for(const node of root.querySelectorAll('[data-closing-reveal]')){
   const beat=Number(node.dataset.closingReveal),value=stage<beat?0:stage===beat?easeCubicInOut(progress):1;
   node.style.opacity=String(value);node.style.transform=`translateY(${(1-value)*10}px)`;node.setAttribute('aria-hidden',String(stage<beat||stage>=6));
  }
  const farewell=root.querySelector('.conclusion-farewell');farewell.setAttribute('aria-hidden',String(stage!==6));farewell.style.opacity=stage===6?easeCubicInOut(progress):0;
  end.setAttribute('aria-hidden',String(!ending));end.inert=!ending;
  restart.hidden=!complete();
  if(complete()&&document.activeElement?.matches('[data-story-next]'))restart.focus({preventScroll:true});
  globe.setQuiet(stage>=6);
  if(active){document.body.classList.toggle('presentation-exit',ending);document.body.classList.toggle('presentation-exit-complete',complete());}
 }
 function stop(){clock?.stop();clock=null;running=false;}
 function play(){
  if(!active||destroyed||running||progress===1)return;
  if(reduced.matches){progress=1;render();playback.settled();notify();return;}
  running=true;const from=progress;
  clock=timer(elapsed=>{progress=clamp(from+elapsed/durations[stage]);if(progress===1){stop();render();playback.settled();notify();}else render();});render();notify();
 }
 function advance(){if(complete())return;stop();stage++;progress=durations[stage]?0:1;render();play();playback.settled();notify();}
 function showAll(final=false){stop();stage=final||stage===7?7:6;progress=1;render();notify();}
 const playback=createBeatPlayback({state:()=>({key:stage,running,complete:autoComplete(),atBoundary:progress===1,durationMs:durations[stage],remainingMs:(1-progress)*durations[stage],terminal:stage>=6}),play,pause:stop,advance,holdMs:()=>holds[stage],reduced,showAll,changed:render});
 restart.addEventListener('click',()=>{location.replace(`${location.href.split('#')[0]}#/welcome`);location.reload();});
 root.addEventListener('keydown',event=>{if(event.target.closest('button')&&[' ','Enter'].includes(event.key))event.stopPropagation();});
 render();
 return {
  setActive(value){active=value;if(!active)document.body.classList.remove('presentation-exit','presentation-exit-complete');globe.setActive(value&&stage<7);playback.setActive(value);render();},
  setPlaybackMode(value){playback.setMode(value);},
  getPlaybackTiming:()=>playback.timing,
  getNavigationState(){return{step:stage+1,total:labels.length,running,inProgress:progress<1,complete:complete()};},
  finishBeat(){playback.engage();stop();progress=1;render();playback.settled();notify();},
  nextBeat(){if(complete())return false;playback.engage();advance();globe.setActive(active&&stage<7);return true;},
  previousBeat(){if(stage===0)return false;playback.hold();stop();stage--;progress=1;globe.setActive(active&&stage<7);render();notify();return true;},
  showLastBeat(){playback.hold();showAll(true);globe.setActive(false);},
  resize(){},
  destroy(){destroyed=true;playback.destroy();globe.destroy();document.body.classList.remove('presentation-exit','presentation-exit-complete');root.remove();},
 };
}
