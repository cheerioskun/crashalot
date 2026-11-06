// Penflow 0.1.0 renders glyph contours but exposes no controlled playhead.
// Add one at build time so the existing slide clock owns pause, seek and reduced
// motion. Keep the installed renderer intact; fail loudly on an upstream change.
export function controlledPenflow(){
 return {name:'penflow-controlled-playhead',enforce:'pre',transform(source,id){
  if(!id.split('?')[0].replaceAll('\\','/').endsWith('/penflow/dist/react.js'))return;
  const replacements=[
   ['  playheadKey = 0\n','  playheadKey = 0,\n  progress\n'],
   ['      if (animate) {','      if (progress != null) penTime = clamp(progress, 0, 1) * model.totalDuration;\n      else if (animate) {'],
   ['      if (autoReplay || penTime < model.totalDuration) frame = requestAnimationFrame(draw);','      if (progress == null && (autoReplay || penTime < model.totalDuration)) frame = requestAnimationFrame(draw);'],
   ['    if (!animate) {','    if (progress != null) { draw(now); return; }\n    if (!animate) {'],
   ['[animate, autoReplay, color, incremental, model, playheadKey, quality, text]','[animate, autoReplay, color, incremental, model, playheadKey, quality, text, progress]'],
  ];
  for(const [before,after]of replacements){if(!source.includes(before))throw new Error('Penflow renderer changed; review the controlled playhead adapter.');source=source.replace(before,after);}
  return {code:source,map:null};
 }};
}
