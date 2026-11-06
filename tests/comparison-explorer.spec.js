import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});});
const root=p=>p.locator('.comparison-aircraft');
const state=p=>root(p).evaluate(r=>r.comparisonState);
const projected=data=>data.rows.map(row=>Object.fromEntries(data.columns.map((c,i)=>[c,row[i]])));
const sorted=rows=>[...rows].sort();
function check(s,rows) {
 const expected=rows.filter(r=>r.age!==null && r.year>=s.filter.start && r.year<s.filter.end && (s.filter.operation==='all'||r.operation===s.filter.operation) && (!s.filter.manufacturer||r.manufacturer===s.filter.manufacturer));
 expect(s.recordIds).toEqual(expected.map(r=>r.source_id));
 expect(new Set(s.recordIds).size).toBe(s.recordIds.length);
 expect(sorted(s.modelCells.flatMap(c=>c.recordIds))).toEqual(sorted(s.recordIds));
 for(const cell of [...s.modelCells,...s.manufacturerCells]) {
  expect(cell.fatalCount).toBe(cell.fatalRecordIds.length);
  expect(cell.fatalRecordIds.every(id=>rows.some(r=>r.source_id===id && r.fatalities>0))).toBe(true);
 }
 for(const cell of s.modelCells) expect(cell.recordIds).toEqual(expected.filter(r=>r.aircraft===cell.label).map(r=>r.source_id));
 for(const cell of s.manufacturerCells) expect(cell.recordIds).toEqual(rows.filter(r=>r.age!==null && r.year>=s.filter.start && r.year<s.filter.end && (s.filter.operation==='all'||r.operation===s.filter.operation) && r.manufacturer===cell.label).map(r=>r.source_id));
 if(s.ageBins){
  expect(sorted(s.ageBins.flatMap(b=>b.recordIds))).toEqual(sorted(s.recordIds));
  for(const b of s.ageBins){
   expect(b.count).toBe(b.recordIds.length);
   expect(b.recordIds.every(id=>expected.some(r=>r.source_id===id && r.age>=b.from && r.age<b.to))).toBe(true);
   expect(b.fatalCount).toBe(expected.filter(r=>r.age>=b.from && r.age<b.to && r.fatalities>0).length);
  }
 }
 expect(s.recordKeys).toEqual(s.recordIds.map(id=>`${s.source.dataset}@${s.source.revision}:${id}`));
}
async function open(page) {
 await page.goto('/#/aircraft-design');await expect(root(page)).toBeVisible();
 await page.locator('.comparison-scatter circle').first().waitFor({state:'attached'});
}
async function years(page,start,end) {
 await root(page).locator('[data-start]').fill(String(start));await root(page).locator('[data-start]').press('Tab');
 await root(page).locator('[data-end]').fill(String(end));await root(page).locator('[data-end]').press('Tab');
}

test('new chapters replace every old placeholder; type choice and years carry between views',async({page,request})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const data=await(await request.get('/data/comparison-records.json')).json(),rows=projected(data);
 const phases=await(await request.get('/data/flight-exploration.json')).json();
 await page.goto('/#/flight-types');
 await expect(page.locator('.comparison-types .type-row')).toHaveCount(8);
 expect(await page.locator('.slides>section').evaluateAll(ns=>ns.map(n=>n.id))).toEqual(['welcome','flight-1282','change-over-time','counts-in-context','flight-phase','flight-types','aircraft-design']);
 await expect(page.locator('.storyboard-placeholder,#another-perspective,#the-whole-picture,#arrival')).toHaveCount(0);
 const initial=await page.locator('.comparison-types').evaluate(r=>r.comparisonState);
 expect(initial.filter.operation).toBe('all');
 expect(initial.recordIds).toEqual(rows.map(r=>r.source_id));
 expect(sorted(initial.typeCells.find(c=>c.label==='scheduled').recordIds)).toEqual(sorted(phases.rows.filter(r=>['departure','in_flight','arrival'].includes(r[1])).map(r=>r[0])));
 expect(initial.typeCells.reduce((n,c)=>n+c.count,0)).toBe(rows.length);
 await page.getByRole('button',{name:/^Private: /}).click();
 await page.locator('[data-story-next]').click();await expect(root(page)).toBeVisible();
 await expect(root(page).locator('[data-operation]')).toHaveValue('private');
 await years(page,2000,2009);
 await expect(root(page).locator('[data-start]')).toHaveValue('2000');
 await expect(root(page).locator('[data-end]')).toHaveValue('2009');
 let s=await state(page);check(s,rows);
 const maker=s.manufacturerCells[0].label;
 await root(page).locator('[data-manufacturer]').selectOption(maker);
 s=await state(page);check(s,rows);
 const highlighted=await page.locator('.comparison-scatter circle[data-selected=true]').evaluateAll(ns=>ns.map(n=>n.dataset.recordId));
 expect(highlighted).toEqual(s.recordIds);
 for(let i=0;i<5;i++)await page.locator('[data-story-back]').click();
 await expect(page.locator('#flight-types')).toHaveClass(/present/);
 await expect(page.locator('.comparison-types [data-start]')).toHaveValue('2000');
 await expect(page.locator('.comparison-types [data-end]')).toHaveValue('2009');
 await expect(page.locator('.comparison-types [data-operation]')).toHaveValue('private');
 await page.locator('[data-story-next]').click();check(await state(page),rows);
 expect(errors).toEqual([]);
});

