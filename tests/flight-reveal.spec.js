import { test,expect } from '@playwright/test';
const next = p => p.locator('[data-story-next]');
const snapshot = p => p.locator('.flight-exploration').evaluate(r => ({
  reveal:r.revealData, sankey:r.sankeyData, area:r.areaData, selection:r.selection, commentary:r.commentary,
}));
async function openFrozen(page,auto=true) {
  await page.clock.install({time:new Date('2026-11-05T12:00:00Z')});
  await page.goto('/#/welcome');
  await page.locator('.flight-exploration').waitFor({state:'attached'});
  await page.clock.pauseAt(new Date('2026-11-05T12:01:00Z'));
  if(!auto)await page.locator('#playback-toggle').click();
  await page.evaluate(() => {location.hash='/flight-phase';});
  await expect(page.locator('#flight-phase')).toHaveClass(/present/);
  await expect(page.locator('.flight-exploration')).toHaveAttribute('data-playback',auto ? 'waiting' : 'manual');
}
function verifyIdentity(s,source) {
  const columns=source.columns;
  const byId=new Map(source.rows.map(row => [row[0],Object.fromEntries(columns.map((c,i) => [c,row[i]]))]));
  expect(s.sankey.recordIds).toEqual(s.reveal.recordIds);
  expect(s.area.recordIds).toEqual(s.reveal.recordIds);
  expect(s.selection.recordIds).toEqual(s.reveal.recordIds);
  expect(new Set(s.reveal.recordIds).size).toBe(s.reveal.recordIds.length);
  for (const cell of s.area.cells) {
    const expected=s.reveal.recordIds.filter(id => {
      const r=byId.get(id);return r.cause===cell.cause && r.year>=cell.binStart && r.year<=cell.binEnd;
    });
    expect(cell.recordIds).toEqual(expected);
    expect(cell.count).toBe(expected.length);
  }
  for(const link of s.sankey.links) expect(link.value).toBe(link.recordIds.length);
  const airborne=['departure','in_flight','arrival'];
  const commentIds=s.reveal.recordIds.filter(id=>{
    const phase=byId.get(id).phase,key=s.commentary.phase;
    return key==='ordered' ? airborne.includes(phase) : key==='unresolved' ? !airborne.includes(phase) : key==='later' ? ['in_flight','arrival'].includes(phase) : phase===key;
  });
  expect(s.commentary.recordIds).toEqual(commentIds);
  for(const leader of s.commentary.leaders) expect(leader.count).toBe(commentIds.filter(id => byId.get(id).cause===leader.cause).length);
}

