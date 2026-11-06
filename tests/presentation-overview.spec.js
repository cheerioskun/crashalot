import {test,expect} from '@playwright/test';
const overview=p=>p.locator('.reveal.overview');
const card=(p,n)=>p.getByRole('button',{name:new RegExp(`^Slide ${n}:`)});

test('Escape shows eight clickable previews and every selected chapter opens at its final beat',async({page})=>{
 test.setTimeout(45000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/#/aircraft-design');await page.locator('.comparison-aircraft').waitFor({state:'attached'});
 const choices=[[4,'.decade-trend','6'],[3,'.scale-comparison','6'],[5,'.flight-exploration','5.5'],[6,'.comparison-types','3'],[7,'.comparison-aircraft','3.5'],[8,'.conclusion-scene','Exit']];
 for(const [number,selector,beat]of choices){
  await page.keyboard.press('Escape');await expect(overview(page)).toBeVisible();
  await expect(page.getByRole('button',{name:/^Slide \d+:/})).toHaveCount(8);
  for(let n=1;n<=8;n++)await expect(card(page,n)).toBeVisible();
  await card(page,number).click();await expect(overview(page)).toHaveCount(0);
  await expect(page.locator(selector)).toHaveAttribute(number===5?'data-story-beat':'data-beat',beat);
  await expect(page.locator('.slides>section.present .view')).not.toHaveAttribute('inert','');
 }
 await page.keyboard.press('Escape');await card(page,2).click();
 await expect(page.locator('#flight-1282')).toHaveAttribute('data-hook-step','9');
 await expect(page.locator('#flight-1282')).not.toHaveAttribute('data-hook-static','true');
 await page.keyboard.press('Escape');await card(page,1).click();await expect(page.locator('#welcome')).toHaveClass(/present/);
 expect(errors).toEqual([]);
});

test('overview pauses active reveals; Escape closes without completing and keyboard cards open final beats',async({page})=>{
 await page.clock.install({time:new Date('2026-11-06T12:00:00Z')});
 await page.goto('/#/welcome');await page.locator('.comparison-aircraft').waitFor({state:'attached'});
 await page.clock.pauseAt(new Date('2026-11-06T12:01:00Z'));
 await page.evaluate(()=>location.hash='/aircraft-design');await page.locator('[data-story-next]').click();
 const root=page.locator('.comparison-aircraft');await expect(root).toHaveAttribute('data-beat','1');
 await page.keyboard.press('Escape');await expect(overview(page)).toBeVisible();
 await page.clock.runFor(20000);await expect(root).toHaveAttribute('data-beat','1');
 await page.keyboard.press('Escape');await expect(overview(page)).toHaveCount(0);await expect(root).toHaveAttribute('data-beat','1');
 await page.keyboard.press('Escape');await card(page,6).focus();await page.keyboard.press('ArrowRight');await expect(card(page,7)).toBeFocused();
 await page.keyboard.press('Enter');await expect(overview(page)).toHaveCount(0);await expect(root).toHaveAttribute('data-beat','3.5');
 await expect(page.locator('[data-story-next]')).toBeEnabled();
});

test('mobile overview scrolls to every card and restores the selected full-size chapter',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/#/aircraft-design');await page.locator('.comparison-aircraft').waitFor({state:'attached'});
 await page.keyboard.press('Escape');
 const first=await card(page,1).boundingBox(),second=await card(page,2).boundingBox();
 expect(second.y).toBeGreaterThanOrEqual(first.y+first.height+12);
 expect(await card(page,1).evaluate(n=>getComputedStyle(n,'::after').display)).toBe('block');
 await card(page,7).scrollIntoViewIfNeeded();await card(page,7).click();
 await expect(overview(page)).toHaveCount(0);await expect(page.locator('.comparison-aircraft')).toHaveAttribute('data-beat','3.5');
 await expect.poll(()=>page.locator('#aircraft-design .view').evaluate(v=>v.scrollWidth<=v.clientWidth)).toBe(true);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Close overview',exact:true}).click();
 await expect(overview(page)).toHaveCount(0);await expect(page.locator('#aircraft-design')).toHaveClass(/present/);
});


test('Escape from an aircraft control opens the overview and reaches the conclusion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#/aircraft-design');
 await page.locator('#aircraft-design .comparison-source summary').focus();await page.keyboard.press('Escape');
 await expect(overview(page)).toBeVisible();await card(page,8).click();
 await expect(page.locator('.conclusion-scene')).toHaveAttribute('data-beat','Exit');
 await expect(page.getByRole('button',{name:'Back to the beginning'})).toBeVisible();
});
