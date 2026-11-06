import { axisLeft, easeLinear, format, line, scaleBand, scaleLinear, select } from 'd3';
import './decade-trend.css';
import { createBeatPlayback } from './beat-playback.js';

const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const beats = [
  { label:'0', end:0, hold:900 },
  { label:'1', end:0, hold:1900 },
  { label:'1.5', end:3, unitMs:850, hold:300 },
  { label:'2', end:3, hold:1200 },
  { label:'2.5', end:3, hold:1250 },
  { label:'3', end:8, unitMs:850, hold:300 },
  { label:'3.5', end:8, hold:2300 },
  { label:'4', end:9, unitMs:1500, hold:450 },
  { label:'4.5', end:10, unitMs:650, hold:900 },
  { label:'5', end:10, hold:1200 },
  { label:'5.5', end:11, unitMs:1800, hold:0 },
  { label:'6', end:11, hold:0 },
];

export async function mountDecadeTrend(container) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/decade-trend.json`);
  if (!response.ok) throw new Error('Trend data unavailable');
  const data = await response.json();
  if (data.rows.length !== 8 || data.rows.some(d => !Number.isSafeInteger(d.count) || !Number.isSafeInteger(d.fatalCount) || d.fatalCount < 0 || d.fatalCount > d.count)) throw new Error('Invalid decade counts');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = false, running = false, stage = 0, progress = 0, lastStage = -1;
  const root = select(container).append('div').attr('class', 'decade-trend');
  const grid = root.append('div').attr('class', 'decade-trend__grid');
  const plot = grid.append('div').attr('class', 'decade-trend__plot');
  plot.append('p').attr('class', 'decade-trend__measure').text('Recorded aircraft crashes');
  const legend = plot.append('div').attr('class','decade-trend__legend').attr('aria-label','Chart legend');
  legend.append('span').attr('class','decade-trend__legend-total').text('Total crashes');
  legend.append('span').attr('class','decade-trend__legend-fatal').text('Fatal crashes');
  const svg = plot.append('svg').attr('viewBox', '0 0 900 390').attr('role', 'img').attr('aria-label', 'Total and fatal scheduled revenue flight crashes by decade, worldwide, 1950–2024');
  svg.append('desc').text(data.rows.map(d=>`${d.label}${d.partial ? ' (five years only)' : ''}: ${d.count} total crashes, ${d.fatalCount} with fatalities`).join('; ')+'. Both series use the same zero-based count scale and source records.');
  const x = scaleBand().domain(data.rows.map(d => d.label)).range([60, 875]).padding(.32);
  const y = scaleLinear().domain([0, 1000]).range([330, 26]);
  svg.append('g').attr('class', 'decade-trend__axis').attr('transform', 'translate(55,0)');
  const baseline = svg.append('line').attr('x1',55).attr('y1',330).attr('y2',330).attr('stroke','var(--bs-body-color)');
  const boundary = svg.append('line').attr('y1',20).attr('y2',370).attr('stroke','var(--bs-border-color)').attr('stroke-dasharray','4 5');
  const marks = svg.append('g').selectAll('g').data(data.rows, d => d.decade).join('g');
  const bars = marks.append('rect').attr('class','decade-trend__bar').attr('y',y(0)).attr('height',0)
    .attr('fill',d=>d.partial ? 'var(--bs-body-bg)' : 'var(--viz-series-1)').attr('stroke','var(--viz-series-1)')
    .attr('stroke-width',d=>d.partial ? 2 : 0).attr('stroke-dasharray',d=>d.partial ? '4 3' : null);
  const values = marks.append('text').attr('class','decade-trend__value').attr('text-anchor','middle').text(d=>d.count);
  marks.append('text').attr('class','decade-trend__tick').attr('y',354).attr('text-anchor','middle').text(d=>d.label);
  marks.filter(d=>d.partial).append('text').attr('class','decade-trend__partial').attr('text-anchor','middle').text('5 years only');

  function series(key, prefix, color) {
    const path = svg.append('path').attr('class',`decade-trend__${prefix}`).attr('fill','none').attr('stroke',color)
      .attr('stroke-width',3).attr('stroke-linejoin','round').attr('stroke-linecap','round').attr('pathLength',1).attr('stroke-dasharray','1 1');
    const partial = svg.append('path').attr('class',`decade-trend__${prefix === 'line' ? 'partial-line' : 'fatal-partial-line'}`)
      .attr('fill','none').attr('stroke',color).attr('stroke-width',3).attr('stroke-dasharray','6 6');
    const points = svg.append('g').selectAll('circle').data(data.rows.filter(d=>!d.partial)).join('circle')
      .attr('r',4).attr('fill',color).attr('stroke','var(--bs-body-bg)').attr('stroke-width',2);
    const endpoint = svg.append('path').attr('class',`decade-trend__${prefix === 'line' ? 'partial-point' : 'fatal-partial-point'}`)
      .attr('d','M0,-6L6,0L0,6L-6,0Z').attr('fill','var(--bs-body-bg)').attr('stroke',color).attr('stroke-width',2);
    return { key,path,partial,points,endpoint };
  }
  const total = series('count','line','var(--viz-series-1)');
  const fatal = series('fatalCount','fatal-line','var(--decade-fatal-color)');
  const fatalValues = svg.append('g').selectAll('text').data(data.rows).join('text')
    .attr('class','decade-trend__fatal-value').attr('text-anchor','middle').text(d=>d.fatalCount);
  const note = grid.append('aside').attr('class','decade-trend__note').attr('aria-live','polite');
  const period = note.append('p').attr('class','eyebrow');
  const headline = note.append('h2');
  const opening = note.append('p').attr('class','decade-trend__opening').text('Recorded crashes rise from 688 in the 1950s to a peak of 923 in the 1970s.');
  const technology = note.append('p').attr('class','decade-trend__technology').text('Ground-proximity warnings and crew resource management added layers of protection.');
  const decline = note.append('p').attr('class','decade-trend__decline').text('Recorded crashes fell in every completed decade after the 1970s peak, reaching 269 in the 2010s — 71% fewer.');
  const fatalCopy = note.append('p').attr('class','decade-trend__fatal-copy').text('Fatal crashes fell even further: from 475 in the 1970s to 98 in the 2010s — 79% fewer.');
  const bridge = note.append('p').attr('class','decade-trend__bridge').text('The phase of flight is one place to start.');
  const transport = root.append('div').attr('class','decade-trend__transport');
  const status = transport.append('span');
  const controls = transport.append('div');
  const pause = controls.append('button').attr('type','button').attr('class','text-button').text('Pause').on('click',()=>playback.togglePause());
  controls.append('button').attr('type','button').attr('class','text-button').text('Replay').on('click',()=>{
    playback.engage();stop();stage=0;progress=0;render();playback.settled();
  });
  root.on('keydown',event=>{if(event.target.closest('button, summary, a') && [' ','Enter'].includes(event.key))event.stopPropagation();});
  const source = root.append('details').attr('class','evidence-source decade-trend__source');
  source.append('summary').text('Source, scope & exact counts');
  source.append('p').html('Source: <a href="https://huggingface.co/datasets/MauroPello/planecrashdata" target="_blank" rel="noreferrer">MauroPello · PlaneCrashData</a> (CC BY 4.0), retained snapshot. Worldwide records with flight_type exactly “Scheduled Revenue Flight”; includes fatal and nonfatal outcomes. Fatal crashes are the subset with total_fatalities > 0. Separately classified cargo and charter records are excluded. Each record describes an aircraft, so a collision can contribute two records. Unlike the previous U.S. accident-per-departure comparison, these are worldwide archive counts, without flight exposure. The final point covers five years, 2020–2024.');
  source.append('p').html('Historical context: <a href="https://www.ntsb.gov/safety/safety-studies/Documents/SR9801.pdf" target="_blank" rel="noreferrer">NTSB · Ground Proximity Warning Systems</a>; <a href="https://asrs.arc.nasa.gov/publications/callback/cb_370.html" target="_blank" rel="noreferrer">NASA · Crew Resource Management</a>. These milestones do not quantify their contribution to this worldwide trend.');
  const table = source.append('table');
  table.append('caption').text('Recorded crashes in the selected archive category');
  table.append('thead').append('tr').selectAll('th').data(['Period','Years','Total crashes','Fatal crashes']).join('th').attr('scope','col').text(d=>d);
  table.append('tbody').selectAll('tr').data(data.rows).join('tr').selectAll('td').data(d=>[d.partial ? '2020–2024 (partial decade)' : `${d.start}–${d.end}`,d.years,d.count,d.fatalCount]).join('td').text(d=>d);
  const scope = select(container.closest('main')).select('.trend-scope');
  function notify() { container.dispatchEvent(new CustomEvent('storybeat',{bubbles:true})); }
  const complete = () => stage === beats.length-1 && progress >= beats[stage].end;
  const autoComplete = () => stage>=10 && progress>=11;
  function drawSeries(s, reveal) {
    const full = Math.min(1,reveal/.85);
    const generator = line().x(d=>x(d.label)+x.bandwidth()/2).y(d=>y(d[s.key]));
    s.path.attr('d',generator(data.rows.filter(d=>!d.partial))).attr('stroke-dashoffset',1-full).attr('opacity',reveal>0 ? 1 : 0);
    s.partial.attr('d',generator(data.rows.slice(6))).attr('opacity',clamp((reveal-.85)/.15));
    s.points.attr('cx',d=>x(d.label)+x.bandwidth()/2).attr('cy',d=>y(d[s.key])).attr('opacity',(d,i)=>reveal>0 && full>=i/6 ? 1 : 0);
    s.endpoint.attr('transform',`translate(${x(data.rows[7].label)+x.bandwidth()/2},${y(data.rows[7][s.key])})`).attr('opacity',clamp((reveal-.85)/.15));
  }
  function render() {
    const connection=smooth(progress-8), fade=smooth(progress-9), fatalReveal=smooth(progress-10);
    bars.attr('opacity',1-fade).attr('y',(d,i)=>y(d.count*smooth(progress-i))).attr('height',(d,i)=>y(0)-y(d.count*smooth(progress-i)));
    values.attr('y',d=>y(d.count)-12).attr('opacity',(d,i)=>progress>=i+1 ? 1 : 0);
    drawSeries(total,connection);drawSeries(fatal,fatalReveal);
    fatalValues.attr('x',d=>x(d.label)+x.bandwidth()/2+(d.partial ? 12 : 0))
      .attr('y',d=>y(d.fatalCount)+(d.partial ? 4 : 21)).attr('text-anchor',d=>d.partial ? 'start' : 'middle')
      .attr('opacity',(d,i)=>fatalReveal>=1 || fatalReveal>0 && fatalReveal/.85>=i/6 ? 1 : 0);
    if(lastStage!==stage) {
      root.classed('has-started',stage>0);
      scope.classed('is-visible',stage>0).attr('aria-hidden',String(stage===0));
      period.text(stage<4 ? '1950s–1970s' : stage<9 ? '1980s–2024' : 'The full view · 1950–2024');
      const title=stage===11 ? 'What factors affect these numbers?' : stage<4 ? 'The decline did not start immediately.' : stage<9 ? 'Safety gained new layers of protection' : 'These are <i>total</i> crashes,';
      if(headline.html()!==title) {
        headline.classed('decade-heading-enter',false).html(title);
        void headline.node().offsetWidth;
        headline.classed('decade-heading-enter',true);
      }
      for(const [node,visible]of [[opening,stage>=1&&stage<4],[technology,stage>=5&&stage<9],[decline,stage>=6&&stage<9],[fatalCopy,stage===10],[bridge,stage===11]]) {
        node.classed('is-visible',visible).attr('aria-hidden',String(!visible));
      }
      note.classed('is-visible',stage>0).attr('aria-hidden',String(stage===0));
      legend.classed('is-visible',stage>=10).attr('aria-hidden',String(stage<10));
      lastStage=stage;
    }
    const state=playback.status;
    root.attr('data-playback',state).attr('data-stage',stage).attr('data-beat',beats[stage].label).attr('data-progress',progress);
    pause.text(state==='running'||state==='waiting' ? 'Pause' : 'Resume').property('disabled',autoComplete());
    status.text(state==='paused' ? 'Paused' : complete() ? '1950–2024 · Full view' : '');
  }
  function stop() { root.interrupt('reveal');running=false; }
  function finish() { running=false;playback.settled();notify(); }
  function play() {
    if(!active || document.hidden || progress>=beats[stage].end) return;
    running=true;render();notify();
    const start=progress,end=beats[stage].end;
    if(reduced.matches) {progress=end;finish();return;}
    root.transition('reveal').duration((end-start)*beats[stage].unitMs).ease(easeLinear).tween('decades',()=>t=>{progress=start+(end-start)*t;render();}).on('end',finish);
  }
  function advance() {if(stage>=beats.length-1)return;stage++;render();play();playback.settled();}
  function showAll(lastStage=Math.max(stage,10)) {stop();stage=lastStage;progress=beats[stage].end;render();}
  const playback=createBeatPlayback({
    state:()=>({running,complete:autoComplete(),atBoundary:progress>=beats[stage].end}),
    play,pause:stop,advance,holdMs:()=>beats[stage].hold,reduced,showAll,changed(){render();notify();},
  });
  function resize() {
    const width=Math.max(260,Math.min(1000,plot.node().clientWidth)),narrow=width<580;
    svg.attr('viewBox',`0 0 ${width} ${narrow ? 440 : 390}`);
    root.classed('decade-trend--narrow',narrow);
    x.range([55,width-12]);
    svg.select('.decade-trend__axis').call(axisLeft(y).tickValues([0,250,500,750,1000]).tickSize(-(width-67)).tickFormat(format(',d'))).call(g=>g.select('.domain').remove());
    baseline.attr('x2',width-12);boundary.attr('x1',x('2020–24')-10).attr('x2',x('2020–24')-10);
    bars.attr('x',d=>x(d.label)).attr('width',x.bandwidth());
    marks.selectAll('text').attr('x',d=>x(d.label)+x.bandwidth()/2);
    marks.select('.decade-trend__tick').attr('text-anchor',narrow ? 'end' : 'middle').attr('transform',d=>narrow ? `rotate(-50,${x(d.label)+x.bandwidth()/2},354)` : null);
    marks.select('.decade-trend__partial').attr('y',narrow ? 427 : 375);
    render();
  }
  const observer=new ResizeObserver(resize);observer.observe(plot.node());render();
  return {
    resize,
    finishBeat(){playback.engage();stop();progress=beats[stage].end;playback.settled();},
    setPlaybackMode:value=>playback.setMode(value),
    setActive(value){active=value;playback.setActive(value);},
    getNavigationState(){return{step:stage+1,total:beats.length,running,inProgress:progress<beats[stage].end,action:complete() ? 'Continue the story' : 'Reveal the next beat'};},
    nextBeat(){if(complete())return false;playback.engage();advance();return true;},
    previousBeat(){if(stage===0)return false;playback.hold();stage--;progress=beats[stage].end;render();notify();return true;},
    showLastBeat(){playback.hold();showAll(11);notify();},
    destroy(){playback.destroy();observer.disconnect();root.remove();},
  };
}
