import fs from 'node:fs';
import {remark} from 'remark';
import gfm from 'remark-gfm';
import {parse} from 'parse5';
const work=process.argv[process.argv.indexOf('--workdir')+1];
if(!work?.startsWith('/')||work.startsWith(process.cwd()+'/'))throw new Error('Use a private external workdir');
const inventory=JSON.parse(fs.readFileSync(work+'/import-inventory.json'));
const walk=n=>[n,...(n.childNodes??n.children??[]).flatMap(walk)];
const text=n=>n.nodeName==='#text'?n.value:(n.childNodes??[]).map(text).join('');
// Hugo smart punctuation and emoji aliases have different rendered characters.
// This is an additional semantic check; importer separately checks exact HTML prose and exact source code.
const norm=s=>s.normalize('NFKC').replace(/:[a-z0-9_-]+:/g,'').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
let checked=0;const missing=[];
for(const doc of inventory.documents.filter(d=>d.format==='html')){
 const source=fs.readFileSync(work+'/raw/source/'+doc.sourcePath,'utf8').split('+++').slice(2).join('+++').replace(/{{<\s*mermaid\b[^>]*>}}[\s\S]*?{{<\s*\/mermaid\s*>}}/g,'');
 const tree=remark().use(gfm).parse(source.replace(/{{<\s*\/?table\b[^>]*>}}/g,''));
 const all=walk(parse(fs.readFileSync(work+'/raw/published/'+doc.publishedPath,'utf8')));
 const body=all.find(n=>n.attrs?.some(a=>a.name==='class'&&a.value.split(/\s+/).includes('post__content')));
 const rendered=norm(text(body));
 for(const n of walk(tree).filter(n=>['text','inlineCode'].includes(n.type))){const value=norm(n.value);if(value.length<3)continue;checked++;if(!rendered.includes(value))missing.push({sourcePath:doc.sourcePath,line:n.position.start.line,length:value.length,sourceText:n.value});}
}
process.umask(0o077);fs.writeFileSync(work+'/source-prose-check.json',JSON.stringify({checked,comparison:'Unicode letters/numbers after Hugo smart-punctuation and emoji normalization; exact code checked separately',missing},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({checked,missing:missing.length,samples:missing.slice(0,4).map(r=>({sourcePath:r.sourcePath,line:r.line,length:r.length}))}));
