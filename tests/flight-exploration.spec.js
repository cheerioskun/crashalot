import { test, expect } from "@playwright/test";
const screenshotDir = process.env.FLIGHT_SCREENSHOT_DIR;
async function chapter(page) {
  await page.goto("/#/flight-phase");
  await expect(page.locator("#flight-phase")).toHaveClass(/present/);
  await page.locator('[data-flight-show-all]').waitFor();
  if (await page.locator('[data-flight-show-all]').isEnabled()) await page.locator('[data-flight-show-all]').click();
  await expect(page.locator('[data-testid="area.technical"]')).toBeAttached();
}
const state = (page) =>
  page
    .locator(".flight-exploration")
    .evaluate((root) => ({ selection: root.selection, area: root.areaData }));

test("phase, cause and exact period link by source IDs; measure preserves selection", async ({
  page,
  request,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const source = await (
    await request.get("/data/flight-exploration.json")
  ).json();
  await chapter(page);
  let s = await state(page);
  expect(s.selection.recordIds).toHaveLength(2792);
  expect(s.area.bins).toHaveLength(11);
  expect(s.area.series.map((x) => x.id)).toEqual([
    "weather",
    "technical",
    "human",
    "intentional",
  ]);
  expect(s.area.cells.reduce((n, c) => n + c.count, 0)).toBe(2181);
  await page.locator('[data-cohort="arrival"]').click();
  await page.locator('.cause-legend [data-cause="technical"]').click();
  s = await state(page);
  const expected = source.rows
    .filter(
      (r) =>
        r[source.columns.indexOf("phase")] === "arrival" &&
        r[source.columns.indexOf("cause")] === "technical",
    )
    .map((r) => r[0]);
  expect(s.selection.recordIds).toEqual(expected);
  await page.locator('[data-measure="percentage"]').click();
  s = await state(page);
  expect(s.selection.recordIds).toEqual(expected);
  for (let i = 0; i < 11; i++)
    expect(s.area.series.reduce((n, r) => n + r.data[i].y, 0)).toBeCloseTo(
      1,
      10,
    );
  await page.locator(".source-inspector summary").click();
  const exact = page.locator(
    '.exact-value[data-cause="technical"][data-period="1970"]',
  );
  await exact.focus();
  await page.keyboard.press("Space");
  s = await state(page);
  expect(s.selection.cell).toEqual({
    cause: "technical",
    binStart: 1970,
    binEnd: 1974,
  });
  expect(s.selection.recordIds).toEqual(
    expected.filter((id) => {
      const r = source.rows.find((r) => r[0] === id);
      return r[3] >= 1970 && r[3] <= 1974;
    }),
  );
  expect(page.url()).toContain("#/flight-phase");
  const ids = s.selection.recordIds;
  await page.locator('[data-measure="count"]').click();
  expect((await state(page)).selection.recordIds).toEqual(ids);
  expect(errors).toEqual([]);
});

test("keyboard chart controls do not advance Reveal; completed exploration retains state across slides", async ({
  page,
}) => {
  await chapter(page);
  const ribbon = page.locator('[data-cohort-key="later"]');
  await ribbon.focus();
  await page.keyboard.press("Space");
  expect((await state(page)).selection.cohort).toBe("later");
  expect(page.url()).toContain("#/flight-phase");
  const measure = page.locator('[data-measure="percentage"]');
  await measure.focus();
  await page.keyboard.press("Space");
  expect((await state(page)).area.measure).toBe("percentage");
  expect(page.url()).toContain("#/flight-phase");
  await page.keyboard.press("ArrowRight");
  expect(page.url()).toContain("#/flight-phase");
  await page.locator("#playback-toggle").click(); // Keep the destination at its first beat for the round trip.
  await page.locator("[data-story-next]").click();
  await expect(page.locator('.flight-phase-bridge')).toBeVisible();
  await page.locator("[data-story-next]").click();
  await expect(page).toHaveURL(/#\/flight-types$/);
  await page.locator("[data-story-back]").click();
  await expect(page).toHaveURL(/#\/flight-phase$/);
  expect((await state(page)).selection.cohort).toBe("later");
  expect((await state(page)).area.measure).toBe("percentage");
  await expect(page.locator('.flight-phase-bridge')).toBeVisible();
  await page.locator("[data-story-back]").click();
  expect((await state(page)).selection.cohort).toBe("later");
  await page.locator('[data-measure="count"]').focus();
  await page.keyboard.press("Escape");
  expect((await state(page)).selection.recordIds).toHaveLength(2792);
  expect(page.url()).toContain("#/flight-phase");
});

test("themes, reduced motion, mobile layout and explicit cause jump", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await chapter(page);
  await page.locator('[data-cohort="departure"]').click();
  if (screenshotDir)
    await page.screenshot({
      path: `${screenshotDir}/website-phase-desktop.png`,
    });
  await page.locator(".jump-to-causes").click();
  await expect(page.locator("#flight-causes-title")).toBeFocused();
  const before = (await state(page)).selection.recordIds;
  if (screenshotDir)
    await page.screenshot({
      path: `${screenshotDir}/website-light-desktop.png`,
    });
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "dark");
  expect((await state(page)).selection.recordIds).toEqual(before);
  await page.waitForTimeout(100);
  if (screenshotDir)
    await page.screenshot({
      path: `${screenshotDir}/website-dark-desktop.png`,
    });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  const horizontal = await page
    .locator("#flight-phase .view")
    .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  expect(horizontal).toBe(false);
  await page.locator("#flight-phase .view").evaluate((el) => el.scrollTo(0, 0));
  if (screenshotDir)
    await page.screenshot({
      path: `${screenshotDir}/website-mobile-phase.png`,
    });
  await page.locator(".jump-to-causes").click();
  await expect(page.locator("#flight-causes-title")).toBeFocused();
  if (screenshotDir)
    await page.screenshot({ path: `${screenshotDir}/website-dark-mobile.png` });
  await page.locator('[data-measure="percentage"]').click();
  expect((await state(page)).selection.recordIds).toEqual(before);
});
