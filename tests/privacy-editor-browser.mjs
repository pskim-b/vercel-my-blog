import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {getContentFiles,parseContent} from '../src/lib/content.mjs';
import {parse} from 'parse5';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.TEST_URL||'http://localhost:3106';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const root=process.env.BLOG_PRIVATE_POSTS_DIR;assert.ok(root?.startsWith('/'));
const rules=JSON.parse(fs.readFileSync(path.dirname(root)+'/privacy-rules.json','utf8'));
const text=n=>['style','script'].includes(n.tagName)?'':n.nodeName==='#text'?n.value:(n.childNodes??[]).map(text).join('');
let audited=0;
for(const file of [...getContentFiles(root),...getContentFiles('posts')]){const {data,content}=parseContent(fs.readFileSync(file,'utf8'),file.endsWith('.html')?'html':'md');const visible=[data.title,data.description,...(data.label??[]),file.endsWith('.html')?text(parse(content)):content].join('\n');for(const rule of rules)assert.ok(!visible.includes(rule.from),'Unredacted visible content');audited++;}
const fixture=path.join(root,'tistory','__editor_verification.html');
const raw='<!--\n---\ntitle: "편집 검증"\ndate: "2001-03-02"\ncategory: "test"\nlabel: ["tistory"]\nscope: "private"\ndescription: "Before"\nmigration: {"source":"tistory","originalUrl":"https://example.com/123","originalPublishedAt":"2001-03-02","importedAt":"2026-11-08T00:00:00Z"}\n---\n-->\n<html><head><style>p{color:green}</style></head><body><h1>편집 검증</h1><div class="article-view"><p>Before</p><table><tr><td>42</td></tr></table><pre>  code\n</pre></div></body></html>';
const browser=await chromium.launch();
try{
 const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/');
 assert.equal(await page.getByRole('navigation',{name:'글 대분류'}).locator('a[aria-current="page"]').first().innerText().then(t=>t.startsWith('전체 보기')),true);
 await page.goto(base+'/?section=exercise&type=running');assert.equal(await page.locator('.exercise-record').count(),10);
 const running=await page.locator('.exercise-record h3 a').first().getAttribute('href');assert.equal((await page.goto(base+running)).status(),200);assert.ok(!page.url().includes('/login'));
 fs.writeFileSync(fixture,raw,{mode:0o600});
 await page.goto(base+'/edit/tistory/__editor_verification');assert.ok(page.url().includes('/login'));
 const denied=await context.request.post(base+'/api/post-edits/tistory/__editor_verification',{form:{title:'Bad',html:'<p>Bad</p>'}});assert.equal(denied.status(),401);
 await context.request.post(base+'/api/auth/login',{form:{password:process.env.BLOG_REVIEW_PASSWORD,next:'/'},maxRedirects:0});
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});
  await page.goto(base+'/?source=tistory&section=journal&month=2017-03');
  assert.equal(await page.getByRole('navigation',{name:'월별 기록'}).count(),0);
  assert.equal(await page.locator('.journal-record').count(),102);
  assert.ok((await page.locator('.period-heading').allTextContents()).every(v=>/^\d{4}년$/.test(v.trim())));
  const year=page.getByRole('navigation',{name:'연도별 글 인덱스'});assert.ok(await year.locator('a').evaluateAll(links=>links.every(a=>!new URL(a.href).searchParams.has('month'))));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await page.goto(base+'/html-posts/tistory/__editor_verification');await page.getByRole('link',{name:'수정',exact:true}).click();
 const html=await page.getByLabel('본문 HTML').inputValue();const revision=await page.locator('input[name=revision]').inputValue();
 await page.getByLabel('제목',{exact:true}).fill('편집 확인');await page.getByLabel('본문 HTML').fill(html.replace('Before','After'));
 await page.getByRole('button',{name:'수정 저장'}).click();await page.waitForURL('**/html-posts/tistory/__editor_verification');
 assert.equal(await page.locator('.article-view p').innerText(),'After');assert.equal(await page.locator('td').innerText(),'42');assert.equal(await page.locator('pre').textContent(),'  code\n');
 const saved=parseContent(fs.readFileSync(fixture,'utf8'),'html');assert.equal(saved.data.date,'2001-03-02');assert.equal(saved.data.migration.originalUrl,'https://example.com/123');
 await page.goto(base+'/edit/tistory/__editor_verification');
 const stale=await page.evaluate(async({revision})=>{const f=new FormData();f.set('revision',revision);f.set('title','Old');f.set('html','<p>Old</p>');return(await fetch('/api/post-edits/tistory/__editor_verification',{method:'POST',body:f})).status;},{revision});assert.equal(stale,409);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({default:'all',publicRunning:10,journalMonthIndexRemoved:true,oldMonthFilterIgnored:true,redactionAudited:audited,editorSavePreservesMetadataAndElements:true,anonymousWriteDenied:true,staleWriteDenied:true,errors}));
}finally{if(fs.existsSync(fixture))fs.unlinkSync(fixture);await browser.close()}
