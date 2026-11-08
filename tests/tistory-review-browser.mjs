import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const work=process.env.TISTORY_MIGRATION_WORKDIR;
assert.ok(work && work.startsWith('/'), 'TISTORY_MIGRATION_WORKDIR must point to a private external directory');
const ledger=JSON.parse(fs.readFileSync(`${work}/migration-ledger.json`,'utf8'));
const base=process.env.TEST_URL || 'http://127.0.0.1:3106';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const results=[];
try {
  await page.goto(base+'/?label=tistory');
  assert.equal(await page.locator('a[href^="/posts/tistory/"]').count(),0);
  assert.equal((await context.request.get(base+'/html-posts/tistory/1')).status(),401);
  const fixture=`${work}/staged/posts/book/__private-source-access-test.md`;
  fs.mkdirSync(`${work}/staged/posts/book`,{recursive:true,mode:0o700});
  fs.writeFileSync(fixture,'---\ntitle: "External private source test"\ndate: "2000-01-01"\ncategory: book\nscope: public\n---\nPrivate content',{mode:0o600});
  try {
    const denied=await context.request.get(base+'/posts/book/__private-source-access-test',{maxRedirects:0});
    assert.equal(denied.status(),307);
    assert.ok(denied.headers().location.startsWith('/login'));
    await page.goto(base);
    assert.equal(await page.getByRole('link',{name:'External private source test'}).count(),0);
  } finally {fs.unlinkSync(fixture)}
  const login=await context.request.post(base+'/api/auth/login',{form:{password:process.env.BLOG_REVIEW_PASSWORD || 'local-html-test',next:'/?label=tistory'},maxRedirects:0});
  assert.equal(login.status(),303);
  await page.goto(base+'/?label=tistory');
  assert.equal(await page.locator('main a[href^="/posts/tistory/"]').count(),232);
  const dates=await page.locator('[data-post-date]').first().getAttribute('data-post-date');
  assert.equal(dates,'2023-12-10T23:46:45+09:00');
  assert.equal(await page.locator('[data-post-label]').filter({hasText:/^tistory$/}).count(),232);
  assert.equal(await page.locator('[data-post-label]').filter({hasText:/^ai-generated$/}).count(),0);
  await page.goto(base+'/?label=tistory&year=2017');
  assert.equal(await page.locator('main a[href^="/posts/tistory/"]').count(),69);
  const selectors=[r=>r.originalId==='1',r=>r.originalId==='12',r=>r.originalId==='99',r=>r.originalId==='124',r=>r.sourceCounts.code>0,r=>r.unresolvedResources.length>0,r=>r.videos.length>0,r=>r.originalId==='100',r=>fs.readFileSync(`${work}/${r.targetFile}`,'utf8').includes('<details open class="migration-details">')];
  const samples=[...new Map(selectors.map(p=>ledger.records.find(p)).filter(Boolean).map(r=>[r.originalId,r])).values()];
  fs.mkdirSync(`${work}/review`,{recursive:true,mode:0o700});
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:1000});
    await page.goto(base+'/?label=tistory');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`${work}/review/list-${width}.png`});
    for(const row of samples) {
      const response=await page.goto(base+'/html-posts/'+row.targetSlug);
      assert.equal(response.status(),200);
      const csp=response.headers()['content-security-policy'];
      assert.ok(csp.includes("frame-src 'none'"));
      assert.equal(await page.locator('table').count(),row.sourceCounts.table);
      assert.equal(await page.locator('pre').count(),row.sourceCounts.pre);
      assert.equal(await page.locator('code').count(),row.sourceCounts.code);
      assert.equal(await page.locator('iframe').count(),row.sourceCounts.iframe);
      assert.equal(await page.locator('img').count(),row.sourceCounts.img);
      const original=page.getByRole('link',{name:'원문 보기 · tistory'});
      assert.equal(await original.getAttribute('href'),row.originalUrl);
      await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.src.startsWith('data:')).map(i=>i.decode().catch(()=>{})))});
      const images=await page.locator('img').evaluateAll(imgs=>imgs.map(i=>({embedded:i.src.startsWith('data:'),loaded:i.naturalWidth>0})));
      assert.ok(images.filter(i=>i.embedded).every(i=>i.loaded),`Embedded image decode failed in ${row.originalId}`);
      const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(geometry.scroll <= geometry.width,`Page overflow in ${row.originalId} at ${width}`);
      if(await page.locator('.migration-details').count()){const fold=page.locator('.migration-details').first();await fold.locator('summary').click();assert.equal(await fold.getAttribute('open'),null);await fold.locator('summary').click();assert.notEqual(await fold.getAttribute('open'),null);}
      await page.screenshot({path:`${work}/review/article-${row.originalId}-${width}.png`,fullPage:false});
      results.push({id:row.originalId,width,status:row.status,geometry,images});
    }
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(`${work}/review/browser-results.json`,JSON.stringify({privacy:'anonymous listings empty; private HTML denied; scope public in external book folder still denied',listCount:232,year2017:69,samples:results,errors},null,2),{mode:0o600});
  console.log(JSON.stringify({anonymousAccess:'denied',all232ListedAfterLogin:true,year2017:69,sampleChecks:results.length,overflow:results.filter(r=>r.geometry.scroll>r.geometry.width).map(r=>({id:r.id,width:r.width,scroll:r.geometry.scroll})),errors}));
} finally {await browser.close()}
