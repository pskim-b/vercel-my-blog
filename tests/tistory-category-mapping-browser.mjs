import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:3106';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const root=process.env.TISTORY_MIGRATION_WORKDIR;
assert.ok(root?.startsWith('/'));
const browser=await chromium.launch();
try{
  const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?source=tistory');assert.equal(await page.locator('main a[href^="/posts/tistory/"]').count(),0);
  assert.equal((await context.request.get(base+'/html-posts/tistory/1')).status(),401);
  const login=await context.request.post(base+'/api/auth/login',{form:{password:process.env.BLOG_REVIEW_PASSWORD||'local-html-test',next:'/?source=tistory'},maxRedirects:0});assert.equal(login.status(),303);
  const cases=[['',232],['section=tech',66],['section=journal',102],['section=reflections',16],['section=reflections&type=book',10],['section=reflections&type=travel',3],['section=reflections&type=music',3],['section=exercise',18],['section=exercise&type=saxophone',18],['section=unclassified',30],['section=unclassified&label='+encodeURIComponent('경제'),15],['section=tech&topic=security',2],['section=tech&topic=java',6],['section=tech&topic=java%2Fspring',2]];
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:1000});
    for(const [query,count]of cases){
      await page.goto(base+'/?source=tistory'+(query?'&'+query:''));
      assert.equal(await page.locator('main a[href^="/posts/tistory/"]').count(),count,query);
      const nav=page.getByRole('navigation',{name:'글 대분류'});
      assert.ok((await nav.getByRole('link',{name:/^기술/}).innerText()).includes('66'));
      assert.ok((await nav.getByRole('link',{name:/^몰입/}).innerText()).includes('18'));
      assert.ok(await nav.locator('a').evaluateAll(links=>links.every(a=>new URL(a.href).searchParams.get('source')==='tistory')));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow '+query+' '+width);
      if(query==='section=tech'||query==='section=exercise'||query==='')await page.screenshot({path:`${root}/review/mapped-${query?query.split('=')[1]:'all'}-${width}.png`});
    }
  }
  await page.goto(base+'/?source=tistory');
  const href=await page.getByRole('navigation',{name:'글 대분류'}).getByRole('link',{name:/^감상/}).getAttribute('href');assert.ok(href.includes('source=tistory'));
  await page.getByRole('navigation',{name:'글 대분류'}).getByRole('link',{name:/^감상/}).click();
  await page.waitForURL(url=>url.searchParams.get('section')==='reflections');
  assert.equal(new URL(page.url()).searchParams.get('source'),'tistory');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(`${root}/review/taxonomy-browser-results.json`,JSON.stringify({cases:cases.length,viewports:[390,1440],allMappedCountsMatch:true,sourcePreservedAcrossSections:true,privateAccessDenied:true,errors},null,2),{mode:0o600});
  console.log('PASS: 14 source-scoped category/type/topic cases at mobile/desktop, scoped menu counts and links, private access, no overflow');
}finally{await browser.close()}
