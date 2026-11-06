import { test, expect } from '@playwright/test';

const next = page => page.locator('[data-story-next]');
async function frozen(page, id) {
  await page.clock.install({ time:new Date('2026-11-05T12:00:00Z') });
  await page.goto('/#/welcome');
  await page.locator('.decade-trend').waitFor({ state:'attached' });
  await page.clock.pauseAt(new Date('2026-11-05T12:01:00Z'));
  await page.evaluate(id => { location.hash = `/${id}`; }, id);
  await expect(page.locator(`#${id}`)).toHaveClass(/present/);
}

test('Space toggles Auto and its seatbelt light without skipping a beat or repeating while held', async ({page}) => {
  await frozen(page,'aircraft-design');
  const root=page.locator('.comparison-aircraft'),toggle=page.locator('#playback-toggle');
  await expect(root).toHaveAttribute('data-beat','0');
  await expect(toggle).toHaveAttribute('aria-keyshortcuts','Space');
  await page.clock.runFor(2600);await expect(root).toHaveAttribute('data-beat','2');
  // A focused reading heading still permits the global shortcut.
  await page.locator('#aircraft-design h1').evaluate(n=>{n.tabIndex=-1;n.focus();});
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed','false');
  await expect(toggle.locator('svg')).toHaveCSS('filter','none');
  const progress=await root.getAttribute('data-data-progress');
  await page.clock.runFor(5000);await expect(root).toHaveAttribute('data-data-progress',progress);
  await expect(root).toHaveAttribute('data-beat','2');
  await page.keyboard.down('Space');await page.keyboard.down('Space');await page.keyboard.up('Space');
  await expect(toggle).toHaveAttribute('aria-pressed','true');
  await expect(toggle).toHaveAttribute('title',/Auto reveals on/);
  await expect.poll(()=>toggle.locator('svg').evaluate(n=>getComputedStyle(n).filter)).not.toBe('none');
  await page.clock.runFor(200);expect(await root.getAttribute('data-data-progress')).not.toBe(progress);
  // Space on a focused button activates that button rather than the global shortcut.
  await root.locator('[data-comparison-pause]').focus();await page.keyboard.press('Space');
  await expect(root).toHaveAttribute('data-playback','paused');await expect(toggle).toHaveAttribute('aria-pressed','true');
  await expect(page).toHaveURL(/aircraft-design$/);
});

test('Back turns off Auto across every chapter and backward slide navigation keeps the light off', async ({page}) => {
  await frozen(page,'welcome');
  const toggle=page.locator('#playback-toggle'),back=page.locator('[data-story-back]');
  const ids=['flight-1282','change-over-time','counts-in-context','flight-phase','flight-types','aircraft-design'];
  for(const [index,id] of ids.entries()) {
    await page.evaluate(id=>location.hash=`/${id}`,id);
    await expect(page.locator('[data-story-position]')).not.toContainText('Loading');
    if(await toggle.getAttribute('aria-pressed')==='false')await toggle.click();
    await next(page).click();
    if(index%2===0)await back.click();
    else {
      await page.locator(`#${id} h1`).evaluate(n=>{n.tabIndex=-1;n.focus();});
      await page.keyboard.press(index===5?'p':'ArrowLeft');
    }
    await expect(toggle).toHaveAttribute('aria-pressed','false');
    await expect(toggle.locator('svg')).toHaveCSS('filter','none');
    await expect(page.locator('[data-story-position]')).toContainText('Reveal 1 of');
    if(index===0) {
      await expect(back).toBeFocused();
      await page.keyboard.press('Space');await expect(toggle).toHaveAttribute('aria-pressed','true');
      await page.keyboard.press('Space');await expect(toggle).toHaveAttribute('aria-pressed','false');
      await expect(page.locator('[data-story-position]')).toContainText('Reveal 1 of');
    }
    const position=await page.locator('[data-story-position]').textContent();
    await page.clock.runFor(10000);await expect(page.locator('[data-story-position]')).toHaveText(position);
  }
  await toggle.click();await back.click();
  await expect(page).toHaveURL(/flight-types$/);await expect(toggle).toHaveAttribute('aria-pressed','false');
  await page.evaluate(()=>location.hash='/aircraft-design');await toggle.click();
  await page.goBack();await expect(page).toHaveURL(/flight-types$/);
  await expect(toggle).toHaveAttribute('aria-pressed','false');
});

