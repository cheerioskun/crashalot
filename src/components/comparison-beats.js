import {timer} from 'd3';
import {createBeatPlayback} from './beat-playback.js';

// Reveals stay inside the current chapter. Only the presentation owns slide navigation.
export function createComparisonBeats({root,container,aircraft,paint}) {
  const durations=aircraft?[0,1200,1000,0,650]:[0,900,1500,0];
  const holds=aircraft?[1000,2400,3500,5300,0]:[900,2200,3500,0];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let stage=0,progress=1,clock,running=false,active=false,destroyed=false;
  const transport=document.createElement('div');transport.className='comparison-transport';
  transport.innerHTML='<button type="button" class="text-button" data-comparison-pause>Pause</button><button type="button" class="text-button" data-comparison-replay>Replay</button>';
  root.querySelector('.comparison-outcome-key').append(transport);
  const pause=transport.querySelector('[data-comparison-pause]');
  const complete=()=>stage===durations.length-1&&progress===1;
  const notify=()=>container.dispatchEvent(new CustomEvent('storybeat',{bubbles:true}));
  function render(){
    root.dataset.beat=String(stage);root.dataset.revealProgress=String(progress);root.dataset.playback=playback.status;
    const label=complete()||running||playback.status==='waiting'?'Pause':'Resume';
    if(pause.textContent!==label)pause.textContent=label;pause.disabled=complete();
    paint({stage,progress,reduced:reduced.matches});
  }
  function stop(){clock?.stop();running=false;}
  function play(){
    if(!active||destroyed||running||progress===1)return;
    if(reduced.matches){progress=1;render();playback.settled();notify();return;}
    running=true;const start=progress;
    clock=timer(elapsed=>{
      progress=Math.min(1,start+elapsed/durations[stage]);
      if(progress===1){stop();render();playback.settled();notify();}else render();
    });render();notify();
  }
  function advance(){
    if(complete())return;
    stop();stage++;progress=durations[stage]?0:1;render();play();playback.settled();notify();
  }
  function showAll(){stop();stage=durations.length-1;progress=1;render();notify();}
  const playback=createBeatPlayback({state:()=>({running,complete:complete(),atBoundary:progress===1}),
    play,pause:stop,advance,holdMs:()=>holds[stage],reduced,showAll,changed:render});
  pause.addEventListener('click',()=>playback.togglePause());
  transport.querySelector('[data-comparison-replay]').addEventListener('click',()=>{
    playback.engage();stop();stage=0;progress=1;render();playback.settled();notify();
  });
  render();
  return {
    get state(){return {stage,progress,reduced:reduced.matches};},
    setActive(value){active=value;playback.setActive(value);},
    setPlaybackMode(value){playback.setMode(value);},
    getNavigationState(){return {step:stage+1,total:durations.length,running,inProgress:progress<1,complete:complete()};},
    finishBeat(){playback.engage();stop();progress=1;render();playback.settled();notify();},
    nextBeat(){if(complete())return false;playback.engage();advance();return true;},
    previousBeat(){if(stage===0)return false;playback.hold();stop();stage--;progress=1;render();notify();return true;},
    showLastBeat(){playback.hold();showAll();},
    explore(){if(complete())return;playback.hold();showAll();},
    destroy(){destroyed=true;playback.destroy();transport.remove();},
  };
}
