import {test,expect} from '@playwright/test';
const footer=p=>p.locator('.presentation-footer'),wick=p=>p.locator('.beat-wick');
async function frozen(page,id='conclusion'){
 await page.clock.install({time:new Date('2026-11-06T12:00:00Z')});await page.goto('/#/welcome');await page.locator('.comparison-aircraft').waitFor({state:'attached'});
 await page.clock.pauseAt(new Date('2026-11-06T12:01:00Z'));await page.evaluate(id=>location.hash='/'+id,id);await page.clock.runFor(32);
}
const fraction=p=>wick(p).evaluate(node=>Number(node.style.getPropertyValue('--beat-progress')));

test('one translucent wick spans the slide and resumes without resetting at beat boundaries',async({page})=>{
 await frozen(page);const button=page.locator('[data-story-next]'),geometry=await button.boundingBox();
 await expect(footer(page)).toHaveAttribute('data-timing-state','countdown');await expect(page.locator('.beat-timer-label')).toHaveText('Slide · 16.3s left');
 expect(await wick(page).evaluate(n=>Number(getComputedStyle(n).opacity))).toBeLessThan(.6);
 await page.clock.runFor(850);const partial=await fraction(page);expect(partial).toBeGreaterThan(.04);expect(partial).toBeLessThan(.07);
 await page.keyboard.press('Space');await page.clock.runFor(32);await expect(footer(page)).toHaveAttribute('data-timing-state','paused');
 const held=await fraction(page);await page.clock.fastForward(5000);expect(await fraction(page)).toBe(held);
 await page.keyboard.press('Space');await page.clock.runFor(850);await expect(page.locator('.conclusion-scene')).toHaveAttribute('data-beat','0');
 await page.clock.runFor(200);await expect(page.locator('.conclusion-scene')).toHaveAttribute('data-beat','1');
 expect(await fraction(page)).toBeGreaterThan(.1);expect(await button.boundingBox()).toEqual(geometry);
 await page.clock.runFor(6000);expect(await fraction(page)).toBeGreaterThan(.45);
 await page.clock.runFor(5000);await expect(wick(page)).toHaveAttribute('aria-valuenow','72');
 await expect(page.locator('.beat-timer-label')).toHaveText('Next when ready →');
});

test('the slide timeline includes later reveals and holds while pause freezes the same position',async({page})=>{
 await frozen(page,'change-over-time');await page.locator('#playback-toggle').click();
 const next=page.locator('[data-story-next]');for(let i=0;i<4;i++)await next.click();
 await page.locator('#playback-toggle').click();await page.clock.runFor(32);
 await expect(page.locator('.scale-comparison')).toHaveAttribute('data-beat','2.5');
 const seconds=async()=>Number((await page.locator('.beat-timer-label').textContent()).match(/([\d.]+)s/)[1]);
 const before=await seconds();expect(before).toBeGreaterThan(15);const position=await fraction(page);
 await page.clock.runFor(1000);expect(await seconds()).toBeCloseTo(before-1,0);expect(await fraction(page)).toBeGreaterThan(position);
 await page.locator('.scale-comparison__transport').getByRole('button',{name:'Pause',exact:true}).click();await page.clock.runFor(32);
 await expect(footer(page)).toHaveAttribute('data-timing-state','paused');const paused=await fraction(page);await page.clock.fastForward(3000);expect(await fraction(page)).toBe(paused);
 await page.locator('[data-story-back]').click();await page.clock.runFor(32);await expect(page.locator('.beat-timer-label')).toHaveText('Next when ready →');
 expect(await fraction(page)).toBeLessThan(paused);
});

test('explicit-Next boundary settles the slide wick, including reduced motion and overview',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#/conclusion');
 await expect(page.locator('.conclusion-scene')).toHaveAttribute('data-beat','4');await expect(footer(page)).toHaveAttribute('data-timing-state','next');
 await expect(page.locator('.beat-timer-label')).toHaveText('Next when ready →');await expect(wick(page)).toHaveAttribute('aria-valuenow','72');
 const bounds=await footer(page).boundingBox(),position=await page.locator('[data-story-position]').boundingBox(),label=await page.locator('.beat-timer-label').boundingBox();
 expect(position.height).toBeLessThanOrEqual(18);expect(label.y+label.height).toBeLessThan(bounds.y+bounds.height);
 await page.keyboard.press('Escape');await expect(wick(page)).toBeHidden();
 await page.getByRole('button',{name:/^Slide 1:/}).click();await expect(page.locator('.beat-timer-label')).toHaveText('Next to begin');
});
