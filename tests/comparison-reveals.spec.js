import {test,expect} from '@playwright/test';
const next=p=>p.locator('[data-story-next]');
const aircraft=p=>p.locator('.comparison-aircraft');
const types=p=>p.locator('.comparison-types');
async function frozen(page,id,auto=false){
 await page.clock.install({time:new Date('2026-11-06T12:00:00Z')});
 await page.goto('/#/welcome');await aircraft(page).waitFor({state:'attached'});
 await page.clock.pauseAt(new Date('2026-11-06T12:01:00Z'));
 if(!auto)await page.locator('#playback-toggle').click();
 await page.evaluate(id=>location.hash=`/${id}`,id);await expect(page.locator(`#${id}`)).toHaveClass(/present/);
}

test('inspection text and scaffold fade together, then records pour in before the annotation',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await frozen(page,'aircraft-design');
 const root=aircraft(page),grid=root.locator('.aircraft-comparison-grid');
 const intro=page.locator('[data-aircraft-intro]');
 const visibleYears=()=>root.locator('.comparison-point-year').evaluateAll(nodes=>nodes.filter(n=>Number(n.getAttribute('opacity'))>0).map(n=>Number(n.dataset.year)));
 await expect(page.locator('#aircraft-design h1')).toHaveText('Due for an oil change');
 await expect(root).toHaveAttribute('data-beat','0');await expect(grid).toBeHidden();await expect(intro).toBeHidden();
 const geometry=await next(page).boundingBox();
 await next(page).click();await expect(root).toHaveAttribute('data-beat','1');
 await expect(intro).toHaveText('Aircraft have strict inspections at mandated intervals. They aren’t old in the way we think about old machines.');
 await page.clock.runFor(300);
 const opacity=Number(await grid.evaluate(n=>getComputedStyle(n).opacity));
 expect(opacity).toBeGreaterThan(0);expect(opacity).toBeLessThan(1);
 expect(Number(await intro.evaluate(n=>getComputedStyle(n).opacity))).toBeCloseTo(opacity,5);
 expect(await visibleYears()).toEqual([]);
 await page.clock.runFor(400);await expect(grid).toHaveCSS('opacity','1');
 await expect(root).toHaveAttribute('data-beat','1');await expect(root).toHaveAttribute('data-data-progress','0');
 await expect(root.locator('.comparison-age-histogram')).toHaveAttribute('opacity','0');
 await expect(root.locator('.comparison-model-grid')).toBeHidden();
 await expect(root.locator('.comparison-manufacturer-context')).toHaveText('Click a choice to filter on it.');
 await expect(root.locator('.comparison-manufacturer-bars .record-bar>strong').first()).toHaveCSS('opacity','0');
 await next(page).click();await expect(root).toHaveAttribute('data-beat','2');
 await page.clock.runFor(500);
 const firstYears=await visibleYears();expect(firstYears.length).toBeGreaterThan(0);expect(firstYears.length).toBeLessThan(55);
 expect(Math.max(...firstYears)).toBeLessThan(2000);
 await root.locator('[data-comparison-pause]').click();const held=await root.getAttribute('data-reveal-progress');
 await page.clock.runFor(3000);await expect(root).toHaveAttribute('data-reveal-progress',held);
 await root.locator('[data-comparison-pause]').click();await page.clock.runFor(500);
 expect((await visibleYears()).length).toBeGreaterThan(firstYears.length);
 await expect(root.locator('.comparison-age-annotation')).toHaveAttribute('opacity','0');
 await page.clock.runFor(850);await expect(root).toHaveAttribute('data-data-progress','1');
 await next(page).click();await expect(root).toHaveAttribute('data-beat','3');
 await expect(root.locator('.comparison-age-annotation')).toHaveAttribute('opacity','0');
 await next(page).click();await expect(root).toHaveAttribute('data-beat','3.5');await page.clock.runFor(650);
 await expect(root).toHaveAttribute('data-playback','complete');await expect(root.locator('.comparison-age-annotation')).toHaveAttribute('opacity','1');
 await expect(root.locator('.comparison-age-annotation')).toContainText('become more spread out');
 const spread=await root.evaluate(r=>r.comparisonState.ageSpread);expect(spread.late.span).toBeGreaterThan(spread.early.span);
 await expect(root.locator('.comparison-age-histogram')).toHaveAttribute('opacity','1');await expect(next(page)).toBeEnabled();
 expect(await next(page).boundingBox()).toEqual(geometry);
 await page.locator('[data-story-back]').click();await expect(root).toHaveAttribute('data-beat','3');
 await root.locator('[data-comparison-replay]').click();await expect(root).toHaveAttribute('data-beat','0');
 await expect(grid).toBeHidden();expect(errors).toEqual([]);
});

