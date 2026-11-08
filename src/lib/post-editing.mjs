import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {parse} from 'parse5';
import {parseContent} from './content.mjs';
const nodes=n=>[n,...(n.childNodes??[]).flatMap(nodes)];
const text=n=>['script','style'].includes(n.tagName)?'':n.nodeName==='#text'?n.value:(n.childNodes??[]).map(text).join('');
export const postRevision=source=>createHash('sha256').update(source).digest('hex');
export function editableHtml(source){
 const {data,content}=parseContent(source,'html');const all=nodes(parse(content,{sourceCodeLocationInfo:true}));
 const article=all.find(n=>n.attrs?.some(a=>a.name==='class'&&a.value.split(/\s+/).some(c=>['article-view','post__content'].includes(c))));
 if(!article?.sourceCodeLocation?.endTag)throw new Error('Editable article not found');
 const start=article.sourceCodeLocation.startTag.endOffset,end=article.sourceCodeLocation.endTag.startOffset;
 return{data,content,start,end,html:content.slice(start,end),revision:postRevision(source)};
}
export function reviseHtml(source,{title,html}){
 if(typeof title!=='string'||!title.trim()||typeof html!=='string'||!html.trim())throw new Error('Title and body are required');
 const current=editableHtml(source);
 const fragment=nodes(parse(html));
 if(fragment.some(n=>n.tagName==='script'||n.tagName==='base'||n.tagName==='iframe'&&!current.html.includes('<iframe')))throw new Error('New active embeds are not supported');
 const body=current.content.slice(0,current.start)+html+current.content.slice(current.end);
 const data={...current.data,title:title.trim(),description:text(parse(html)).replace(/\s+/g,' ').trim().slice(0,140)||title.trim()};
 // Visible article headings outside the editable body follow the title field.
 const all=nodes(parse(body,{sourceCodeLocationInfo:true}));let updated=body;
 const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 for(const node of all.filter(n=>n.nodeName==='#text'&&n.value.trim()===current.data.title&&n.sourceCodeLocation).reverse()){
  const parent=node.parentNode?.tagName;if(!['title','h1','h2'].includes(parent))continue;
  updated=updated.slice(0,node.sourceCodeLocation.startOffset)+escape(data.title)+updated.slice(node.sourceCodeLocation.endOffset);
 }
 const header=Object.entries(data).map(([k,v])=>`${k}: ${JSON.stringify(v)}`).join('\n');
 const output=`<!--\n---\n${header}\n---\n-->\n${updated}`;
 parseContent(output,'html');return output;
}
export function savePrivateRevision(file,source,updated,root){
 const privateRoot=fs.realpathSync(root),realFile=fs.realpathSync(file);
 if(!realFile.startsWith(privateRoot+path.sep))throw new Error('Not a private source');
 if(fs.readFileSync(realFile,'utf8')!==source)throw new Error('Post changed; reload before saving');
 const revisions=path.join(path.dirname(privateRoot),'revisions');fs.mkdirSync(revisions,{recursive:true,mode:0o700});
 const key=postRevision(source);const backup=path.join(revisions,key+'.html');
 if(!fs.existsSync(backup))fs.writeFileSync(backup,source,{mode:0o600,flag:'wx'});
 const temp=realFile+'.'+randomUUID()+'.tmp';
 try{fs.writeFileSync(temp,updated,{mode:0o600,flag:'wx'});fs.renameSync(temp,realFile);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
 return{before:key,after:postRevision(updated)};
}
