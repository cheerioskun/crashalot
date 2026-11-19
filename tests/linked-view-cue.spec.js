import {test,expect} from '@playwright/test';

for(const [slide,label,target] of [
  ['flight-phase','Explore causes below','#flight-causes-title'],
  ['aircraft-design','Explore aircraft models below','.model-packing-head h2'],
]) {
  test(`${slide}: desktop keeps the linked view below the fold at different window heights`,async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(`/#/${slide}`);
    const view=page.locator(`#${slide} .view`),section=page.locator(`#${slide} .linked-view-section`);
    const cue=page.getByRole('button',{name:label,exact:true});
    for(const height of [720,1000]) {
      await page.setViewportSize({width:1440,height});
      await view.evaluate(n=>n.scrollTo({top:0,behavior:'instant'}));
      await expect(cue).toBeVisible();
      await expect.poll(async()=>{
        const upper=await view.boundingBox(),lower=await section.boundingBox();
        return lower.y-(upper.y+upper.height);
      }).toBeGreaterThanOrEqual(24);
    }
    await cue.click();await expect(page.locator(target)).toBeFocused();
    await expect(cue).toBeHidden();
    const heading=await page.locator(target).boundingBox(),viewport=await view.boundingBox();
    expect(heading.y).toBeGreaterThanOrEqual(viewport.y);
    expect(heading.y+heading.height).toBeLessThan(viewport.y+viewport.height);
  });

  test(`${slide}: cue reveals the linked view, supports keyboard focus and respects reduced motion`,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(`/#/${slide}`);
    const view=page.locator(`#${slide} .view`),cue=page.getByRole('button',{name:label,exact:true});
    await expect(cue).toBeVisible();
    expect(await cue.locator('.linked-view-cue-arrow').evaluate(n=>getComputedStyle(n).animationName)).toBe('none');
    const bounds=await cue.boundingBox(),footer=await page.locator('.presentation-footer').boundingBox();
    expect(bounds.y+bounds.height).toBeLessThan(footer.y);
    await cue.focus();await page.keyboard.press('Enter');
    await expect(page.locator(target)).toBeFocused();
    await expect(cue).toBeHidden();
    expect(await view.evaluate(n=>n.scrollTop)).toBeGreaterThan(0);
    await expect(page).toHaveURL(new RegExp(`${slide}$`));
    await view.evaluate(n=>n.scrollTo({top:0,behavior:'instant'}));
    await expect(cue).toBeVisible();
    await cue.focus();await page.keyboard.press('Escape');await expect(cue).toBeHidden();
  });
}

test('the invitation bounces elastically twice, then rests; the intro offers no unavailable view',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/#/flight-phase');
  const cue=page.locator('#flight-phase .linked-view-cue');
  await expect(cue).toBeHidden();
  await page.locator('[data-flight-show-all]').click();
  await page.locator('#flight-phase .view').evaluate(n=>n.scrollTo({top:0,behavior:'instant'}));
  await expect(cue).toBeVisible();
  const animation=await cue.locator('.linked-view-cue-arrow').evaluate(n=>{
    const a=n.getAnimations().find(a=>a.animationName==='linked-view-bounce');
    return {timing:a.effect.getTiming(),frames:a.effect.getKeyframes().map(f=>f.transform)};
  });
  expect(animation.timing.iterations).toBe(2);
  expect(animation.frames).toContain('translateY(7px)');
  expect(animation.frames).toContain('translateY(-3px)');
  await page.locator('[data-story-next]').click();await expect(cue).toBeHidden();
});