// Actual animation frames run under a controlled clock; timers are not stubbed out.
test('Auto defaults on, uses brief comparison holds and completes the scale without changing slides', async ({ page, request }) => {
  await frozen(page, 'change-over-time');
  const root = page.locator('.scale-comparison');
  await expect(page.locator('#playback-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(root).toHaveAttribute('data-playback', 'waiting');
  await expect(root).toHaveAttribute('data-beat', '0');
  const bounds = await next(page).boundingBox();
  await page.clock.runFor(850);
  await expect(root).toHaveAttribute('data-phase', 'accidents');
  await next(page).click();
  await expect(root).toHaveAttribute('data-playback', 'waiting');
  await page.clock.runFor(250);
  await expect(root).toHaveAttribute('data-playback', 'waiting');
  await page.clock.runFor(100);
  await expect(root).toHaveAttribute('data-beat', '2');
  await page.clock.runFor(1100);
  await expect(root).toHaveAttribute('data-phase', 'departures');
  await next(page).click();
  await page.clock.runFor(650);
  await expect(root).toHaveAttribute('data-beat', '3');
  await page.clock.runFor(1500);
  await expect(root).toHaveAttribute('data-phase', 'expanding');
  await page.clock.runFor(12500);
  await expect(root).toHaveAttribute('data-playback', 'complete');
  const rows = (await (await request.get('/data/scheduled-service.json')).json()).rows;
  const totals = rows.reduce((a,r) => [a[0]+r.fatalAccidents,a[1]+r.departures], [0,0]);
  expect(await root.locator('.scale-comparison__value').evaluateAll(nodes => nodes.map(n => Number(n.dataset.value)))).toEqual(totals);
  await page.clock.fastForward(60000);
  await expect(page).toHaveURL(/change-over-time$/);
  await expect(root).toHaveAttribute('data-beat', '5');
  await expect(page.locator('.scale-comparison__question')).toBeHidden();
  expect(await next(page).boundingBox()).toEqual(bounds);
  await expect(next(page)).toHaveAccessibleName('Next');
  await next(page).click();
  await expect(root).toHaveAttribute('data-beat', '6');
  await expect(page.locator('.scale-comparison__question')).toBeVisible();
  await next(page).click();
  await expect(page).toHaveURL(/counts-in-context$/);
});

test('decades run naturally through the line morph, then wait indefinitely for Next', async ({ page }) => {
  await frozen(page, 'counts-in-context');
  const root = page.locator('.decade-trend');
  await page.clock.runFor(25000);
  await expect(root).toHaveAttribute('data-playback', 'complete');
  await expect(root).toHaveAttribute('data-progress', '11');
  await expect(root.locator('.decade-trend__partial-line')).toHaveAttribute('opacity', '1');
  await expect(root.locator('.decade-trend__partial-point')).toHaveAttribute('opacity', '1');
  await page.clock.fastForward(60000);
  await expect(page).toHaveURL(/counts-in-context$/);
  await expect(root).toHaveAttribute('data-beat','5.5');
  await next(page).click();
  await expect(root).toHaveAttribute('data-beat','6');
  await expect(root.locator('h2')).toHaveText('What factors affect these numbers?');
  await expect(root.locator('.decade-trend__fatal-line')).toHaveAttribute('stroke-dashoffset','0');
  await page.clock.fastForward(60000);
  await expect(page).toHaveURL(/counts-in-context$/);
  await next(page).click();
  await expect(page).toHaveURL(/flight-phase$/);
});

test('Pause, manual mode, Back and Replay retain control over automatic reveals', async ({ page }) => {
  await frozen(page, 'counts-in-context');
  const root = page.locator('.decade-trend');
  await page.clock.runFor(3000);
  await expect(root).toHaveAttribute('data-beat','1.5');
  await root.getByRole('button',{name:'Pause',exact:true}).click();
  const progress=await root.getAttribute('data-progress');
  await page.clock.runFor(5000);await expect(root).toHaveAttribute('data-progress',progress);
  await root.getByRole('button',{name:'Resume',exact:true}).click();
  await page.clock.runFor(300);expect(await root.getAttribute('data-progress')).not.toBe(progress);
  await next(page).click();
  await expect(root).toHaveAttribute('data-playback','waiting');
  await page.locator('#playback-toggle').click();
  await page.clock.runFor(5000);await expect(root).toHaveAttribute('data-beat','1.5');
  await expect(root).toHaveAttribute('data-progress','3');
  await next(page).click();await expect(root).toHaveAttribute('data-beat','2');
  await page.locator('[data-story-back]').click();
  await page.clock.runFor(5000);await expect(root).toHaveAttribute('data-beat','1.5');
  await page.locator('#playback-toggle').click();
  await page.clock.runFor(300);await expect(root).toHaveAttribute('data-beat','2');
  await root.getByRole('button',{name:'Replay',exact:true}).click();
  await expect(root).toHaveAttribute('data-beat','0');
  await expect(root).toHaveAttribute('data-playback','waiting');
});

test('leaving a slide or hiding a tab suspends decade motion and its pending cues', async ({ page }) => {
  await frozen(page,'counts-in-context');
  const root=page.locator('.decade-trend');
  await page.clock.runFor(3000);
  await page.evaluate(()=>{location.hash='/flight-types';});
  await expect(page.locator('#flight-types')).toHaveClass(/present/);
  const away=await root.getAttribute('data-progress');
  await page.clock.runFor(10000);await expect(root).toHaveAttribute('data-progress',away);
  await page.evaluate(()=>{location.hash='/counts-in-context';});
  await expect(page.locator('#playback-toggle')).toHaveAttribute('aria-pressed','false');
  await page.locator('#playback-toggle').click();
  await expect(root).toHaveAttribute('data-playback','running');
  const visibility=hidden=>page.evaluate(hidden=>{
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden});
    document.dispatchEvent(new Event('visibilitychange'));
  },hidden);
  await visibility(true);
  const held=await root.getAttribute('data-progress');
  await page.clock.runFor(5000);await expect(root).toHaveAttribute('data-progress',held);
  await visibility(false);await page.clock.runFor(200);
  expect(await root.getAttribute('data-progress')).not.toBe(held);
  await next(page).click();await expect(root).toHaveAttribute('data-playback','waiting');
  await visibility(true);await page.clock.runFor(5000);
  await expect(root).toHaveAttribute('data-beat','1.5');
  await visibility(false);await page.clock.runFor(300);
  await expect(root).toHaveAttribute('data-beat','2');
});