test('a real time brush selects original plotted IDs and survives resizing and theme changes',async({page,request})=>{
 const rows=projected(await(await request.get('/data/comparison-records.json')).json());
 await open(page);
 const before=await state(page);check(before,rows);
 await expect(root(page).locator('[data-operation]')).toHaveValue('all');
 expect(before.recordIds).toEqual(rows.filter(r=>r.age!==null).map(r=>r.source_id));
 const box=await page.locator('.comparison-scatter').boundingBox();
 const x=year=>box.x+42+(Date.UTC(year,6,1)-Date.UTC(1970,0,1))/(Date.UTC(2025,0,1)-Date.UTC(1970,0,1))*(box.width-42-(box.width<500?56:92));
 await page.mouse.move(x(1995),box.y+120);await page.mouse.down();
 await page.mouse.move(x(2005),box.y+120,{steps:12});await page.mouse.up();
 await expect(root(page)).toHaveAttribute('data-start-year','1995');
 await expect(root(page)).toHaveAttribute('data-end-year','2005');
 const selected=await state(page);check(selected,rows);
 expect(selected.histogram.direction).toBe('outward');
 await expect.poll(()=>page.locator('.age-bin-fatal').evaluateAll(ns=>Math.min(...ns.map(n=>Number(n.getAttribute('x')))))).toBeCloseTo(selected.histogram.edge,4);
 const nonfatalRects=await page.locator('.age-bin-nonfatal').evaluateAll(ns=>ns.map(n=>Number(n.getAttribute('x'))));
 expect(nonfatalRects.every(x=>x>=selected.histogram.edge)).toBe(true);
 expect(selected.ageBins.length).toBeGreaterThan(0);
 const edge=await page.locator('.comparison-age-histogram>line').getAttribute('x1');
 expect(Number(edge)).toBeCloseTo(selected.histogram.edge,5);
 const spread=selected.ageSpread;expect(spread.widened).toBe(true);
 expect(spread.early.recordIds.every(id=>rows.some(r=>r.source_id===id && r.year<1990))).toBe(true);
 expect(spread.late.recordIds.every(id=>rows.some(r=>r.source_id===id && r.year>=2005))).toBe(true);
 expect(selected.recordIds.length).toBeGreaterThan(0);expect(selected.recordIds.length).toBeLessThan(before.recordIds.length);
 const plotted=await page.locator('.comparison-scatter circle').evaluateAll(ns=>ns.map(n=>n.dataset.recordId));
 expect(plotted.every(id=>rows.find(r=>r.source_id===id).age!==null)).toBe(true);
 await page.setViewportSize({width:390,height:844});
 await expect.poll(()=>page.locator('#aircraft-design .view').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 expect((await state(page)).recordIds).toEqual(selected.recordIds);
 await page.locator('#theme-toggle').click();await expect(page.locator('html')).toHaveAttribute('data-bs-theme','dark');
 expect((await state(page)).recordIds).toEqual(selected.recordIds);
 await root(page).locator('[data-reset-years]').click();
 await expect(root(page)).toHaveAttribute('data-start-year','1970');
 expect((await state(page)).recordIds).toEqual(before.recordIds);
});

test('keyboard year controls allow an empty selection without stale records or slide navigation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await open(page);
 await root(page).locator('[data-start]').fill('2000');
 await page.setViewportSize({width:1200,height:850});
 await expect(root(page).locator('[data-start]')).toHaveValue('2000');
 await root(page).locator('[data-start]').press('Tab');
 expect((await state(page)).filter.start).toBe(2000);
 await years(page,1970,1970);
 await root(page).locator('[data-manufacturer]').selectOption('Airbus');
 await expect(root(page)).toHaveAttribute('data-selection-count','0');
 await expect(root(page).locator('.model-packing-empty')).toHaveText('No models in this selection.');
 await expect(root(page).locator('.model-circle')).toHaveCount(0);
 await expect(root(page).getByRole('combobox',{name:'Aircraft model',exact:true})).toBeDisabled();
 await expect(root(page).locator('.comparison-record-list,.comparison-records,[data-download]')).toHaveCount(0);
 await root(page).locator('[data-start]').focus();await page.keyboard.press('ArrowLeft');
 await expect(page).toHaveURL(/aircraft-design$/);
 await root(page).locator('[data-clear-maker]').click();
 expect((await state(page)).recordIds.length).toBeGreaterThan(0);
 await expect(page.locator('[data-story-next]')).toBeDisabled();
});


