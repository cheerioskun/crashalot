import {geoDistance,geoGraticule10,geoInterpolate,geoOrthographic,geoPath,geoRotation,line,select,timer} from 'd3';
import land from '../assets/conclusion/land.json';

// Illustrative connections, not measured traffic or a current airline timetable.
const atlanta=[-84.43,33.64];
const airports={
 LAX:[-118.41,33.94],JFK:[-73.78,40.64],MEX:[-99.07,19.44],GRU:[-46.47,-23.43],LHR:[-.45,51.47],
 CDG:[2.55,49.01],AMS:[4.76,52.31],ICN:[126.45,37.46],HND:[139.78,35.55],JNB:[28.25,-26.14],
 SEA:[-122.31,47.45],SFO:[-122.38,37.62],HNL:[-157.92,21.32],BOS:[-71.01,42.37],MAD:[-3.57,40.49],
 LIM:[-77.11,-12.02],BOG:[-74.15,4.70],SCL:[-70.79,-33.39],EZE:[-58.54,-34.82],LIS:[-9.14,38.77],
 FCO:[12.25,41.80],DXB:[55.36,25.25],SIN:[103.99,1.36],SYD:[151.18,-33.94],BKK:[100.75,13.69],
 CPT:[18.60,-33.96],NBO:[36.93,-1.32],CAI:[31.41,30.12],
};
const connections={LAX:['SEA','HNL','SYD'],JFK:['BOS','MAD','LIS'],MEX:['LIM','BOG','SFO'],GRU:['EZE','SCL','LIS'],
 LHR:['FCO','DXB','SIN'],CDG:['MAD','CAI','BKK'],AMS:['BOS','NBO','FCO'],ICN:['SIN','BKK','SYD'],
 HND:['HNL','SFO','SIN'],JNB:['CPT','NBO','DXB']};
const destinations=Object.values(airports);
const routes=Object.entries(connections).flatMap(([hub,next])=>[
 {from:atlanta,to:airports[hub],secondary:false},
 ...next.map(code=>({from:airports[hub],to:airports[code],secondary:true})),
]).map(route=>({...route,interpolate:geoInterpolate(route.from,route.to)}));
// Geography is stable: sample arcs once, then only rotate/project each frame.
for(const route of routes)route.samples=Array.from({length:65},(_,i)=>route.interpolate(i/64));
export function createConclusionGlobe(host,reduced){
  const svg=select(host).append('svg').attr('class','conclusion-globe').attr('viewBox','0 0 640 660').attr('aria-hidden','true');
  svg.html(`<defs>
    <radialGradient id="closing-ocean" cx="32%" cy="24%" r="78%"><stop stop-color="var(--globe-ocean-light)"/><stop offset=".63" stop-color="var(--globe-ocean)"/><stop offset="1" stop-color="var(--globe-ocean-edge)"/></radialGradient>
    <radialGradient id="closing-shade" cx="28%" cy="26%" r="78%"><stop offset=".38" stop-color="#082c46" stop-opacity="0"/><stop offset="1" stop-color="#082c46" stop-opacity=".25"/></radialGradient>
    <radialGradient id="closing-shadow"><stop stop-color="var(--globe-shadow)" stop-opacity=".22"/><stop offset="1" stop-color="var(--globe-shadow)" stop-opacity="0"/></radialGradient>
    <filter id="closing-glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.8"/></filter>
  </defs>`);
  svg.append('ellipse').attr('cx',320).attr('cy',620).attr('rx',230).attr('ry',22).attr('fill','url(#closing-shadow)');
  const projection=geoOrthographic().translate([320,310]).scale(270).precision(.5),path=geoPath(projection);
  svg.append('circle').attr('cx',320).attr('cy',310).attr('r',270).attr('fill','url(#closing-ocean)').attr('class','globe-rim');
  const continents=svg.append('path').datum(land).attr('class','globe-land');
  const grid=svg.append('path').datum(geoGraticule10()).attr('class','globe-graticule');
  svg.append('circle').attr('cx',320).attr('cy',310).attr('r',270).attr('fill','url(#closing-shade)').attr('pointer-events','none');
  const arcs=svg.append('g').selectAll('path').data(routes).join('path').attr('class',route=>`globe-route${route.secondary?' globe-route--secondary':''}`);
  const points=svg.append('g').selectAll('circle').data(destinations).join('circle').attr('class','globe-destination').attr('r',2.2);
  const originHalo=svg.append('circle').attr('class','globe-origin-halo').attr('r',9);
  const origin=svg.append('circle').attr('class','globe-origin').attr('r',3.3);
  const glow=svg.append('circle').attr('class','globe-traveller').attr('r',6).attr('filter','url(#closing-glow)');
  const traveller=svg.append('circle').attr('class','globe-traveller').attr('r',2.5);
  const drawLine=line().defined(Boolean);
  let active=false,clock,last=0,elapsed=0,rotation=65,quiet=1,quietTarget=1;
  function paint(){
    projection.rotate([rotation,-21,-9]);
    continents.attr('d',path);grid.attr('d',path);
    const rotate=geoRotation(projection.rotate());
    function elevated(coordinates,t=0){
      const [longitude,latitude]=rotate(coordinates).map(v=>v*Math.PI/180),z=Math.cos(latitude)*Math.cos(longitude);
      if(z<=0)return null;
      const radius=270*(1+.105*Math.sin(Math.PI*t));
      return [320+radius*Math.cos(latitude)*Math.sin(longitude),310-radius*Math.sin(latitude)];
    }
    arcs.attr('d',route=>drawLine(route.samples.map((coordinates,i)=>elevated(coordinates,i/64))));
    const center=projection.invert([320,310]);
    const visible=point=>geoDistance(point,center)<Math.PI/2;
    points.attr('cx',point=>projection(point)[0]).attr('cy',point=>projection(point)[1]).attr('opacity',point=>visible(point)?1:0);
    const here=projection(atlanta),showOrigin=visible(atlanta)?1:0;
    origin.attr('cx',here[0]).attr('cy',here[1]).attr('opacity',showOrigin);
    originHalo.attr('cx',here[0]).attr('cy',here[1]).attr('opacity',showOrigin*(reduced.matches ? .2 : .12+.12*(1+Math.sin(elapsed/1100))));
    // One small light at a time; there is no count, flow volume or encoded metric.
    const duration=4800,slot=Math.floor(elapsed/duration),t=(elapsed%duration)/duration;
    const moving=elevated(routes[slot%routes.length].interpolate(t),t);
    for(const dot of [glow,traveller])dot.attr('cx',moving?.[0]||0).attr('cy',moving?.[1]||0).attr('opacity',moving&&!reduced.matches?Math.sin(Math.PI*t)*quiet:0);
    host.dataset.globeRotation=rotation.toFixed(3);
  }
  function stop(){clock?.stop();clock=null;last=0;}
  function sync(){
    stop();
    if(!active||document.hidden||reduced.matches){paint();return;}
    clock=timer(now=>{
      if(now-last<32)return;
      const dt=last?Math.min(80,now-last):0;last=now;elapsed+=dt;
      quiet+=(quietTarget-quiet)*Math.min(1,dt/1200);
      rotation+=dt*.0011*quiet;paint();
    });
  }
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);paint();
  return {setActive(value){active=value;sync();},setQuiet(value){quietTarget=value ? .28 : 1;},destroy(){stop();document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);svg.remove();}};
}
