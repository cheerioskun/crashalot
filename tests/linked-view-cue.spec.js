import {test,expect} from '@playwright/test';

for(const [slide,label,sectionSelector,heading] of [
  ['flight-phase','Explore causes below','.area-section','#flight-causes-title'],
  ['aircraft-design','Explore aircraft models below','.comparison-model-grid','.model-packing-head h2'],
]) {
  test(`${slide}: CTA tracks the linked view's 50% visibility threshold`,async({page})=>{
    await page.setViewportSize({width:1440,height:720});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(`/#/${slide}`);
    const view=page.locator(`#${slide} .view`),section=page.locator(`#${slide} ${sectionSelector}`);
    const cue=page.getByRole('button',{name:label,exact:true});
    await expect(cue).toBeVisible();
    expect(await cue.locator('.linked-view-cue-arrow').evaluate(n=>getComputedStyle(n).animationName)).toBe('none');
    for(const fraction of [.49,.51,.25,.75,.25]) {
      const viewport=await view.boundingBox(),bounds=await section.boundingBox();
      const top=await view.evaluate(n=>n.scrollTop)+bounds.y-viewport.y;
      await view.evaluate((n,scrollTop)=>n.scrollTo({top:scrollTop,behavior:'instant'}),top-viewport.height+bounds.height*fraction);
      if(fraction<=.5)await expect(cue).toBeVisible();else await expect(cue).toBeHidden();
    }
    await cue.click();await expect(page.locator(heading)).toBeFocused();await expect(cue).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${slide}$`));
    expect(await section.evaluate(n=>n.style.getPropertyValue('--linked-view-gap'))).toBe('');
  });

  test(`${slide}: mobile CTA reaches the linked view and stays out of overview`,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(`/#/${slide}`);
    const cue=page.getByRole('button',{name:label,exact:true});
    await expect(cue).toBeVisible();await cue.click();
    await expect(page.locator(heading)).toBeFocused();await expect(cue).toBeHidden();
    await page.locator(`#${slide} .view`).evaluate(n=>n.scrollTo({top:0,behavior:'instant'}));
    await expect(cue).toBeVisible();await cue.focus();await page.keyboard.press('Escape');await expect(cue).toBeHidden();
  });
}

test('CTA is unavailable during setup and bounces only twice when the linked view is ready',async({page})=>{
  await page.setViewportSize({width:1440,height:720});
  await page.goto('/#/flight-phase');
  const cue=page.locator('#flight-phase .linked-view-cue');await expect(cue).toBeHidden();
  await page.locator('[data-flight-show-all]').click();
  await page.locator('#flight-phase .view').evaluate(n=>n.scrollTo({top:0,behavior:'instant'}));
  await expect(cue).toBeVisible();
  expect(await cue.locator('.linked-view-cue-arrow').evaluate(n=>n.getAnimations()[0].effect.getTiming().iterations)).toBe(2);
  await page.locator('[data-story-next]').click();await expect(cue).toBeHidden();
});
