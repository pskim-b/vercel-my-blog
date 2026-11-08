import fs from 'node:fs';
import {parse} from 'parse5';
import {createHash} from 'node:crypto';
const [hugo,tistory]=process.argv.slice(2);
if(!hugo?.startsWith('/')||!tistory?.startsWith('/'))throw new Error('Provide private Hugo and Tistory batch directories');
const load=p=>JSON.parse(fs.readFileSync(p+'/migration-ledger.json','utf8')).records;
const walk=n=>[n,...(n.childNodes??[]).flatMap(walk)];
const text=n=>['style','script'].includes(n.tagName)?'':n.nodeName==='#text'?n.value:(n.childNodes??[]).map(text).join(' ');
const normalize=s=>s.normalize('NFKC').replace(/\s+/g,'').toLowerCase();
const shingles=s=>{const set=new Set();for(let i=0;i<s.length-11;i+=4)set.add(s.slice(i,i+12));return set;};
const left=load(hugo).map(r=>({...r,normalized:normalize(r.originalBodyText)}));
const right=load(tistory).map(r=>{const all=walk(parse(fs.readFileSync(tistory+'/'+r.targetFile,'utf8')));const body=all.find(n=>(n.attrs?.find(a=>a.name==='class')?.value??'').split(/\s+/).includes('article-view'));if(!body)throw new Error('Tistory article body not found');return{...r,normalized:normalize(text(body))};});
const candidates=[];
for(const a of left){const as=shingles(a.normalized);for(const b of right){if(a.normalized.length<120||b.normalized.length<120)continue;const bs=shingles(b.normalized);let shared=0;for(const x of as)if(bs.has(x))shared++;const score=shared/Math.min(as.size,bs.size);if(a.normalized===b.normalized||score>=0.65)candidates.push({hugo:a.targetSlug,tistory:b.targetSlug,exact:a.normalized===b.normalized,sharedShingleFraction:Number(score.toFixed(3)),hugoBodyHash:createHash('sha256').update(a.normalized).digest('hex'),tistoryBodyHash:createHash('sha256').update(b.normalized).digest('hex')});}}
const report={hugoPosts:left.length,tistoryPosts:right.length,comparison:'NFKC whitespace-normalized text; sampled 12-character shingles; >=65% smaller-body containment is only a review candidate',automaticMerges:0,candidates};
process.umask(0o077);fs.writeFileSync(hugo+'/duplicate-review.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({candidates:candidates.length,exact:candidates.filter(r=>r.exact).length,automaticMerges:0}));
