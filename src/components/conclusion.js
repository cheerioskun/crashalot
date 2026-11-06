import React from 'react';
import {createRoot} from 'react-dom/client';
import {Penflow} from 'penflow/react';
import fontUrl from '../assets/conclusion/PinyonScript-Regular.ttf?inline';
import {easeCubicInOut,timer} from 'd3';
import {createBeatPlayback} from './beat-playback.js';
import {createConclusionGlobe} from './conclusion-globe.js';
import './conclusion.css';

const labels=['0','1','2','2.3','2.6','3','4','Thanks'];
const durations=[0,650,500,500,500,500,750,4500];
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
    <p class="conclusion-farewell" aria-live="polite"><span class="farewell-line">So lean your seat <em>back</em><br>and relax.</span><span>You’ll have a safe flight :)</span></p>
   </div>
   <div class="conclusion-globe-stage"></div>
  </div>
  <div class="conclusion-ending" aria-hidden="true">
   <div class="conclusion-thanks"></div>
   <button type="button" class="text-button conclusion-restart" hidden>Back to the beginning <span aria-hidden="true">↺</span></button>
  </div>
 </div>`;
 const root=container.firstElementChild,end=root.querySelector('.conclusion-ending'),restart=root.querySelector('.conclusion-restart');
 const lettering=createRoot(root.querySelector('.conclusion-thanks'));
 let lastPenProgress=-1;
 const globe=createConclusionGlobe(root.querySelector('.conclusion-globe-stage'),reduced);
 let stage=0,progress=1,running=false,active=false,clock,destroyed=false;
 const notify=()=>container.dispatchEvent(new CustomEvent('storybeat',{bubbles:true}));
 const complete=()=>stage===7&&progress===1;
 const autoComplete=()=>stage===6&&progress===1||complete();
 function render(){
  const ending=stage===7;
  root.dataset.beat=labels[stage];root.dataset.progress=String(progress);root.dataset.playback=playback.status;
  root.classList.toggle('is-farewell',stage===6);root.classList.toggle('is-ending',ending);
  const penProgress=ending?progress:0;
  if(lastPenProgress!==penProgress){
   lastPenProgress=penProgress;
   lettering.render(React.createElement(Penflow,{text:'Thanks for watching',fontUrl,size:150,quality:'calm',seed:'crashalot-thanks',color:'#202629',profile:{outerOnly:true,brushScale:.11},progress:penProgress}));
  }
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
  if(active){document.body.classList.toggle('presentation-ending',ending);document.body.classList.toggle('presentation-ending-complete',complete());}
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
 const playback=createBeatPlayback({state:()=>({key:stage,running,complete:autoComplete(),atBoundary:progress===1,durationMs:durations[stage],remainingMs:(1-progress)*durations[stage],terminal:stage>=6}),timeline:()=>durations.map((duration,i)=>({duration,hold:holds[i]})),play,pause:stop,advance,holdMs:()=>holds[stage],reduced,showAll,changed:render});
 restart.addEventListener('click',()=>{location.replace(`${location.href.split('#')[0]}#/welcome`);location.reload();});
 root.addEventListener('keydown',event=>{if(event.target.closest('button')&&[' ','Enter'].includes(event.key))event.stopPropagation();});
 render();
 return {
  setActive(value){active=value;if(!active)document.body.classList.remove('presentation-ending','presentation-ending-complete');globe.setActive(value&&stage<7);playback.setActive(value);render();},
  setPlaybackMode(value){playback.setMode(value);},
  getPlaybackTiming:()=>playback.timing,
  getNavigationState(){return{step:stage+1,total:labels.length,running,inProgress:progress<1,complete:complete()};},
  finishBeat(){playback.engage();stop();progress=1;render();playback.settled();notify();},
  nextBeat(){if(complete())return false;playback.engage();advance();globe.setActive(active&&stage<7);return true;},
  previousBeat(){if(stage===0)return false;playback.hold();stop();stage--;progress=1;globe.setActive(active&&stage<7);render();notify();return true;},
  showLastBeat(){playback.hold();showAll(true);globe.setActive(false);},
  resize(){},
  destroy(){destroyed=true;playback.destroy();globe.destroy();lettering.unmount();document.body.classList.remove('presentation-ending','presentation-ending-complete');root.remove();},
 };
}
