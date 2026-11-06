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

test('four aircraft beats separate the title, inspection explanation, graph and age-distribution annotation',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await frozen(page,'aircraft-design');
 const root=aircraft(page),clip=root.locator('#comparison-points-reveal rect');
 await expect(page.locator('#aircraft-design h1')).toHaveText('Due for an oil change');
 await expect(root).toHaveAttribute('data-beat','0');await expect(root.locator('.aircraft-comparison-grid')).toBeHidden();
 const intro=page.locator('[data-aircraft-intro]');await expect(intro).toBeHidden();
 const geometry=await next(page).boundingBox();
 await next(page).click();await expect(root).toHaveAttribute('data-beat','1');
 await expect(intro).toHaveText('Aircraft have strict inspections at mandated intervals. They aren’t old in the way we think about old machines.');
 await expect(root.locator('.aircraft-comparison-grid')).toBeHidden();
 await next(page).click();await expect(root).toHaveAttribute('data-beat','2');
 expect(await intro.evaluate(n=>getComputedStyle(n).opacity)).toBe('1');
 await page.clock.runFor(700);
 const partial=Number(await clip.getAttribute('width'));expect(partial).toBeGreaterThan(0);
 await root.locator('[data-comparison-pause]').click();const held=await root.getAttribute('data-reveal-progress');
 await page.clock.runFor(3000);await expect(root).toHaveAttribute('data-reveal-progress',held);
 await root.locator('[data-comparison-pause]').click();await page.clock.runFor(900);
 expect(Number(await clip.getAttribute('width'))).toBeGreaterThan(partial);
 await expect(root.locator('.comparison-age-annotation')).toHaveAttribute('opacity','0');
 await next(page).click();await expect(root).toHaveAttribute('data-beat','3');await page.clock.runFor(650);
 await expect(root).toHaveAttribute('data-playback','complete');await expect(root.locator('.comparison-age-annotation')).toHaveAttribute('opacity','1');
 await expect(root.locator('.comparison-age-annotation')).toContainText('become more spread out');
 const spread=await root.evaluate(r=>r.comparisonState.ageSpread);expect(spread.late.span).toBeGreaterThan(spread.early.span);
 await expect(root.locator('.comparison-age-histogram')).toHaveAttribute('opacity','1');await expect(next(page)).toBeDisabled();
 expect(await next(page).boundingBox()).toEqual(geometry);
 await page.locator('[data-story-back]').click();await expect(root).toHaveAttribute('data-beat','2');
 await root.locator('[data-comparison-replay]').click();await expect(root).toHaveAttribute('data-beat','0');
 await expect(root.locator('.aircraft-comparison-grid')).toBeHidden();expect(errors).toEqual([]);
});

test('Auto finishes each comparison and waits for explicit Next; inactive and hidden views suspend reveals',async({page})=>{
 await frozen(page,'flight-types',true);
 await page.clock.runFor(1300);await expect(types(page)).toHaveAttribute('data-beat','1');
 const scheduled=types(page).locator('.type-row').first().locator('.outcome-fatal');expect(Number(await scheduled.getAttribute('width'))).toBeGreaterThan(0);
 const privateBar=types(page).locator('.type-row').nth(1).locator('.outcome-fatal');await expect(privateBar).toHaveAttribute('width','0');
 await page.clock.runFor(10000);await expect(types(page)).toHaveAttribute('data-playback','complete');
 await page.clock.fastForward(60000);await expect(page.locator('#flight-types')).toHaveClass(/present/);
 await next(page).click();await expect(aircraft(page)).toHaveAttribute('data-beat','0');
 await page.clock.runFor(7200);await expect(aircraft(page)).toHaveAttribute('data-beat','2');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 const held=await aircraft(page).getAttribute('data-reveal-progress');await page.clock.runFor(5000);await expect(aircraft(page)).toHaveAttribute('data-reveal-progress',held);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await page.clock.runFor(200);expect(await aircraft(page).getAttribute('data-reveal-progress')).not.toBe(held);
 await page.evaluate(()=>location.hash='/welcome');const away=await aircraft(page).getAttribute('data-reveal-progress');await page.clock.runFor(5000);await expect(aircraft(page)).toHaveAttribute('data-reveal-progress',away);
 await page.evaluate(()=>location.hash='/aircraft-design');await page.clock.runFor(18000);
 await expect(aircraft(page)).toHaveAttribute('data-playback','complete');await expect(aircraft(page)).toHaveAttribute('data-beat','3');
 await page.clock.fastForward(60000);await expect(page.locator('#aircraft-design')).toHaveClass(/present/);await expect(next(page)).toBeDisabled();
});

test('reduced motion opens a complete static comparison; native data interaction also opens exploration',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#/aircraft-design');
 await expect(aircraft(page)).toHaveAttribute('data-playback','complete');await expect(aircraft(page)).toHaveAttribute('data-beat','3');
 await expect(aircraft(page).locator('.comparison-maker-controls')).toBeVisible();
 await page.emulateMedia({reducedMotion:'no-preference'});await aircraft(page).locator('[data-comparison-replay]').click();await expect(aircraft(page)).toHaveAttribute('data-beat','0');
 await next(page).click();await next(page).click();
 await aircraft(page).locator('[data-start]').fill('2000');await aircraft(page).locator('[data-start]').press('Tab');
 await expect(aircraft(page)).toHaveAttribute('data-beat','3');await expect(aircraft(page)).toHaveAttribute('data-start-year','2000');
});


test('year-field changes ease the outward histogram between old and new edges',async({page})=>{
 await frozen(page,'aircraft-design');
 for(let i=0;i<5;i++)await next(page).click();
 await page.clock.runFor(250);
 const bar=aircraft(page).locator('.age-bin-fatal').first();const original=Number(await bar.getAttribute('x'));
 await aircraft(page).locator('[data-end]').fill('1999');await aircraft(page).locator('[data-end]').press('Tab');
 const target=await aircraft(page).evaluate(r=>r.comparisonState.histogram.edge);expect(target).toBeLessThan(original);
 await page.clock.runFor(80);const intermediate=Number(await bar.getAttribute('x'));expect(intermediate).toBeGreaterThan(target);expect(intermediate).toBeLessThan(original);
 await page.clock.runFor(150);expect(Number(await bar.getAttribute('x'))).toBeCloseTo(target,4);
});
