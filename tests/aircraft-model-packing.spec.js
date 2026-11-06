import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const root=page=>page.locator('.comparison-aircraft');
const state=page=>root(page).evaluate(node=>node.comparisonState);
const circle=(page,model)=>root(page).locator('.model-circle').filter({has:page.locator('circle')}).and(root(page).locator(`[data-model="${model}"]`));
async function open(page){await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#/aircraft-design');await expect(root(page).locator('.model-circle')).toHaveCount(479);}

test('packed area preserves every selected model and record; saturation encodes fatal share',async({page})=>{
 await open(page);const s=await state(page),circles=s.modelPacking.circles;
 expect(circles).toHaveLength(s.modelCells.length);
 expect(circles.flatMap(c=>c.recordIds).sort()).toEqual([...s.recordIds].sort());
 expect(circles.reduce((sum,c)=>sum+c.count,0)).toBe(12293);
 const areaPerRecord=circles[0].r**2/circles[0].count;
 for(const c of circles){
  expect(c.r**2/c.count).toBeCloseTo(areaPerRecord,5);
  const source=s.modelCells.find(model=>model.label===c.model);
  expect(c.count).toBe(source.count);expect(c.fatalCount).toBe(source.fatalCount);
  expect(c.fatalShare).toBe(source.fatalCount/source.count);
  const [,hue,saturation,lightness]=c.fill.match(/hsl\(([\d.]+), ([\d.]+)%, ([\d.]+)%\)/);
  expect(Number(hue)).toBe(46);expect(Number(lightness)).toBe(62);expect(Number(saturation)/100).toBeCloseTo(c.fatalShare,8);
 }
 let minimumGap=Infinity;
 for(let i=0;i<circles.length;i++)for(let j=i+1;j<circles.length;j++)minimumGap=Math.min(minimumGap,Math.hypot(circles[i].x-circles[j].x,circles[i].y-circles[j].y)-circles[i].r-circles[j].r);
 expect(minimumGap).toBeGreaterThanOrEqual(-.001);
 await expect(root(page).getByText('Selected crash records',{exact:true})).toHaveCount(0);
});

test('circle and keyboard selection change the schematic without changing the brushed records',async({page})=>{
 await open(page);const ids=(await state(page)).recordIds;
 const model='Douglas C-47 Skytrain (DC-3)',target=circle(page,model);await target.click();
 await expect(root(page).locator('.model-polaroid-stage')).toHaveAttribute('data-model',model);
 await expect(root(page).locator('.model-polaroid-stage')).toHaveAttribute('data-has-schematic','true');
 await expect(root(page).locator('.model-polaroid img')).toHaveJSProperty('complete',true);
 await expect.poll(()=>root(page).locator('.model-polaroid img').evaluate(i=>i.naturalWidth)).toBeGreaterThan(0);
 expect((await state(page)).recordIds).toEqual(ids);
 await target.focus();await page.keyboard.press('ArrowRight');
 const focused=await page.locator(':focus').getAttribute('data-model');expect(focused).not.toBe(model);
 await page.keyboard.press('Space');await expect(root(page).locator('.model-polaroid-stage')).toHaveAttribute('data-model',focused);
 await expect(page).toHaveURL(/aircraft-design$/);
 await root(page).getByRole('combobox',{name:'Aircraft model',exact:true}).selectOption('Cessna 402');
 await expect(root(page).locator('.model-polaroid-stage')).toHaveAttribute('data-has-schematic','false');
 await expect(root(page).locator('.model-schematic-placeholder')).toContainText('Schematic not available');
 await expect(root(page).locator('.model-polaroid img')).toHaveCount(0);
 await root(page).locator('[data-manufacturer]').selectOption('Antonov');
 const filtered=await state(page);expect(filtered.modelPacking.circles.every(c=>c.model.startsWith('Antonov'))).toBe(true);
 expect(filtered.modelPacking.circles.flatMap(c=>c.recordIds).sort()).toEqual([...filtered.recordIds].sort());
 expect(filtered.modelPacking.selectedModel.startsWith('Antonov')).toBe(true);
});

test('schematics have local previews and source credits; layout fits mobile and theme changes',async({page,request})=>{
 const catalogue=JSON.parse(await readFile(new URL('../src/data/aircraft-schematics.json',import.meta.url)));
 const original=catalogue.models.filter(m=>m.cohort!=='boeing-airbus-extension');
 expect(original).toHaveLength(30);expect(original.filter(m=>m.asset)).toHaveLength(23);
 for(const m of catalogue.models.filter(m=>m.asset)){
  if(m.sourceType==='manufacturer-pdf'){
   expect(new URL(m.sourceUrl).hostname).toMatch(/(?:^|\.)(?:boeing|airbus)\.com$/);
   expect(m.sourcePages.length).toBeGreaterThan(0);expect(m.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
  }else{
   expect(m.sourceUrl).toMatch(/^https:\/\/www\.the-blueprints\.com\/blueprints\//);
   expect(m.imageUrl).toContain('/blueprints-depot');
   expect(Math.max(m.previewWidth,m.previewHeight)).toBeLessThanOrEqual(500);
  }
  const response=await request.get('/'+m.asset);expect(response.ok()).toBe(true);expect(response.headers()['content-type']).toMatch(/^image\//);
 }
 await open(page);await page.setViewportSize({width:390,height:844});
 await root(page).locator('.comparison-model-grid').scrollIntoViewIfNeeded();
 await expect.poll(()=>page.locator('#aircraft-design .view').evaluate(v=>v.scrollWidth<=v.clientWidth)).toBe(true);
 const ids=(await state(page)).recordIds;
 await page.locator('#theme-toggle').click();await expect(page.locator('html')).toHaveAttribute('data-bs-theme','dark');
 expect((await state(page)).recordIds).toEqual(ids);
 await expect(root(page).locator('.model-polaroid a')).toHaveAttribute('href',/the-blueprints\.com/);
});

test('all Airbus models and every verified Boeing variant select their own schematic',async({page})=>{
 await open(page);
 const models=(await state(page)).modelCells.filter(model=>/^(Airbus|Boeing)\b/.test(model.label));
 expect(models.filter(model=>model.label.startsWith('Airbus'))).toHaveLength(11);
 expect(models.filter(model=>model.label.startsWith('Boeing'))).toHaveLength(31);
 const before=(await state(page)).recordIds;
 for(const model of models){
  await root(page).getByRole('combobox',{name:'Aircraft model',exact:true}).selectOption(model.label);
  const hasDrawing=model.label!=='Boeing KC-137 Stratoliner';
  await expect(root(page).locator('.model-polaroid-stage')).toHaveAttribute('data-has-schematic',String(hasDrawing));
  if(hasDrawing)await expect.poll(()=>root(page).locator('.model-polaroid img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 }
 expect((await state(page)).recordIds).toEqual(before);
});

test('a new model enters with the opening Polaroid fade and tilted rise',async({page})=>{
 await open(page);await page.emulateMedia({reducedMotion:'no-preference'});
 await circle(page,'Douglas C-47 Skytrain (DC-3)').click();
 const frame=root(page).locator('.model-polaroid');
 const animations=await frame.evaluate(n=>n.getAnimations().map(a=>({name:a.animationName,duration:a.effect.getTiming().duration,frames:a.effect.getKeyframes()})));
 expect(animations.find(a=>a.name==='model-photo-fade').duration).toBe(650);
 const rise=animations.find(a=>a.name==='model-photo-enter');expect(rise.duration).toBe(850);
 expect(rise.frames[0].transform).toContain('25px, 40px');
 expect(rise.frames.at(-1).transform).toContain('-2deg');
});

test('equal model totals in two periods still refresh the underlying source identities',async({page,request})=>{
 const data=await(await request.get('/data/comparison-records.json')).json();
 const rows=data.rows.map(row=>Object.fromEntries(data.columns.map((column,index)=>[column,row[index]]))).filter(row=>row.age!==null);
 const populations=new Map();
 for(const row of rows){const key=JSON.stringify([row.manufacturer,row.year]);if(!populations.has(key))populations.set(key,[]);populations.get(key).push(row);}
 const seen=new Map();let pair;
 for(const population of populations.values()){
  const models=new Map();for(const row of population){if(!models.has(row.aircraft))models.set(row.aircraft,[0,0]);const count=models.get(row.aircraft);count[0]++;count[1]+=Number(row.fatalities>0);}
  const signature=JSON.stringify([population[0].manufacturer,[...models].sort(([a],[b])=>a.localeCompare(b))]);
  if(seen.has(signature)){pair=[seen.get(signature),population];break;}seen.set(signature,population);
 }
 expect(pair).toBeDefined();await open(page);
 const maker=pair[0][0].manufacturer;
 await root(page).locator('[data-manufacturer]').selectOption(maker);
 let before;
 for(const population of pair){
  const year=population[0].year;
  await root(page).locator('[data-start]').fill(String(year));await root(page).locator('[data-start]').press('Tab');
  await root(page).locator('[data-end]').fill(String(year));await root(page).locator('[data-end]').press('Tab');
  const packing=(await state(page)).modelPacking.circles;
  expect(packing.flatMap(circle=>circle.recordIds).sort()).toEqual(population.map(row=>row.source_id).sort());
  const shape=packing.map(circle=>[circle.model,circle.count,circle.fatalCount,circle.r]);
  if(before)expect(shape).toEqual(before);else before=shape;
 }
});