test('opening Auto reveals only fragments, and Back holds the reader’s chosen fragment', async ({ page }) => {
  await frozen(page, 'welcome');
  await expect(page.locator('#playback-toggle')).toBeVisible();
  await expect(page.locator('#theme-toggle')).toBeVisible();
  await page.clock.runFor(10000);
  await expect(page.locator('#welcome')).toHaveClass(/present/);
  await next(page).click();
  const hook = page.locator('#flight-1282');
  await page.clock.runFor(16000);
  await expect(hook).toHaveAttribute('data-hook-step', '7');
  await page.clock.runFor(6000);
  await expect(hook).toHaveAttribute('data-hook-step', '9');
  await page.clock.fastForward(60000);
  await expect(page).toHaveURL(/flight-1282(?:\/\d+)?$/);
  await page.locator('[data-story-back]').click();
  await page.clock.runFor(10000);
  await expect(hook).toHaveAttribute('data-hook-step', '8');
  await next(page).click();
  await expect(hook).toHaveAttribute('data-hook-step', '9');
  await next(page).click();
  // Reveal debounces fragment URLs; the active slide is the navigation outcome.
  await expect(page.locator('#change-over-time')).toHaveClass(/present/);
});

test('reduced motion shows a complete static view and never changes slides', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.goto('/#/counts-in-context');
  await expect(page.locator('.decade-trend')).toHaveAttribute('data-playback', 'complete');
  await expect(page).toHaveURL(/counts-in-context$/);
  await page.goto('/#/change-over-time');
  await page.locator('#playback-toggle').click();
  await expect(page.locator('.scale-comparison')).toHaveAttribute('data-playback', 'complete');
  await expect(page.locator('.scale-comparison')).toHaveAttribute('data-beat', '5');
  await expect(page.locator('.scale-comparison')).toHaveAttribute('data-heads', '24');
  await expect(page.locator('.scale-comparison__question')).toBeHidden();
  await next(page).click();
  await expect(page.locator('.scale-comparison__question')).toBeVisible();
  await expect(page).toHaveURL(/change-over-time$/);
  await page.goto('/#/flight-1282');
  await page.locator('#playback-toggle').click();
  await expect(page.locator('#flight-1282')).toHaveAttribute('data-hook-step', '9');
  await expect(page).toHaveURL(/flight-1282(?:\/\d+)?$/);
});

test('cover controls work before starting and keep their geometry across all four states', async ({ page }) => {
  await frozen(page, 'welcome');
  const auto = page.getByRole('button', { name:'Auto reveals', exact:true });
  const light = page.getByRole('button', { name:'Cabin light', exact:true });
  await expect(light).toBeEnabled();
  await expect(light).toBeVisible();
  await expect(auto).toBeVisible();
  const icons = await page.locator('.utility-icon').evaluateAll(nodes => nodes.map(el => el.outerHTML));
  const bounds = await page.locator('.presentation-utilities').boundingBox();
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await light.click();
  await expect(light).toHaveAttribute('aria-pressed', 'false');
  await auto.click();
  await expect(auto).toHaveAttribute('aria-pressed', 'false');
  await light.click();
  await expect(light).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('.utility-icon').evaluateAll(nodes => nodes.map(el => el.outerHTML))).toEqual(icons);
  expect(await page.locator('.presentation-utilities').boundingBox()).toEqual(bounds);
  await next(page).click();
  await page.clock.runFor(16000);
  await expect(page.locator('#flight-1282')).toHaveAttribute('data-hook-step', '0');
  await auto.click();
  await page.clock.runFor(23000);
  await expect(page.locator('#flight-1282')).toHaveAttribute('data-hook-step', '9');
  await expect(page.locator('#flight-1282')).toHaveClass(/present/);
});
