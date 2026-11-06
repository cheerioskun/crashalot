// Owns playback within one view. This controller has no slide-navigation API.
export function createBeatPlayback({ state, play, pause, advance, holdMs, reduced, showAll, changed }) {
  let auto = false, active = false, held = false, queued = null, resumeManual = false, destroyed = false;
  let deadline=0,holdDuration=0,pausedTiming=null,pauseKey=null;
  const announce=()=>{changed();document.dispatchEvent(new Event('beattimingchange'));};
  function timing(){
    const current=state();
    if(!visible())return {mode:'hidden',fraction:0};
    if(current.complete)return {mode:'next',fraction:1};
    const hold=current.terminal?0:Math.max(0,Number(holdMs())||0);
    if(queued!==null){
      const remainingMs=Math.max(0,deadline-performance.now()),duration=Math.max(1,(current.durationMs||0)+holdDuration);
      return {mode:'countdown',remainingMs,fraction:1-remainingMs/duration};
    }
    if(current.running){
      const remainingMs=Math.max(0,current.remainingMs||0)+(auto&&!held?hold:0),duration=Math.max(1,(current.durationMs||current.remainingMs||0)+(auto&&!held?hold:0));
      return {mode:auto&&!held&&!current.terminal?'countdown':'revealing',remainingMs,fraction:1-remainingMs/duration};
    }
    if((held||!auto)&&pausedTiming&&pauseKey===current.key)return {mode:'paused',fraction:pausedTiming.fraction||0};
    if(!current.atBoundary)return {mode:'paused',fraction:pausedTiming?.fraction||0};
    return {mode:'next',fraction:1};
  }
  const visible = () => active && !document.hidden && !destroyed;
  function clear() { if (queued !== null) clearTimeout(queued); queued = null; }
  function continueAuto() {
    clear();
    if (!visible() || !auto || held || state().complete) { announce(); return; }
    if (reduced.matches) { pause(); showAll(); announce(); return; }
    if (state().running) { announce(); return; }
    if (state().atBoundary) {
      holdDuration=Math.max(0,Number(holdMs())||0);deadline=performance.now()+holdDuration;
      queued = setTimeout(() => {
        queued = null;
        if (visible() && auto && !held && !state().complete) advance();
        announce();
      }, holdDuration);
    } else play();
    announce();
  }
  function onVisibility() {
    if (document.hidden) {
      resumeManual = state().running;
      clear(); pause(); announce();
    } else {
      if (auto) continueAuto();
      else if (visible() && resumeManual && !held) play();
      resumeManual = false;
    }
  }
  function onMotion() { if (auto) continueAuto(); }
  document.addEventListener('visibilitychange', onVisibility);
  reduced.addEventListener('change', onMotion);
  return {
    get mode() { return auto; },
    get timing() { return timing(); },
    get status() {
      if (state().complete) return 'complete';
      if (state().running) return 'running';
      if (queued !== null) return 'waiting';
      return held || !visible() ? 'paused' : 'manual';
    },
    settled: continueAuto,
    // Explicit Next/Replay owns the immediate beat, then Auto may continue.
    engage() { clear(); held = false; pausedTiming=null; },
    hold() { pauseKey=state().key;pausedTiming=timing();clear(); held = true; pause(); announce(); },
    togglePause() {
      if (state().running || queued !== null) { this.hold(); return; }
      held = false;
      if (auto) continueAuto();
      else if (visible() && !state().complete) { if (state().atBoundary) advance(); else play(); announce(); }
    },
    setMode(value) {
      if(!value){pauseKey=state().key;pausedTiming=timing();}else pausedTiming=null;
      auto = value; held = false; clear();
      if (auto) continueAuto(); else { pause(); announce(); }
    },
    setActive(value) {
      if (active === value) return;
      active = value; clear(); resumeManual = false;
      if (active) continueAuto(); else { pause(); announce(); }
    },
    destroy() { destroyed = true; clear(); pause(); document.removeEventListener('visibilitychange', onVisibility); reduced.removeEventListener('change', onMotion); },
  };
}
