import {easeCubicInOut,timer} from 'd3';
import {createBeatPlayback} from './beat-playback.js';
import {createConclusionGlobe} from './conclusion-globe.js';
import lettering from '../assets/conclusion/fin.json';
import './conclusion.css';

const labels=['0','1','2','2.3','2.6','3','4','F','i','n'];
const durations=[0,650,500,500,500,500,750,2200,800,1800];
const holds=[1800,3200,450,450,650,1800,0,280,180,0];
const clamp=t=>Math.max(0,Math.min(1,t));
// Broad ink masks follow the pen's route; the filled outlines retain nib contrast.
const penPaths={
 F:[['M2225 1560 C2070 1280 1850 1375 1510 1385 C980 1450 520 1240 530 965 C530 730 1085 845 1195 1210',140],['M1660 1200 C1410 1190 1240 945 1030 690 C780 300 600 30 350 10 C110 -10 -50 100 70 180',190],['M350 335 C470 530 860 630 1400 785 L1260 500',125]],
 i:[['M400 680 C240 480 -50 160 -35 65 C-20 -55 210 -20 580 425',155]],
 n:[['M-5 420 C180 650 290 745 240 575 L55 20 C290 310 650 750 835 665 C1130 620 370 55 640 20 C805 -20 1030 210 1170 400',145]],
 dot:[['M535 895 L640 1010',150]],
};
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
  <div class="conclusion-fin" aria-hidden="true">
   <svg class="fin-lettering" viewBox="-130 -1730 3150 1960" role="img" aria-label="Fin"><defs></defs><g class="fin-ink" transform="scale(1,-1)"></g></svg>
   <button type="button" class="text-button conclusion-restart" hidden>Back to the beginning <span aria-hidden="true">↺</span></button>
  </div>
 </div>`;
 const root=container.firstElementChild,fin=root.querySelector('.conclusion-fin'),ink=root.querySelector('.fin-ink'),defs=root.querySelector('defs'),restart=root.querySelector('.conclusion-restart');
 const ns='http://www.w3.org/2000/svg',maskStrokes=new Map();
 function element(name,attrs,parent){const node=document.createElementNS(ns,name);Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,value));parent.append(node);return node;}
 function letter(key,path,x){
  const mask=element('mask',{id:`fin-mask-${key}`,maskUnits:'userSpaceOnUse',x:-400,y:-400,width:3300,height:2400},defs);
  const strokes=penPaths[key].map(([d,width])=>element('path',{d,fill:'none',stroke:'white','stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round',pathLength:1,'stroke-dasharray':'1 1','stroke-dashoffset':1},mask));
  const fill=element('rect',{x:-400,y:-400,width:3300,height:2400,fill:'white',opacity:0},mask);
  element('path',{d:path,transform:`translate(${x},0)`,mask:`url(#fin-mask-${key})`,'data-fin-letter':key},ink);
  maskStrokes.set(key,{strokes,fill,lengths:strokes.map(node=>node.getTotalLength())});
 }
 for(const l of lettering.letters){letter(l.letter,l.body,l.x);if(l.dot)letter('dot',l.dot,l.x);}
 const globe=createConclusionGlobe(root.querySelector('.conclusion-globe-stage'),reduced);
 let stage=0,progress=1,running=false,active=false,clock,destroyed=false;
 const notify=()=>container.dispatchEvent(new CustomEvent('storybeat',{bubbles:true}));
 const complete=()=>stage===9&&progress===1;
 const autoComplete=()=>stage===6&&progress===1||complete();
 function drawLetter(key,value){
  const {strokes,fill,lengths}=maskStrokes.get(key),total=lengths.reduce((a,b)=>a+b,0);
  let used=0;
  strokes.forEach((stroke,index)=>{const part=clamp((value*total-used)/lengths[index]);stroke.setAttribute('stroke-dashoffset',1-part);stroke.setAttribute('opacity',part>0?1:0);used+=lengths[index];});
  fill.setAttribute('opacity',clamp((value-.965)/.035));
  root.dataset[`ink${key==='dot'?'Dot':key.toUpperCase()}`]=String(value);
 }
 function render(){
  const ending=stage>=7;
  root.dataset.beat=labels[stage];root.dataset.progress=String(progress);root.dataset.playback=playback.status;
  root.classList.toggle('is-farewell',stage===6);root.classList.toggle('is-fin',ending);
  root.querySelector('.conclusion-landing').inert=ending;
  root.querySelector('.conclusion-landing').setAttribute('aria-hidden',String(ending));
  for(const node of root.querySelectorAll('[data-closing-reveal]')){
   const beat=Number(node.dataset.closingReveal),value=stage<beat?0:stage===beat?easeCubicInOut(progress):1;
   node.style.opacity=String(value);node.style.transform=`translateY(${(1-value)*10}px)`;node.setAttribute('aria-hidden',String(stage<beat||stage>=6));
  }
  const farewell=root.querySelector('.conclusion-farewell');farewell.setAttribute('aria-hidden',String(stage!==6));
  farewell.style.opacity=stage===6?easeCubicInOut(progress):0;
  fin.setAttribute('aria-hidden',String(!ending));fin.inert=!ending;
  drawLetter('F',stage<7?0:stage===7?clamp((progress*2200-400)/1700):1);
  drawLetter('i',stage<8?0:stage===8?progress:1);
  drawLetter('n',stage<9?0:clamp(progress/.77));
  drawLetter('dot',stage<9?0:clamp((progress-.84)/.16));
  restart.hidden=!complete();
  if(complete()&&document.activeElement?.matches('[data-story-next]'))restart.focus({preventScroll:true});
  globe.setQuiet(stage>=6);
  if(active){document.body.classList.toggle('presentation-fin',ending);document.body.classList.toggle('presentation-fin-complete',complete());}
 }
 function stop(){clock?.stop();clock=null;running=false;}
 function play(){
  if(!active||destroyed||running||progress===1)return;
  if(reduced.matches){progress=1;render();playback.settled();notify();return;}
  running=true;const from=progress;
  clock=timer(elapsed=>{progress=clamp(from+elapsed/durations[stage]);if(progress===1){stop();render();playback.settled();notify();}else render();});render();notify();
 }
 function advance(){if(complete())return;stop();stage++;progress=durations[stage]?0:1;render();play();playback.settled();notify();}
 function showAll(final=false){stop();stage=final||stage>=7?9:6;progress=1;render();notify();}
 const playback=createBeatPlayback({state:()=>({running,complete:autoComplete(),atBoundary:progress===1}),play,pause:stop,advance,holdMs:()=>holds[stage],reduced,showAll,changed:render});
 restart.addEventListener('click',()=>{location.replace(`${location.href.split('#')[0]}#/welcome`);location.reload();});
 root.addEventListener('keydown',event=>{if(event.target.closest('button')&&[' ','Enter'].includes(event.key))event.stopPropagation();});
 render();
 return {
  setActive(value){active=value;if(!active)document.body.classList.remove('presentation-fin','presentation-fin-complete');globe.setActive(value&&stage<7);playback.setActive(value);render();},
  setPlaybackMode(value){playback.setMode(value);},
  getNavigationState(){return{step:stage+1,total:labels.length,running,inProgress:progress<1,complete:complete()};},
  finishBeat(){playback.engage();stop();progress=1;render();playback.settled();notify();},
  nextBeat(){if(complete())return false;playback.engage();advance();globe.setActive(active&&stage<7);return true;},
  previousBeat(){if(stage===0)return false;playback.hold();stop();stage--;progress=1;globe.setActive(active&&stage<7);render();notify();return true;},
  showLastBeat(){playback.hold();showAll(true);globe.setActive(false);},
  resize(){},
  destroy(){destroyed=true;playback.destroy();globe.destroy();document.body.classList.remove('presentation-fin','presentation-fin-complete');root.remove();},
 };
}
