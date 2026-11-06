import { test, expect } from '@playwright/test';
const next = page => page.locator('[data-story-next]');
async function expectStableNext(page, initial) {
  await expect(next(page)).toHaveAccessibleName('Next');
  await expect(next(page)).toHaveText(/^Next\s*→$/);
  const current = await next(page).boundingBox();
  for (const key of ['x', 'y', 'width', 'height']) expect(current[key]).toBe(initial[key]);
}
async function scale(page) {
  await page.goto('/#/flight-types');
  await page.locator('#playback-toggle').click(); // Manual sequencing for these transport checks.
  await page.evaluate(() => { location.hash = '/change-over-time'; });
  await expect(page.locator('.scale-comparison')).toBeVisible();
  await expect(next(page)).toBeEnabled();
}
const scaleValues = page => page.locator('.scale-comparison__value').evaluateAll(nodes => nodes.map(n => Number(n.dataset.value)));

test('Next stays fixed while settling running and paused scale beats; routes preserve state; Replay resets', async ({ page, request }) => {
  await scale(page);
  const nextBounds = await next(page).boundingBox();
  const rows = (await (await request.get('/data/scheduled-service.json')).json()).rows;
  await next(page).click();
  await expectStableNext(page, nextBounds);
  await page.locator('.scale-comparison__transport button', { hasText: 'Pause' }).click();
  await expectStableNext(page, nextBounds);
  await next(page).click();
  expect(await scaleValues(page)).toEqual([rows[0].fatalAccidents, 0]);
  await expectStableNext(page, nextBounds);
  await next(page).click(); // perspective text
  await expectStableNext(page, nextBounds);
  await next(page).click(); // departure count
  await next(page).click(); // settle departures
  expect(await scaleValues(page)).toEqual([rows[0].fatalAccidents, rows[0].departures]);
  for (let beat=4; beat<=8; beat++) { await next(page).click();await expectStableNext(page,nextBounds); }
  await next(page).click(); // settle remaining years on the closing question
  const totals = rows.reduce((a, r) => [a[0] + r.fatalAccidents, a[1] + r.departures], [0, 0]);
  expect(await scaleValues(page)).toEqual(totals);
  await next(page).click();
  await expect(page).toHaveURL(/counts-in-context$/);
  await next(page).click(); // Finish the first decade reveal.
  await page.locator('[data-story-back]').click(); // Rewind that reveal.
  await page.locator('[data-story-back]').click(); // Return to the scale.
  await expect(page).toHaveURL(/change-over-time$/);
  expect(await scaleValues(page)).toEqual(totals);
  await page.evaluate(() => { location.hash = '/flight-phase'; });
  await expect(page.locator('#flight-phase')).toHaveClass(/present/);
  await page.evaluate(() => { location.hash = '/change-over-time'; });
  await expect(page.locator('#change-over-time')).toHaveClass(/present/);
  expect(await scaleValues(page)).toEqual(totals);
  await page.locator('.scale-comparison__transport button', { hasText: 'Replay' }).click();
  expect(await scaleValues(page)).toEqual([0, 0]);
  await expect(page.locator('[data-story-position]')).toHaveText('3 of 8 · Reveal 1 of 9');
});

test('reading keys scroll the exploration without advancing; explicit footer still navigates', async ({ page }) => {
  await page.goto('/#/flight-phase');
  await page.locator('[data-flight-show-all]').click();
  await page.locator('.jump-to-causes').click();
  await expect(page.locator('#flight-causes-title')).toBeFocused();
  const view = page.locator('#flight-phase .view');
  await view.evaluate(el => el.scrollTop = 0);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => view.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  for (const key of ['ArrowUp', 'PageDown', 'PageUp']) {
    await page.keyboard.press(key);
    await expect(page).toHaveURL(/flight-phase$/);
  }
  await next(page).click();
  await expect(page.locator('.flight-phase-bridge')).toBeVisible();
  await next(page).click();
  await expect(page).toHaveURL(/flight-types$/);
});

test('all decades fit mobile and retain readable labels, including the partial period', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/counts-in-context');
  await expect(page.locator('.decade-trend--narrow')).toBeVisible();
  await expect(page.locator('.decade-trend')).toHaveAttribute('data-playback', 'complete');
  const plot = page.locator('.decade-trend__plot');
  expect(await plot.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  const svg = await plot.locator('svg').boundingBox();
  for (const tick of await plot.locator('.decade-trend__tick').all()) {
    const box = await tick.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(svg.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(svg.x + svg.width + 1);
  }
  await expect(plot.locator('.decade-trend__partial')).toBeVisible();
  if (process.env.FLIGHT_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.FLIGHT_SCREENSHOT_DIR}/transport-mobile-decades.png` });
});
