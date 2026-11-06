import {test,expect} from '@playwright/test';
const root=p=>p.locator('.conclusion-scene'),next=p=>p.locator('[data-story-next]');
async function frozen(page){
 await page.clock.install({time:new Date('2026-11-06T12:00:00Z')});
 await page.goto('/#/welcome');await root(page).waitFor({state:'attached'});
 await page.clock.pauseAt(new Date('2026-11-06T12:01:00Z'));
 await page.evaluate(()=>location.hash='/conclusion');await expect(root(page)).toBeVisible();
}
async function manualAdvance(page){await next(page).click();await next(page).click();}

test('closing narration accumulates, Auto holds at the farewell and explicit Next writes Thanks for watching',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await frozen(page);
 await expect(root(page)).toHaveAttribute('data-beat','0');
 await expect(root(page).locator('.globe-route')).toHaveCount(40);
 const angle=await root(page).locator('.conclusion-globe-stage').getAttribute('data-globe-rotation');
 await page.clock.runFor(4000);await expect(root(page)).toHaveAttribute('data-beat','1');
 expect(await root(page).locator('.conclusion-globe-stage').getAttribute('data-globe-rotation')).not.toBe(angle);
 await page.clock.runFor(10000);await expect(root(page)).toHaveAttribute('data-beat','4');
 await expect(root(page).locator('.conclusion-farewell')).toContainText('You’ll have a safe flight :)');
 await expect(root(page).locator('.conclusion-ending')).toHaveAttribute('aria-hidden','true');
 await page.clock.fastForward(60000);await expect(root(page)).toHaveAttribute('data-beat','4');
 await next(page).click();await expect(root(page)).toHaveAttribute('data-beat','Thanks');
 await page.clock.runFor(500);expect(Number(await root(page).getAttribute('data-progress'))).toBeGreaterThan(0);
 await expect(root(page).getByRole('button',{name:'Back to the beginning'})).toBeHidden();
 await page.clock.runFor(4100);await expect(root(page).getByRole('img',{name:'Thanks for watching'})).toBeVisible();
 await expect(root(page).getByRole('button',{name:'Back to the beginning'})).toBeVisible();
 await expect(root(page).locator('.cabin-exit-sign')).toHaveCount(0);
 await expect.poll(()=>root(page).locator('.conclusion-thanks canvas').evaluate(c=>c.width)).toBeGreaterThan(700);
 await expect(root(page).locator('.conclusion-farewell em')).toHaveText('back');
 await expect(page.locator('.presentation-footer')).toBeHidden();expect(errors).toEqual([]);
});

test('manual handwriting reveal pauses with Space, Back restores the farewell and the simple button restarts',async({page})=>{
 await frozen(page);await page.locator('#playback-toggle').click();
 for(let i=0;i<6;i++)await manualAdvance(page);
 await expect(root(page)).toHaveAttribute('data-beat','4');
 await next(page).click();await page.clock.runFor(400);
 await page.keyboard.press('Space');await page.keyboard.press('Space');
 const held=await root(page).getAttribute('data-progress');await page.clock.fastForward(5000);await expect(root(page)).toHaveAttribute('data-progress',held);
 await next(page).click();await expect(root(page).locator('.conclusion-restart')).toBeVisible();
 await page.keyboard.press('ArrowLeft');await expect(root(page)).toHaveAttribute('data-beat','4');
 await expect(next(page)).toBeVisible();await expect(root(page).locator('.conclusion-ending')).toHaveAttribute('aria-hidden','true');
 await manualAdvance(page);await root(page).getByRole('button',{name:'Back to the beginning'}).click();
 await expect(page.locator('#welcome')).toHaveClass(/present/);
 await expect(page.locator('#playback-toggle')).toHaveAttribute('aria-pressed','true');await expect(root(page)).toHaveAttribute('data-beat','0');
});

test('the italic three-word palette has distinct harmonious colors in both themes; narrow ending fits',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/#/conclusion');await expect(root(page)).toHaveAttribute('data-beat','4');
 const colors=()=>root(page).locator('.conclusion-fronts p').evaluateAll(nodes=>nodes.map(node=>({color:getComputedStyle(node).color,style:getComputedStyle(node).fontStyle})));
 const light=await colors();expect(new Set(light.map(s=>s.color)).size).toBe(3);expect(light.every(s=>s.style==='italic')).toBe(true);
 await page.locator('#theme-toggle').click();await expect(page.locator('html')).toHaveAttribute('data-bs-theme','dark');
 const dark=await colors();expect(new Set(dark.map(s=>s.color)).size).toBe(3);expect(dark.map(s=>s.color)).not.toEqual(light.map(s=>s.color));
 await next(page).click();await expect(root(page).getByRole('button',{name:'Back to the beginning'})).toBeVisible();
 const box=await root(page).locator('.conclusion-thanks canvas').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);
 await expect.poll(()=>page.locator('#conclusion .view').evaluate(v=>v.scrollWidth<=v.clientWidth)).toBe(true);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:/^Slide 7:/}).click();await expect(page.locator('.presentation-footer')).toBeVisible();
});

test('ambient globe suspends while hidden, inactive, or in the end card',async({page})=>{
 await frozen(page);const planet=root(page).locator('.conclusion-globe-stage');await page.clock.runFor(200);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 const hidden=await planet.getAttribute('data-globe-rotation');await page.clock.fastForward(5000);await expect(planet).toHaveAttribute('data-globe-rotation',hidden);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.clock.runFor(200);expect(await planet.getAttribute('data-globe-rotation')).not.toBe(hidden);
 await page.evaluate(()=>location.hash='/aircraft-design');const inactive=await planet.getAttribute('data-globe-rotation');await page.clock.fastForward(5000);await expect(planet).toHaveAttribute('data-globe-rotation',inactive);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:/^Slide 8:/}).click();const end=await planet.getAttribute('data-globe-rotation');await page.clock.fastForward(5000);await expect(planet).toHaveAttribute('data-globe-rotation',end);
});
