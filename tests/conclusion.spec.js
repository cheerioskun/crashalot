import {test,expect} from '@playwright/test';
const root=p=>p.locator('.conclusion-scene'),next=p=>p.locator('[data-story-next]');
async function frozen(page){
 await page.clock.install({time:new Date('2026-11-06T12:00:00Z')});
 await page.goto('/#/welcome');await root(page).waitFor({state:'attached'});
 await page.clock.pauseAt(new Date('2026-11-06T12:01:00Z'));
 await page.evaluate(()=>location.hash='/conclusion');await expect(root(page)).toBeVisible();
}
async function manualAdvance(page){await next(page).click();await next(page).click();}

test('closing narration accumulates, Auto holds at the farewell and explicit Next starts the lettering',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await frozen(page);
 await expect(root(page)).toHaveAttribute('data-beat','0');
 await expect(page.locator('#conclusion-title')).toHaveText(/There’s really\s*nothing to fear\./);
 await expect(root(page).locator('.globe-route')).toHaveCount(6);
 const angle=await root(page).locator('.conclusion-globe-stage').getAttribute('data-globe-rotation');
 await page.clock.runFor(4000);await expect(root(page)).toHaveAttribute('data-beat','1');
 expect(await root(page).locator('.conclusion-globe-stage').getAttribute('data-globe-rotation')).not.toBe(angle);
 await page.clock.runFor(16000);await expect(root(page)).toHaveAttribute('data-beat','4');
 await expect(root(page).locator('.conclusion-farewell')).toContainText('You’ll have a safe flight :)');
 await expect(root(page).locator('.conclusion-fin')).toHaveAttribute('aria-hidden','true');
 await page.clock.fastForward(60000);await expect(root(page)).toHaveAttribute('data-beat','4');
 await expect(page).toHaveURL(/conclusion$/);
 await next(page).click();await expect(root(page)).toHaveAttribute('data-beat','F');
 await page.clock.runFor(2200);await expect(root(page)).toHaveAttribute('data-ink-f','1');
 await expect(root(page)).toHaveAttribute('data-ink-i','0');await expect(root(page)).toHaveAttribute('data-ink-dot','0');
 await page.clock.runFor(1120);await expect(root(page)).toHaveAttribute('data-beat','i');
 await expect(root(page)).toHaveAttribute('data-ink-i','1');
 await page.clock.runFor(1600);await expect(root(page)).toHaveAttribute('data-beat','n');
 await expect(root(page)).toHaveAttribute('data-ink-n','1');await expect(root(page)).toHaveAttribute('data-ink-dot','0');
 await expect(root(page).getByRole('button',{name:'Back to the beginning'})).toBeHidden();
 await page.clock.runFor(500);await expect(root(page)).toHaveAttribute('data-ink-dot','1');
 await expect(root(page).getByRole('button',{name:'Back to the beginning'})).toBeVisible();
 await expect(page.locator('.presentation-footer')).toBeHidden();expect(errors).toEqual([]);
});

test('manual letter beats keep Next available; Space pauses ink, Back undots it and restart resets the story',async({page})=>{
 await frozen(page);await page.locator('#playback-toggle').click();
 for(let i=0;i<6;i++)await manualAdvance(page);
 await expect(root(page)).toHaveAttribute('data-beat','4');
 await next(page).click();await expect(root(page)).toHaveAttribute('data-beat','F');
 await expect(next(page)).toBeVisible();await page.clock.runFor(1000);
 const partial=Number(await root(page).getAttribute('data-ink-f'));expect(partial).toBeGreaterThan(0);expect(partial).toBeLessThan(1);
 // Switch Auto on, then off: stopping the reveal preserves its progress.
 await page.keyboard.press('Space');await page.keyboard.press('Space');
 const frozenInk=await root(page).getAttribute('data-ink-f');await page.clock.fastForward(5000);
 await expect(root(page)).toHaveAttribute('data-ink-f',frozenInk);
 await next(page).click();await next(page).click();await next(page).click();
 await next(page).click();await next(page).click();
 await expect(root(page)).toHaveAttribute('data-ink-dot','1');
 await page.keyboard.press('ArrowLeft');await expect(root(page)).toHaveAttribute('data-beat','i');
 await expect(root(page)).toHaveAttribute('data-ink-dot','0');await expect(next(page)).toBeVisible();
 await manualAdvance(page);await root(page).getByRole('button',{name:'Back to the beginning'}).click();
 await expect(page.locator('#welcome')).toHaveClass(/present/);
 await expect(page.locator('#playback-toggle')).toHaveAttribute('aria-pressed','true');
 await expect(root(page)).toHaveAttribute('data-beat','0');
});

test('reduced motion freezes the globe and keeps the end card behind explicit Next; mobile and dark mode fit',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/#/conclusion');await expect(root(page)).toHaveAttribute('data-beat','4');
 const angle=await root(page).locator('.conclusion-globe-stage').getAttribute('data-globe-rotation');
 await page.waitForTimeout(120);await expect(root(page).locator('.conclusion-globe-stage')).toHaveAttribute('data-globe-rotation',angle);
 await expect.poll(()=>page.locator('#conclusion .view').evaluate(v=>v.scrollWidth<=v.clientWidth)).toBe(true);
 await page.locator('#theme-toggle').click();await expect(page.locator('html')).toHaveAttribute('data-bs-theme','dark');
 await next(page).click();await expect(root(page)).toHaveAttribute('data-ink-dot','1');
 await expect(root(page).getByRole('button',{name:'Back to the beginning'})).toBeVisible();
 const box=await root(page).locator('.fin-lettering').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:/^Slide \d+:/})).toHaveCount(8);
 await page.getByRole('button',{name:/^Slide 7:/}).click();await expect(page.locator('#aircraft-design')).toHaveClass(/present/);
 await expect(page.locator('.presentation-footer')).toBeVisible();await expect(next(page)).toBeEnabled();
});


test('ambient globe suspends while hidden, inactive, or in the end card',async({page})=>{
 await frozen(page);
 const planet=root(page).locator('.conclusion-globe-stage');
 await page.clock.runFor(200);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 const hidden=await planet.getAttribute('data-globe-rotation');await page.clock.fastForward(5000);await expect(planet).toHaveAttribute('data-globe-rotation',hidden);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.clock.runFor(200);
 expect(await planet.getAttribute('data-globe-rotation')).not.toBe(hidden);
 await page.evaluate(()=>location.hash='/aircraft-design');
 const inactive=await planet.getAttribute('data-globe-rotation');await page.clock.fastForward(5000);await expect(planet).toHaveAttribute('data-globe-rotation',inactive);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:/^Slide 8:/}).click();
 const end=await planet.getAttribute('data-globe-rotation');await page.clock.fastForward(5000);await expect(planet).toHaveAttribute('data-globe-rotation',end);
});
