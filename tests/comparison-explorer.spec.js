import {test,expect} from '@playwright/test';
const root=p=>p.locator('.comparison-aircraft');
const state=p=>root(p).evaluate(r=>r.comparisonState);
const projected=data=>data.rows.map(row=>Object.fromEntries(data.columns.map((c,i)=>[c,row[i]])));
const sorted=rows=>[...rows].sort();
function check(s,rows) {
 const expected=rows.filter(r=>r.age!==null && r.year>=s.filter.start && r.year<s.filter.end && (s.filter.operation==='all'||r.operation===s.filter.operation) && (!s.filter.manufacturer||r.manufacturer===s.filter.manufacturer));
 expect(s.recordIds).toEqual(expected.map(r=>r.source_id));
 expect(new Set(s.recordIds).size).toBe(s.recordIds.length);
 expect(sorted(s.modelCells.flatMap(c=>c.recordIds))).toEqual(sorted(s.recordIds));
 for(const cell of s.modelCells) expect(cell.recordIds).toEqual(expected.filter(r=>r.aircraft===cell.label).map(r=>r.source_id));
 for(const cell of s.manufacturerCells) expect(cell.recordIds).toEqual(rows.filter(r=>r.age!==null && r.year>=s.filter.start && r.year<s.filter.end && (s.filter.operation==='all'||r.operation===s.filter.operation) && r.manufacturer===cell.label).map(r=>r.source_id));
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
 expect(sorted(initial.recordIds)).toEqual(sorted(phases.rows.filter(r=>['departure','in_flight','arrival'].includes(r[1])).map(r=>r[0])));
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
 await page.locator('[data-story-back]').click();
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
 const box=await page.locator('.comparison-scatter').boundingBox();
 const x=year=>box.x+42+(Date.UTC(year,6,1)-Date.UTC(1970,0,1))/(Date.UTC(2025,0,1)-Date.UTC(1970,0,1))*(box.width-54);
 await page.mouse.move(x(1995),box.y+120);await page.mouse.down();
 await page.mouse.move(x(2005),box.y+120,{steps:12});await page.mouse.up();
 await expect(root(page)).toHaveAttribute('data-start-year','1995');
 await expect(root(page)).toHaveAttribute('data-end-year','2005');
 const selected=await state(page);check(selected,rows);
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
 await expect(root(page).locator('.comparison-record-caption')).toHaveText('No records match this selection.');
 await expect(root(page).locator('.comparison-record-list li')).toHaveCount(0);
 await expect(root(page).locator('[data-download]')).toBeDisabled();
 await root(page).locator('[data-start]').focus();await page.keyboard.press('ArrowLeft');
 await expect(page).toHaveURL(/aircraft-design$/);
 await root(page).locator('[data-clear-maker]').click();
 expect((await state(page)).recordIds.length).toBeGreaterThan(0);
 await expect(page.locator('[data-story-next]')).toBeDisabled();
});