test('guided beats introduce each branch before its causes, preserving source identities in both charts',async ({page,request}) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const source=await(await request.get('/data/flight-exploration.json')).json();
  await openFrozen(page,false);
  const root=page.locator('.flight-exploration');
  await expect(root).toHaveAttribute('data-story-beat','0');
  await expect(page.locator('.sankey-stage')).toBeHidden();
  await expect(page.locator('.phase-controls')).toBeHidden();
  await next(page).click();await expect(root).toHaveAttribute('data-story-beat','1');
  await expect(page.locator('[data-phase-takeaway]')).toHaveText('Three broad phases.');
  expect((await snapshot(page)).reveal.recordIds).toHaveLength(0);
  await next(page).click();await expect(root).toHaveAttribute('data-story-beat','1.5');
  await expect(root).toHaveAttribute('data-attention-phase','departure');
  await expect(page.locator('[data-phase-explanation]')).toContainText('22%');
  await page.clock.runFor(1000);
  let s=await snapshot(page);verifyIdentity(s,source);
  expect(s.reveal.recordIds.length).toBeGreaterThan(0);expect(s.reveal.recordIds.length).toBeLessThan(610);
  expect(s.commentary.phase).toBe('departure');
  await expect(page.locator('.phase-cause-leader')).toHaveCount(0);
  await next(page).click();
  s=await snapshot(page);verifyIdentity(s,source);expect(s.reveal.recordIds).toHaveLength(610);
  await next(page).click();await expect(root).toHaveAttribute('data-story-beat','2');
  await expect(page.locator('.phase-cause-leader')).toHaveCount(2);
  expect((await snapshot(page)).commentary.leaders).toEqual([{cause:'human',count:215},{cause:'technical',count:181}]);
  await next(page).click();await expect(root).toHaveAttribute('data-story-beat','2.5');
  expect((await snapshot(page)).reveal.recordIds).toHaveLength(610);
  await expect(root).toHaveAttribute('data-attention-phase','in_flight');
  await expect(page.locator('[data-phase-explanation]')).toContainText('23%');
  await next(page).click();await page.clock.runFor(1000);
  s=await snapshot(page);verifyIdentity(s,source);
  expect(s.reveal.recordIds.length).toBeGreaterThan(610);expect(s.reveal.recordIds.length).toBeLessThan(1265);
  await next(page).click();await next(page).click();
  await expect(root).toHaveAttribute('data-story-beat','3.5');
  s=await snapshot(page);verifyIdentity(s,source);expect(s.reveal.recordIds).toHaveLength(1265);
  expect(s.commentary.leaders).toEqual([{cause:'human',count:267},{cause:'technical',count:168}]);
  await next(page).click();await expect(root).toHaveAttribute('data-story-beat','4');
  await expect(page.locator('[data-phase-explanation]')).toContainText('55%');
  expect((await snapshot(page)).reveal.recordIds).toHaveLength(1265);
  await next(page).click();await page.clock.runFor(1300);
  s=await snapshot(page);verifyIdentity(s,source);
  expect(s.reveal.recordIds.length).toBeGreaterThan(1265);expect(s.reveal.recordIds.length).toBeLessThan(2792);
  await next(page).click();await next(page).click();
  await expect(root).toHaveAttribute('data-story-beat','5');
  s=await snapshot(page);verifyIdentity(s,source);expect(s.reveal.recordIds).toHaveLength(2792);
  expect(s.commentary.leaders).toEqual([{cause:'human',count:859},{cause:'technical',count:271}]);
  expect(s.sankey.links.some(l=>l.key==='unresolved')).toBe(false);
  await expect(page.locator('[data-cohort=unresolved]')).toHaveCount(0);
  await next(page).click();await expect(root).toHaveAttribute('data-story-beat','5.5');
  s=await snapshot(page);verifyIdentity(s,source);
  expect(s.reveal.recordIds).toEqual(source.rows.filter(r=>['departure','in_flight','arrival'].includes(r[1])).map(r=>r[0]));
  expect(s.area.displayedCount).toBe(2181);
  await expect(root).toHaveAttribute('data-playback','complete');
  await expect(page.locator('[data-phase-takeaway]')).toHaveText('Arrival accounts for over half.');
  await expect(page.locator('.phase-controls')).toBeVisible();
  await expect(page.locator('.phase-summary-row strong')).toHaveText(['610','655','1,527']);
  await expect(page.locator('[data-story-position]')).toHaveText('5 of 8 · Reveal 11 of 12');
  await page.clock.fastForward(60000);await expect(page.locator('#flight-phase')).toHaveClass(/present/);
  await next(page).click();await expect(root).toHaveAttribute('data-story-beat','6');
  await expect(page.locator('.flight-phase-bridge')).toHaveText('But these are not all the same flights.');
  await expect(page.locator('.flight-flow')).toBeHidden();
  await page.clock.fastForward(60000);await expect(page.locator('#flight-phase')).toHaveClass(/present/);
  await next(page).click();await expect(page.locator('#flight-types')).toHaveClass(/present/);
  expect(errors).toEqual([]);
});

