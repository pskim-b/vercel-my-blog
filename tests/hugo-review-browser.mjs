import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const work=process.env.HUGO_MIGRATION_WORKDIR;
assert.ok(work?.startsWith('/'));
const ledger=JSON.parse(fs.readFileSync(work+'/migration-ledger.json','utf8'));
const base=process.env.TEST_URL||'http://127.0.0.1:3106';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
fs.mkdirSync(work+'/review',{recursive:true,mode:0o700});
const browser=await chromium.launch();
try{
 const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?source=hugo');
 assert.equal(await page.locator('main a[href^="/posts/hugo/"]').count(),0);
 assert.equal((await context.request.get(base+'/html-posts/'+ledger.records.find(r=>r.format==='html').targetSlug)).status(),401);
 const working=ledger.records.find(r=>r.format==='md');
 const denied=await context.request.get(base+working.targetUrl,{maxRedirects:0});assert.equal(denied.status(),307);
 const login=await context.request.post(base+'/api/auth/login',{form:{password:process.env.BLOG_REVIEW_PASSWORD,next:'/?source=hugo'},maxRedirects:0});assert.equal(login.status(),303);
 const cases=[['',46],['section=tech',40],['section=reflections&type=book',2],['section=unclassified',4],['label=working-copy',2],['label='+encodeURIComponent('경제'),1]];
 const results=[];
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});
  for(const [query,count]of cases){
   await page.goto(base+'/?source=hugo'+(query?'&'+query:''));
   assert.equal(await page.locator('main a[href^="/posts/hugo/"]').count(),count,query);
   const nav=page.getByRole('navigation',{name:'글 대분류'});
   assert.ok(await nav.locator('a').evaluateAll(links=>links.every(a=>new URL(a.href).searchParams.get('source')==='hugo')));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'List overflow '+width);
  }
  await page.goto(base+'/?source=hugo');
  assert.equal(await page.getByRole('link',{name:'티스토리 글 메뉴 · 232'}).count(),1);
  assert.equal(await page.getByRole('link',{name:'Hugo 글 메뉴 · 46'}).count(),1);
  assert.equal(await page.locator('[data-post-label]').filter({hasText:/^ai-generated$/}).count(),0);
  await page.screenshot({path:`${work}/review/list-${width}.png`});
  for(const row of ledger.records){
   const response=await page.goto(base+(row.format==='html'?'/html-posts/'+row.targetSlug:row.targetUrl));assert.equal(response.status(),200,row.targetSlug);
   if(row.format==='html'){
    assert.ok(response.headers()['content-security-policy'].includes("frame-src 'none'"));
    for(const tag of ['img','table','pre','code','iframe'])assert.equal(await page.locator('.post__content '+tag).count(),(row.targetCounts??row.sourceCounts)[tag],row.targetSlug+' '+tag);
    assert.equal(await page.getByRole('link',{name:'원문 보기 · hugo'}).getAttribute('href'),row.originalUrl);
    assert.equal(await page.getByRole('link',{name:'블로그로 돌아가기'}).getAttribute('href'),'/?source=hugo');
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.src.startsWith('data:')).map(i=>i.decode()))});
    assert.ok(await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.src.startsWith('data:')).every(i=>i.naturalWidth>0)),row.targetSlug+' image decode');
    assert.equal(await page.locator('.hugo-diagram-preview img').count(),row.diagrams?.length??0);
    const codes=await page.locator('.post__content pre').allTextContents();
    assert.equal(codes.length,row.codeChecks.length);
   }
   const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(geometry.scroll<=geometry.width,JSON.stringify({slug:row.targetSlug,...geometry}));
   results.push({slug:row.targetSlug,width,status:row.status,geometry});
   if(row.targetSlug.includes('20220109_02_')||row.unresolvedResources.length||row.diagrams?.length)await page.screenshot({path:`${work}/review/article-${row.targetSlug.split('/').at(-1)}-${width}.png`});
  }
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(work+'/review/browser-results.json',JSON.stringify({anonymousAccessDenied:true,sourceCounts:{tistory:232,hugo:46},filterCases:cases.length,viewports:[390,1440],articleChecks:results,errors},null,2),{mode:0o600});
 console.log(JSON.stringify({privateAccess:'denied',hugoListed:46,tistoryUnchanged:232,filters:cases.length,articleChecks:results.length,errors}));
}finally{await browser.close()}
