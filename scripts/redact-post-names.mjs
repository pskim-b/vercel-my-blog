import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'parse5';
import {getContentFiles,parseContent} from '../src/lib/content.mjs';
import {postRevision,savePrivateRevision} from '../src/lib/post-editing.mjs';
const [root,rulesFile,backupRoot]=process.argv.slice(2);
if(!root||!rulesFile?.startsWith('/')||!backupRoot?.startsWith('/'))throw new Error('Usage: root /private/rules.json /private/revisions');
process.umask(0o077);
const rules=JSON.parse(fs.readFileSync(rulesFile,'utf8'));
if(!Array.isArray(rules)||rules.some(r=>!r.from||typeof r.to!=='string'))throw new Error('Invalid rules');
const counts=rules.map(()=>0);
const replace=s=>rules.reduce((value,r,i)=>{counts[i]+=value.split(r.from).length-1;return value.split(r.from).join(r.to);},s);
const walk=n=>[n,...(n.childNodes??[]).flatMap(walk)];
const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const changed=[];
for(const file of getContentFiles(root)){
 const source=fs.readFileSync(file,'utf8');let updated;
 if(file.endsWith('.html')){
  const {data,content}=parseContent(source,'html');
  for(const field of ['title','description','category'])if(typeof data[field]==='string')data[field]=replace(data[field]);
  if(Array.isArray(data.label))data.label=data.label.map(replace);
  const edits=[];
  for(const node of walk(parse(content,{sourceCodeLocationInfo:true}))){
   let p=node.parentNode,skip=false;while(p){if(['script','style'].includes(p.tagName))skip=true;p=p.parentNode;}if(skip)continue;
   const loc=node.sourceCodeLocation;if(!loc)continue;
   if(node.nodeName==='#text'){const value=replace(node.value);if(value!==node.value)edits.push({start:loc.startOffset,end:loc.endOffset,value:escape(value)});}
   for(const attr of node.attrs??[]){if(!['alt','title','aria-label','content'].includes(attr.name)||!loc.attrs?.[attr.name])continue;const value=replace(attr.value);if(value!==attr.value)edits.push({start:loc.attrs[attr.name].startOffset,end:loc.attrs[attr.name].endOffset,value:`${attr.name}="${escape(value).replace(/"/g,'&quot;')}"`});}
  }
  let body=content;for(const edit of edits.sort((a,b)=>b.start-a.start))body=body.slice(0,edit.start)+edit.value+body.slice(edit.end);
  // Do not rewrite unaffected files merely to normalize frontmatter.
  const oldData=parseContent(source,'html').data;
  if(!edits.length&&JSON.stringify(data)===JSON.stringify(oldData))continue;
  updated=`<!--\n---\n${Object.entries(data).map(([k,v])=>`${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n-->\n${body}`;
 }else updated=replace(source);
 if(updated===source)continue;
 const backup=path.join(backupRoot,postRevision(source)+path.extname(file));fs.mkdirSync(backupRoot,{recursive:true,mode:0o700});
 if(!fs.existsSync(backup))fs.writeFileSync(backup,source,{mode:0o600,flag:'wx'});
 if(file.endsWith('.html'))savePrivateRevision(file,source,updated,root);else fs.writeFileSync(file,updated);
 changed.push({file:path.relative(root,file),before:postRevision(source),after:postRevision(updated)});
}
fs.writeFileSync(path.join(backupRoot,'redaction-'+Date.now()+'.json'),JSON.stringify({root:path.resolve(root),rules:rules.map((r,i)=>({replacement:r.to,occurrences:counts[i]})),changed},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({filesChanged:changed.length,replacements:rules.map((r,i)=>({replacement:r.to,occurrences:counts[i]}))}));