test('natural Auto completion, Pause/Resume, Back and Replay retain linked data',async ({page,request}) => {
  const source=await(await request.get('/data/flight-exploration.json')).json();
  await openFrozen(page);
  const root=page.locator('.flight-exploration');
  await page.clock.runFor(4800);
  await page.locator('[data-flight-pause]').click();
  const held=(await snapshot(page)).reveal.recordIds;
  expect(held.length).toBeGreaterThan(0);expect(held.length).toBeLessThan(610);
  await page.clock.runFor(5000);expect((await snapshot(page)).reveal.recordIds).toEqual(held);
  await page.locator('[data-flight-pause]').click();
  await page.clock.runFor(30000);
  await expect(root).toHaveAttribute('data-playback','complete');
  verifyIdentity(await snapshot(page),source);
  for(let i=0;i<3;i++)await page.locator('[data-story-back]').click();
  const back=await snapshot(page);verifyIdentity(back,source);expect(back.reveal.recordIds).toHaveLength(1265);
  await expect(root).toHaveAttribute('data-story-beat','4');
  await page.clock.runFor(10000);expect((await snapshot(page)).reveal.recordIds).toEqual(back.reveal.recordIds);
  await page.locator('[data-flight-replay]').click();
  await expect(root).toHaveAttribute('data-story-beat','0');
  await page.locator('#playback-toggle').click();
  await page.clock.runFor(5200);
  const replay=await snapshot(page);verifyIdentity(replay,source);expect(replay.reveal.recordIds.length).toBeGreaterThan(0);expect(replay.reveal.recordIds.length).toBeLessThan(610);
});

for (const [layout,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
  test(`${layout}: phase ribbons draw through consecutive paths at fixed thickness`,async ({page}) => {
    await page.setViewportSize(viewport);
    await openFrozen(page,false);
    await next(page).click();await next(page).click();
    const paths = () => page.locator('path.flow-base').evaluateAll(nodes => nodes.map(n => ({
      terminal:n.dataset.terminal,path:n.getAttribute('d'),width:n.getAttribute('stroke-width'),
      progress:Number(n.getAttribute('stroke-dasharray').split(' ')[0]),visibility:n.getAttribute('visibility'),
    })));
    await page.clock.runFor(400);
    const early=await paths(),departure=early.filter(d => d.terminal==='departure');
    expect(departure[0].progress).toBeGreaterThan(0);
    expect(departure[0].progress).toBeLessThan(1);
    expect(departure[1].progress).toBe(0);
    expect(early.filter(d => d.terminal!=='departure').every(d => d.visibility==='hidden')).toBe(true);
    await page.clock.runFor(600);
    const middle=await paths(),route=middle.filter(d => d.terminal==='departure');
    expect(route[0].progress).toBe(1);
    expect(route[1].progress).toBeGreaterThan(0);
    expect(route[1].progress).toBeLessThan(1);
    expect(middle.map(({terminal,path,width})=>({terminal,path,width}))).toEqual(early.map(({terminal,path,width})=>({terminal,path,width})));
    // The path's leading point advances on the reading axis, including the
    // top-to-bottom mobile route; a width-only fill cannot satisfy this.
    const front=await page.locator('path.flow-base[data-terminal="departure"]').first().evaluate(n => {
      const length=n.getTotalLength(),p=n.getPointAtLength(length*.25),q=n.getPointAtLength(length*.75);
      return {dx:q.x-p.x,dy:q.y-p.y};
    });
    expect(layout==='desktop' ? front.dx : front.dy).toBeGreaterThan(20);
    await page.clock.runFor(2200);
    const later=await paths();
    expect(later.filter(d=>d.terminal==='departure').every(d=>d.progress===1)).toBe(true);
    expect(later.map(({terminal,path,width})=>({terminal,path,width}))).toEqual(early.map(({terminal,path,width})=>({terminal,path,width})));
    expect(later.filter(d=>d.terminal==='arrival').every(d=>d.visibility==='hidden')).toBe(true);
    await next(page).click();await next(page).click();await next(page).click();
    await page.clock.runFor(400);
    await page.locator('[data-flight-pause]').click();
    const paused=await paths();await page.clock.runFor(3000);expect(await paths()).toEqual(paused);
  });
}
