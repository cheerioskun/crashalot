import {test,expect} from '@playwright/test';
const footer=p=>p.locator('.presentation-footer'),wick=p=>p.locator('.beat-wick');
async function frozen(page,id='conclusion'){
 await page.clock.install({time:new Date('2026-11-06T12:00:00Z')});await page.goto('/#/welcome');await page.locator('.comparison-aircraft').waitFor({state:'attached'});
 await page.clock.pauseAt(new Date('2026-11-06T12:01:00Z'));await page.evaluate(id=>location.hash='/'+id,id);await page.clock.runFor(32);
}
const fraction=p=>wick(p).evaluate(node=>Number(node.style.getPropertyValue('--beat-progress')));

test('footer wick counts the real hold, freezes on pause and resets with the next beat',async({page})=>{
 await frozen(page);const button=page.locator('[data-story-next]'),geometry=await button.boundingBox();
 await expect(footer(page)).toHaveAttribute('data-timing-state','countdown');await expect(page.locator('.beat-timer-label')).toHaveText('Next in 1.8s');
 await page.clock.runFor(850);const partial=await fraction(page);expect(partial).toBeGreaterThan(.45);expect(partial).toBeLessThan(.52);
 await page.keyboard.press('Space');await page.clock.runFor(32);await expect(footer(page)).toHaveAttribute('data-timing-state','paused');
 const held=await fraction(page);await page.clock.fastForward(5000);expect(await fraction(page)).toBe(held);
 await page.keyboard.press('Space');await page.clock.runFor(1700);await expect(page.locator('.conclusion-scene')).toHaveAttribute('data-beat','0');
 await page.clock.runFor(150);await expect(page.locator('.conclusion-scene')).toHaveAttribute('data-beat','1');
 expect(await fraction(page)).toBeLessThan(.1);expect(await button.boundingBox()).toEqual(geometry);
});

test('wick includes source animation time plus its reading hold; manual boundaries require Next',async({page})=>{
 await frozen(page,'change-over-time');await page.locator('#playback-toggle').click();
 const next=page.locator('[data-story-next]');for(let i=0;i<4;i++)await next.click(); // Departures start.
 await page.locator('#playback-toggle').click();await page.clock.runFor(32);
 await expect(page.locator('.scale-comparison')).toHaveAttribute('data-beat','2.5');
 await expect(page.locator('.beat-timer-label')).toHaveText('Next in 7.7s');
 await page.clock.runFor(1000);await expect(page.locator('.beat-timer-label')).toHaveText('Next in 6.7s');
 await page.locator('.scale-comparison__transport').getByRole('button',{name:'Pause',exact:true}).click();await page.clock.runFor(32);
 await expect(footer(page)).toHaveAttribute('data-timing-state','paused');const paused=await fraction(page);await page.clock.fastForward(3000);expect(await fraction(page)).toBe(paused);
 await page.locator('[data-story-back]').click();await page.clock.runFor(32);await expect(page.locator('.beat-timer-label')).toHaveText('Next when ready →');
});

test('explicit-Next boundary has a settled wick and no fake timer, including reduced motion',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#/conclusion');
 await expect(page.locator('.conclusion-scene')).toHaveAttribute('data-beat','4');await expect(footer(page)).toHaveAttribute('data-timing-state','next');
 await expect(page.locator('.beat-timer-label')).toHaveText('Next when ready →');await expect(wick(page)).toHaveAttribute('aria-valuenow','100');
 const bounds=await footer(page).boundingBox(),position=await page.locator('[data-story-position]').boundingBox(),label=await page.locator('.beat-timer-label').boundingBox();
 expect(position.height).toBeLessThanOrEqual(18);expect(label.y+label.height).toBeLessThan(bounds.y+bounds.height);
 await page.keyboard.press('Escape');await expect(wick(page)).toBeHidden();
 await page.getByRole('button',{name:/^Slide 1:/}).click();await expect(page.locator('.beat-timer-label')).toHaveText('Next to begin');
});