test('Auto finishes each comparison and waits for explicit Next; inactive and hidden views suspend reveals',async({page})=>{
 await frozen(page,'flight-types',true);
 await page.clock.runFor(1300);await expect(types(page)).toHaveAttribute('data-beat','1');
 const scheduled=types(page).locator('.type-row').first();expect(Number(await scheduled.getAttribute('data-trail-progress'))).toBeGreaterThan(0);
 await expect(scheduled.locator('.trail-fatal')).toHaveAttribute('d',/^M/);
 const privateTrail=types(page).locator('.type-row').nth(1);await expect(privateTrail).toHaveAttribute('data-trail-progress','0');
 await page.clock.runFor(10000);await expect(types(page)).toHaveAttribute('data-playback','complete');
 await page.clock.fastForward(60000);await expect(page.locator('#flight-types')).toHaveClass(/present/);
 await next(page).click();await expect(aircraft(page)).toHaveAttribute('data-beat','0');
 await page.clock.runFor(1050);await expect(aircraft(page)).toHaveAttribute('data-beat','1');
 await expect(aircraft(page)).toHaveAttribute('data-data-progress','0');
 await page.clock.runFor(1700);await expect(aircraft(page)).toHaveAttribute('data-beat','2');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 const held=await aircraft(page).getAttribute('data-reveal-progress');await page.clock.runFor(5000);await expect(aircraft(page)).toHaveAttribute('data-reveal-progress',held);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await page.clock.runFor(200);expect(await aircraft(page).getAttribute('data-reveal-progress')).not.toBe(held);
 await page.evaluate(()=>location.hash='/welcome');const away=await aircraft(page).getAttribute('data-reveal-progress');await page.clock.runFor(5000);await expect(aircraft(page)).toHaveAttribute('data-reveal-progress',away);
 await page.evaluate(()=>location.hash='/aircraft-design');
 await page.locator('#playback-toggle').click();await page.clock.runFor(18000);
 await expect(aircraft(page)).toHaveAttribute('data-playback','complete');await expect(aircraft(page)).toHaveAttribute('data-beat','3.5');
 await page.clock.fastForward(60000);await expect(page.locator('#aircraft-design')).toHaveClass(/present/);await expect(next(page)).toBeEnabled();
});

test('reduced motion opens a complete static comparison; native data interaction also opens exploration',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#/aircraft-design');
 await expect(aircraft(page)).toHaveAttribute('data-playback','complete');await expect(aircraft(page)).toHaveAttribute('data-beat','3.5');
 await expect(aircraft(page).locator('.comparison-maker-controls')).toBeVisible();
 await page.emulateMedia({reducedMotion:'no-preference'});await aircraft(page).locator('[data-comparison-replay]').click();await expect(aircraft(page)).toHaveAttribute('data-beat','0');
 await next(page).click();await next(page).click();
 await aircraft(page).locator('[data-start]').fill('2000');await aircraft(page).locator('[data-start]').press('Tab');
 await expect(aircraft(page)).toHaveAttribute('data-beat','3.5');await expect(aircraft(page)).toHaveAttribute('data-start-year','2000');
});


test('year-field changes ease the outward histogram between old and new edges',async({page})=>{
 await frozen(page,'aircraft-design');
 while(await aircraft(page).getAttribute('data-playback')!=='complete')await next(page).click();
 await page.clock.runFor(250);
 const bar=aircraft(page).locator('.age-bin-fatal').first();const original=Number(await bar.getAttribute('x'));
 await aircraft(page).locator('[data-end]').fill('1999');await aircraft(page).locator('[data-end]').press('Tab');
 const target=await aircraft(page).evaluate(r=>r.comparisonState.histogram.edge);expect(target).toBeLessThan(original);
 await page.clock.runFor(80);const intermediate=Number(await bar.getAttribute('x'));expect(intermediate).toBeGreaterThan(target);expect(intermediate).toBeLessThan(original);
 await page.clock.runFor(150);expect(Number(await bar.getAttribute('x'))).toBeCloseTo(target,4);
});
