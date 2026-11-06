#!/usr/bin/env node
// A direct file:// browser smoke test; intentionally does not use the test server.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm, copyFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const argument=process.argv.find(value=>value.startsWith('--out='));
const output=resolve(argument?argument.slice(6):join(root,'exports'));
const folder=join(output,'crashalot'),start=join(folder,'START.html');
const manifest=JSON.parse(await readFile(join(folder,'manifest.json'),'utf8'));
assert.equal(createHash('sha256').update(await readFile(start)).digest('hex'),manifest.start.sha256);
for(const data of manifest.data)assert.equal(createHash('sha256').update(await readFile(join(folder,'source/public',data.path))).digest('hex'),data.sha256);

const temporary=await mkdtemp(join(tmpdir(),'crashalot portable standalone '));
const isolated=join(temporary,'A different view of flying.html');
await copyFile(start,isolated);
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({offline:true,reducedMotion:'reduce',viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage(),errors=[],network=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
page.on('request',request=>{if(/^https?:/.test(request.url()))network.push(request.url());});
const navigate=async number=>{
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:/^Slide \d+:/})).toHaveCount(8);
  await page.getByRole('button',{name:new RegExp(`^Slide ${number}:`)}).click();
  await expect(page.locator('.reveal.overview')).toHaveCount(0);
};
try {
  // Open the isolated file, not a server and not the folder containing source.
  await page.goto(pathToFileURL(isolated).href+'#/welcome');
  await expect(page.locator('#portable-loading')).toHaveCount(0,{timeout:15000});
  await expect(page.locator('.slides > section')).toHaveCount(8);
  await expect(page.locator('#welcome')).toHaveClass(/present/);
  const render=[];
  for(const [number,id,selector]of [[2,'flight-1282','.hook-polaroid img'],[3,'change-over-time','.scale-comparison'],[4,'counts-in-context','.decade-trend'],[5,'flight-phase','.flight-exploration'],[6,'flight-types','.comparison-types'],[7,'aircraft-design','.comparison-aircraft']]){
    await navigate(number);
    await expect(page.locator(`#${id}`)).toHaveClass(/present/);
    const target=page.locator(`#${id}`).locator(selector);
    if(number===2){await expect(target).toBeAttached();assert.ok(await target.evaluate(image=>image.complete&&image.naturalWidth>0));}
    else await expect(target).toBeVisible();
    if(number>=3)assert.ok(await page.locator(`#${id} svg path, #${id} svg circle, #${id} svg rect`).count()>0,`${id} has chart marks`);
    if(number===5){
      await page.locator('[data-story-next]').click();
      await expect(page.locator('.flight-phase-bridge')).toBeVisible();
      await expect(page.locator('.flight-phase-bridge')).toHaveText('But these are not all the same flights.');
      await page.locator('[data-story-back]').click();
      await expect(page.locator('.flight-flow')).toBeVisible();
    }
    if(number===6){
      await expect(page.locator('.type-row')).toHaveCount(3);
      await expect(page.locator('.comparison-types .comparison-toolbar')).toHaveCount(0);
      await page.locator('.type-row').nth(1).locator('.type-label').hover();
      await expect(page.locator('.comparison-types [role="tooltip"]')).toContainText('fatal crashes');
      await expect(page.locator('.comparison-types [role="tooltip"]')).not.toContainText('nonfatal');
      await page.screenshot({path:join(output,'portable-flight-types-check.png')});
      await page.mouse.move(1430,20);
    }
    render.push(id);
  }
  const state=await page.locator('.comparison-aircraft').evaluate(node=>node.comparisonState);
  assert.ok(state.recordIds.length>0);
  assert.deepEqual(state.modelPacking.circles.flatMap(circle=>circle.recordIds).sort(),[...state.recordIds].sort());
  const source=JSON.parse(await readFile(join(folder,'source/public/data/comparison-records.json'),'utf8'));
  const sourceIds=new Set(source.rows.map(row=>row[source.columns.indexOf('source_id')]));
  assert.ok(state.recordIds.every(id=>sourceIds.has(id)));
  const aircraft=page.locator('.comparison-aircraft');
  for(const model of ['Airbus A320','Boeing 737 MAX 8']){
    await aircraft.getByRole('combobox',{name:'Aircraft model',exact:true}).selectOption(model);
    await expect(aircraft.locator('.model-polaroid-stage')).toHaveAttribute('data-model',model);
    await expect.poll(()=>aircraft.locator('.model-polaroid img').evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true);
  }
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme','dark');
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme','light');
  await aircraft.locator('.comparison-source summary').click();
  const downloading=page.waitForEvent('download');
  await aircraft.locator('a[download]').click();
  const download=await downloading;
  assert.equal(download.suggestedFilename(),'comparison-records.json');
  const downloaded=join(temporary,'comparison-records.json');await download.saveAs(downloaded);
  assert.equal(createHash('sha256').update(await readFile(downloaded)).digest('hex'),manifest.data.find(file=>file.path==='data/comparison-records.json').sha256);
  await aircraft.locator('.comparison-source summary').click();
  await aircraft.locator('.comparison-model-grid').scrollIntoViewIfNeeded();
  await page.mouse.move(1430,20);
  await page.screenshot({path:join(output,'portable-browser-check.png')});
  await navigate(8);
  await expect(page.locator('.conclusion-scene')).toHaveAttribute('data-beat','Thanks');
  await expect(page.getByRole('button',{name:'Back to the beginning'})).toBeVisible();
  await expect(page.getByRole('img',{name:'Thanks for watching'})).toBeVisible();
  await expect(page.locator('.globe-route')).toHaveCount(40);
  await expect(page.locator('.globe-land')).toHaveAttribute('d',/^M/);
  await page.screenshot({path:join(output,'portable-conclusion-check.png')});
  await page.getByRole('button',{name:'Back to the beginning'}).click();
  await expect(page.locator('#welcome')).toHaveClass(/present/);
  await expect(page.locator('#playback-toggle')).toHaveAttribute('aria-pressed','true');
  render.push('conclusion');
  // Exercise the moving presentation as well as reduced-motion completed views.
  const motion=await context.newPage();
  motion.on('pageerror',error=>errors.push(error.message));
  motion.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  motion.on('request',request=>{if(/^https?:/.test(request.url()))network.push(request.url());});
  await motion.emulateMedia({reducedMotion:'no-preference'});
  await motion.goto(pathToFileURL(isolated).href+'#/welcome');
  await expect(motion.locator('#portable-loading')).toHaveCount(0,{timeout:15000});
  await expect(motion.locator('#playback-toggle')).toHaveAttribute('aria-pressed','true');
  await motion.locator('[data-story-next]').click();
  await expect(motion.locator('#flight-1282')).toHaveClass(/present/);
  await expect.poll(()=>motion.locator('#flight-1282').getAttribute('data-hook-step'),{timeout:6000}).not.toBe('0');
  await expect(motion.locator('.presentation-footer')).toHaveAttribute('data-timing-state','countdown');
  await expect(motion.locator('.beat-wick')).toBeVisible();
  await motion.keyboard.press('Space');
  await expect(motion.locator('#playback-toggle')).toHaveAttribute('aria-pressed','false');
  await expect(motion.locator('.presentation-footer')).toHaveAttribute('data-timing-state','paused');
  await motion.keyboard.press('Space');
  await expect(motion.locator('#playback-toggle')).toHaveAttribute('aria-pressed','true');
  await motion.locator('[data-story-back]').click();
  await expect(motion.locator('#playback-toggle')).toHaveAttribute('aria-pressed','false');
  await motion.close();
  assert.deepEqual(network,[],'No runtime HTTP(S) request should be needed');
  assert.deepEqual(errors,[],'No browser runtime error should occur');
  const result={passed:true,mode:'offline file://, standalone file copied into a path with spaces',browser:browser.version(),slides:render.length+1,selectedRecords:state.recordIds.length,models:state.modelPacking.circles.length,images:['opening photograph','Airbus A320','Boeing 737 MAX 8'],themes:['light','dark'],playback:'Auto advances opening beats; live footer wick counts down and freezes on Space; Back disables Auto',flightTypes:'Three overlapping fatal-crash trails, year/count tooltips and explicit phase transition work offline',conclusion:'Globe and Penflow handwriting load offline; restart appears at final beat',sourceDownload:'SHA-256 matches embedded JSON',httpRequests:network.length,consoleErrors:errors.length};
  await writeFile(join(output,'portable-verification.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} finally { await browser.close();await rm(temporary,{recursive:true,force:true}); }