test('fatal stacks start at zero and disclose fatal, nonfatal and total outcomes on hover and focus',async({page,request})=>{
 const rows=projected(await(await request.get('/data/comparison-records.json')).json());
 await page.goto('/#/flight-types');
 const chart=page.locator('.comparison-types');await expect(chart.locator('.type-row')).toHaveCount(8);
 const cells=await chart.evaluate(r=>r.comparisonState.typeCells);
 for(const cell of cells){
  const source=rows.filter(r=>r.operation===cell.label);
  expect(cell.fatalCount).toBe(source.filter(r=>r.fatalities>0).length);
  expect(cell.count).toBe(source.length);
 }
 await chart.locator('[data-start]').click(); // Open exploration before checking final stacked geometry.
 const first=chart.locator('.type-row').first();
 const fatal=first.locator('.outcome-fatal'),nonfatal=first.locator('.outcome-nonfatal');
 expect(Number(await fatal.getAttribute('x'))).toBe(0);
 expect(Number(await fatal.getAttribute('width'))).toBeGreaterThan(0);
 const totalWidth=Number(await fatal.getAttribute('width'))+Number(await nonfatal.getAttribute('width'));
 expect(Number(await fatal.getAttribute('width'))/totalWidth).toBeCloseTo(cells[0].fatalCount/cells[0].count,5);
 expect(Number(await nonfatal.getAttribute('x'))).toBeCloseTo(Number(await fatal.getAttribute('width')),5);
 await first.hover();await expect(chart.getByRole('tooltip')).toContainText('fatal');await expect(chart.getByRole('tooltip')).toContainText('nonfatal');await expect(chart.getByRole('tooltip')).toContainText('total');
 await first.focus();await expect(chart.getByRole('tooltip')).toBeVisible();
 await page.goto('/#/aircraft-design');await root(page).locator('[data-start]').click();await expect(root(page).locator('.record-bar').first()).toBeVisible();
 await expect(root(page).locator('.comparison-manufacturer-context')).toHaveText('Click a choice to filter on it.');
 const maker=root(page).locator('.comparison-manufacturer-bars .record-bar').first();
 await maker.focus();await expect(root(page).getByRole('tooltip')).toContainText('total');
});


test('clicking outside the time brush clears it; outward histogram stays within the SVG',async({page})=>{
 await open(page);await years(page,1995,2005);
 const selected=await state(page);expect(selected.recordIds.length).toBeGreaterThan(0);
 const box=await page.locator('.comparison-scatter').boundingBox();
 await page.mouse.click(box.x+55,box.y+120);
 await expect(root(page)).toHaveAttribute('data-start-year','1970');await expect(root(page)).toHaveAttribute('data-end-year','2024');
 expect((await state(page)).recordIds.length).toBeGreaterThan(selected.recordIds.length);
 await expect(page.locator('.comparison-brush .selection')).not.toBeVisible();
 await expect.poll(()=>page.locator('.comparison-age-histogram rect').evaluateAll(ns=>Math.max(...ns.map(n=>Number(n.getAttribute('x'))+Number(n.getAttribute('width')))))) .toBeLessThanOrEqual(box.width);
 const colors=await page.locator('.age-bin-fatal,.comparison-manufacturer-bars .outcome-fatal').evaluateAll(ns=>ns.map(n=>getComputedStyle(n)[n.tagName==='rect'?'fill':'backgroundColor']));
 expect(colors.every(color=>color==='rgb(166, 121, 0)')).toBe(true);
});
