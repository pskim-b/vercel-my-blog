import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parse} from 'parse5';
import {remark} from 'remark';
import remarkGfm from 'remark-gfm';
import {bundledLanguages,codeToHtml} from 'shiki';
import {parseContent} from '../src/lib/content.mjs';
import {taxonomy,classifyPost} from '../src/lib/taxonomy.mjs';
import {validateMigrationTaxonomy} from '../src/lib/migration-taxonomy.mjs';

const args=process.argv.slice(2);const work=fs.realpathSync(args[args.indexOf('--workdir')+1]);
if(work===process.cwd()||work.startsWith(process.cwd()+path.sep))throw new Error('Use a private external workdir');
process.umask(0o077);
const read=name=>JSON.parse(fs.readFileSync(work+'/'+name,'utf8'));
const inventory=read('import-inventory.json');const assets=read('assets-index.json');
const diagrams=fs.existsSync(work+'/diagrams-index.json')?read('diagrams-index.json'):[];
const previous=fs.existsSync(work+'/migration-ledger.json')?read('migration-ledger.json'):null;
const importedAt=previous?.summary.importedAt??new Date().toISOString();
const sourceCommit=execFileSync('git',['-C',work+'/raw/source','rev-parse','HEAD'],{encoding:'utf8'}).trim();
const publishedCommit=execFileSync('git',['-C',work+'/raw/published','rev-parse','HEAD'],{encoding:'utf8'}).trim();
const hash=x=>createHash('sha256').update(x).digest('hex');
const nodes=n=>[n,...(n.childNodes??[]).flatMap(nodes)];
const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
const cls=(n,v)=>(attr(n,'class')??'').split(/\s+/).includes(v);
const text=n=>!n||['style','script'].includes(n.tagName)?'':n.nodeName==='#text'?n.value:(n.childNodes??[]).map(text).join('');
const prose=n=>!n||(['style','script','pre'].includes(n.tagName)||cls(n,'hugo-diagram-preview'))?'':n.nodeName==='#text'?n.value:(n.childNodes??[]).map(prose).join('');
const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const uriMap=new Map();
for(const doc of inventory.documents){uriMap.set(doc.originalUrl,doc.targetSlug);for(const alias of doc.aliases)uriMap.set(alias.originalUrl,doc.targetSlug);}
const resourceMap=new Map(inventory.resources.map(r=>[r.url??new URL(r.value,r.originalUrl).href,r]));
const cssRE=/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
const counts=all=>Object.fromEntries(['img','table','pre','code','iframe','svg','canvas'].map(tag=>[tag,all.filter(n=>n.tagName===tag).length]));
const codeNodes=n=>[...(n.type==='code'?[n]:[]),...(n.children??[]).flatMap(codeNodes)];
const norm=x=>x.replace(/\r\n?/g,'\n').trim().split('\n').map(s=>s.trimEnd()).join('\n');
function targetFor(doc){
 const category=(doc.metadata.categories?.[0]??'').toLowerCase();let target={section:'unclassified',type:null,topicPaths:[]};const addLabels=[];
 if(category==='book')target={section:'reflections',type:'book',topicPaths:[]};
 if(category==='money')addLabels.push('경제');
 const source=doc.sourcePath.toLowerCase();
 if(category==='architecture'){
  const topic=source.includes('designpattern')?'design/patterns':source.includes('/msa/')?'design/architecture/msa':source.includes('data_intensive')?'design/architecture/data-intensive':'design/architecture';
  target={section:'tech',type:null,topicPaths:[topic]};
 }else if(category==='bigdata'){
  const leaf=['hadoop','hbase','nifi','hive'].find(name=>source.includes('/'+name+'/'));
  const topic=leaf?'big-data/'+leaf:source.includes('/datalake/')?'big-data/data-lake':'big-data';
  target={section:'tech',type:null,topicPaths:[topic]};
 }else if(['datasicence','datascience'].includes(category))target={section:'tech',type:null,topicPaths:[source.includes('/adsp/')?'data-science/adsp':'data-science']};
 else if(category==='java')target={section:'tech',type:null,topicPaths:['java']};
 else if(category==='redis')target={section:'tech',type:null,topicPaths:['redis']};
 else if(category==='spring')target={section:'tech',type:null,topicPaths:['java/spring']};
 return{target:validateMigrationTaxonomy(target,taxonomy),addLabels};
}
const rows=[];
for(const doc of inventory.documents){
 const file=work+'/raw/source/'+doc.sourcePath;const raw=fs.readFileSync(file,'utf8');
 if(hash(fs.readFileSync(file))!==doc.sourceSha256)throw new Error('Source Markdown changed');
 const markdown=raw.split('+++').slice(2).join('+++').replace(/^\r?\n/,'');
 const ast=remark().use(remarkGfm).parse(markdown);const sourceCodes=codeNodes(ast);
 const issues=[];const resourceLog=[];const links=[];const widgets=[];let converted;let expectedCounts;let expectedText;let codeChecks=[];let contentText='';let targetCounts;const docDiagrams=diagrams.filter(d=>d.sourcePath===doc.sourcePath);
 function resolve(value,base,kind){
  if(!value||/^data:|^#/.test(value))return{value};
  let url;try{url=new URL(value,base).href;}catch{issues.push({kind,url:value,reason:'Invalid URL'});return{value};}
  let local=resourceMap.get(url);let result;
  if(!local&&new URL(url).origin==='https://pskim-b.github.io'){
   const relative=decodeURIComponent(new URL(url).pathname).replace(/^\/+/, '');
   for(const root of ['raw/published','raw/source/static','raw/source']){
    const candidate=path.resolve(work,root,relative);
    if(candidate.startsWith(path.resolve(work,root)+path.sep)&&fs.existsSync(candidate)&&fs.statSync(candidate).isFile()){local={status:'local',file:path.relative(work,candidate),sha256:hash(fs.readFileSync(candidate)),recoveryMethod:'source-asset-path'};break;}
   }
  }
  if(local?.status==='local'){
   const ext=path.extname(local.file).toLowerCase();const mime=({'.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2'})[ext];
   if(mime)result={status:'downloaded',file:local.file,mime,sha256:local.sha256,recoveryMethod:local.recoveryMethod};
  }else result=assets[url];
  if(result?.status==='downloaded'){
   const bytes=fs.readFileSync(work+'/'+result.file);if(hash(bytes)!==result.sha256)throw new Error('Asset checksum mismatch');
   resourceLog.push({originalUrl:url,file:result.file,mime:result.mime,sha256:result.sha256,recoveryMethod:result.recoveryMethod??null});
   return{value:`data:${result.mime};base64,${bytes.toString('base64')}`,result,url};
  }
  issues.push({kind,url,reason:result?.error??'Referenced file missing from source and published snapshots'});return{value,url};
 }
 function css(source,base){return source.replace(cssRE,(whole,a,b,c)=>{const old=(a??b??c).trim();const found=resolve(old,base,'stylesheet-resource');return found.value===old?whole:`url("${found.value}")`;});}
 if(doc.format==='html'){
  const published=fs.readFileSync(work+'/raw/published/'+doc.publishedPath,'utf8');
  const originalTree=parse(published,{sourceCodeLocationInfo:true});const all=nodes(originalTree);const body=all.find(n=>cls(n,'post__content'));const bodyAll=nodes(body);
  expectedCounts=counts(bodyAll);expectedText=prose(body);contentText=text(body);
  const pre=bodyAll.filter(n=>n.tagName==='pre');
  if(pre.length!==sourceCodes.length)throw new Error('Source/render code-block count mismatch: '+doc.sourcePath);
  const edits=[];
  const mermaidNodes=bodyAll.filter(n=>cls(n,'mermaid'));
  if(mermaidNodes.length!==docDiagrams.length)throw new Error('Unrendered Mermaid diagram');
  for(let i=0;i<mermaidNodes.length;i++){
   const diagram=docDiagrams[i];const svg=fs.readFileSync(work+'/'+diagram.file,'utf8');
   if(hash(svg)!==diagram.sha256)throw new Error('Diagram checksum mismatch');
   edits.push({start:mermaidNodes[i].sourceCodeLocation.startOffset,end:mermaidNodes[i].sourceCodeLocation.startOffset,text:`<figure class="hugo-diagram-preview" role="img" aria-label="Strategy 패턴 클래스 설계도"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" alt="Strategy 패턴 클래스 설계도"></figure>`});
  }
  for(let i=0;i<pre.length;i++){
   const originalCode=text(pre[i]);const sourceCode=sourceCodes[i].value;
   if(norm(originalCode)!==norm(sourceCode))throw new Error('Source/render code content mismatch');
   const language=(sourceCodes[i].lang??'text').toLowerCase();
   const html=await codeToHtml(sourceCode,{lang:Object.hasOwn(bundledLanguages,language)?language:'text',theme:'monokai'});
   const recovered=text(nodes(parse(html)).find(n=>n.tagName==='code'));
   if(recovered!==sourceCode)throw new Error('Code whitespace changed');
   edits.push({start:pre[i].sourceCodeLocation.startOffset,end:pre[i].sourceCodeLocation.endOffset,text:html});
   codeChecks.push({language,sourceSha256:hash(sourceCode),targetSha256:hash(recovered),sourceCharacters:sourceCode.length});
  }
  for(const node of bodyAll){
   const loc=node.sourceCodeLocation;if(!loc)continue;
   if(node.tagName==='iframe'){widgets.push({originalUrl:attr(node,'src'),kind:attr(node,'src')?.includes('subscribe_embed')?'youtube-subscribe-widget':'iframe',status:'preserved-but-viewer-blocks-external-frames'});continue;}
   for(const a of node.attrs??[]){
    const at=loc.attrs?.[a.name];if(!at)continue;let value=a.value;
    if(['src','poster','data-src','background'].includes(a.name))value=resolve(value,doc.originalUrl,`${node.tagName}-${a.name}`).value;
    else if(a.name==='style')value=css(value,doc.originalUrl);
    else if(a.name==='srcset'&&!value.startsWith('data:'))value=value.split(',').map(v=>{const m=v.trim().match(/^(.*?)(\s+\d+(?:\.\d+)?[wx])?$/);return resolve(m[1],doc.originalUrl,'srcset').value+(m[2]??'');}).join(', ');
    else if(node.tagName==='a'&&a.name==='href'&&!value.startsWith('#')){
     try{const url=new URL(value,doc.originalUrl);const fragment=url.hash;url.hash='';const target=uriMap.get(url.href);value=target?`/posts/${target}${fragment}`:url.href;if(target)links.push({originalUrl:new URL(a.value,doc.originalUrl).href,targetUrl:value});}catch{}
    }
    if(value!==a.value)edits.push({start:at.startOffset,end:at.endOffset,text:`${a.name}="${escape(value)}"`});
   }
   if(node.tagName==='style'&&loc.endTag){const old=published.slice(loc.startTag.endOffset,loc.endTag.startOffset);const next=css(old,doc.originalUrl);if(old!==next)edits.push({start:loc.startTag.endOffset,end:loc.endTag.startOffset,text:next});}
   if(node.tagName==='table'){
    let p=node.parentNode,nested=false;while(p){if(p.tagName==='table')nested=true;p=p.parentNode;}
    if(!nested){edits.push({start:loc.startOffset,end:loc.startOffset,text:'<div class="hugo-table-scroll">'});edits.push({start:loc.endOffset,end:loc.endOffset,text:'</div>'});}
   }
  }
  const start=body.sourceCodeLocation.startOffset,end=body.sourceCodeLocation.endOffset;let fragment=published.slice(start,end);let boundary=Infinity;
  for(const e of edits.sort((a,b)=>b.start-a.start||b.end-a.end)){if(e.end>boundary&&e.start!==e.end)throw new Error('Overlapping article edits');fragment=fragment.slice(0,e.start-start)+e.text+fragment.slice(e.end-start);boundary=e.start;}
  let styles='';
  for(const link of all.filter(n=>n.tagName==='link'&&attr(n,'rel')==='stylesheet')){
   const found=resolve(attr(link,'href'),doc.originalUrl,'stylesheet');
   if(found.result?.mime==='text/css'){
    const rawCSS=fs.readFileSync(work+'/'+found.result.file,'utf8');
    const base=found.result.effectiveUrl??found.url;
    styles+='<style>'+css(rawCSS,base).replace(/<\/style/gi,'<\\/style')+'</style>';
   }
  }
  const transformed=nodes(parse(fragment)).find(n=>cls(n,'post__content'));
  if(prose(transformed)!==expectedText)throw new Error('Original prose changed');
  const afterCounts=counts(nodes(transformed));targetCounts={...expectedCounts,img:expectedCounts.img+docDiagrams.length};if(JSON.stringify(afterCounts)!==JSON.stringify(targetCounts))throw new Error('Original element count changed');
  const afterCode=nodes(transformed).filter(n=>n.tagName==='pre').map(text);
  if(afterCode.some((value,i)=>value!==sourceCodes[i].value))throw new Error('Source code characters changed');
  for(const tag of ['table'])if(JSON.stringify(bodyAll.filter(n=>n.tagName===tag).map(text))!==JSON.stringify(nodes(transformed).filter(n=>n.tagName===tag).map(text)))throw new Error('Table values changed');

  const statusText=`비공개 Hugo 이관 검토본${issues.length?` · 복구가 필요한 자원 ${issues.length}개`:''}${widgets.length?` · 외부 구독 위젯 ${widgets.length}개는 현재 표시되지 않습니다`:''}`;
  converted=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(doc.metadata.title)}</title>${styles}<style>body{margin:0;background:#fff;color:#333}.hugo-import-main{max-width:920px;margin:auto;padding:24px;min-width:0}.hugo-import-note{padding:12px 20px;background:#fff7dc;color:#593f06;font:14px/1.6 system-ui}.hugo-table-scroll{max-width:100%;overflow-x:auto}.hugo-diagram-preview{margin:24px 0;max-width:100%}.hugo-diagram-preview svg{max-width:100%;height:auto}.post__content .mermaid{display:none}.post__content img{max-width:100%;height:auto}.post__content pre{max-width:100%;overflow:auto}.post__title{overflow-wrap:anywhere}.post__content{overflow-wrap:anywhere}@media(max-width:600px){.hugo-import-main{padding:16px}.post__title{font-size:1.7rem}}</style></head><body><aside class="hugo-import-note">${escape(statusText)}</aside><main class="hugo-import-main"><article class="post"><header class="post__header"><h1 class="post__title">${escape(doc.metadata.title)}</h1><time datetime="${escape(doc.metadata.date)}">${escape(doc.metadata.date)}</time></header>${fragment}</article></main></body></html>`;
 }else{
  converted=markdown;contentText=markdown;expectedCounts={sourceFencedCodeBlocks:sourceCodes.length};
  if(/{{[<%]/.test(markdown)||/!\[[^\]]*\]\(/.test(markdown))throw new Error('Working copy needs extra rendering or assets');
 }
 const chosen=targetFor(doc);const labels=[...(Array.isArray(doc.metadata.tags)?doc.metadata.tags:[]),'hugo',...chosen.addLabels,...(doc.publicationState==='working-copy'?['working-copy']:[])];
 const status=issues.length||widgets.length?'staged-with-content-blockers':'staged-content-validated';
 const metadata={title:doc.metadata.title,date:doc.metadata.date,category:doc.metadata.categories?.join('/')||'hugo',label:labels,scope:'private',description:contentText.replace(/\s+/g,' ').trim().slice(0,140)||doc.metadata.title,
  migration:{source:'hugo',originalUrl:doc.originalUrl,originalPath:doc.originalPath,originalId:doc.sourcePath,sourcePath:doc.sourcePath,originalPublishedAt:doc.metadata.date,importedAt,
   sourceRepository:'pskim-b/hugo-blog',sourceCommit,publishedCommit,originalCategories:doc.metadata.categories??[],originalTags:doc.metadata.tags??[],publicationState:doc.publicationState,
   sourceVisibility:doc.publicationState==='working-copy'?'not-in-published-content-root':'public-render-snapshot',aliases:doc.aliases.map(a=>a.originalUrl),taxonomy:chosen.target,verificationStatus:status}};
 const header=Object.entries(metadata).map(([k,v])=>`${k}: ${JSON.stringify(v)}`).join('\n');
 const output=doc.format==='html'?`<!--\n---\n${header}\n---\n-->\n${converted}`:`---\n${header}\n---\n${converted}`;
 const parsed=parseContent(output,doc.format);
 if(parsed.data.scope!=='private'||!parsed.data.label.includes('hugo')||parsed.data.label.some(l=>['ai-generated','ai-generate'].includes(l)))throw new Error('Invalid import privacy/provenance');
 const classification=classifyPost({...parsed.data,isPublic:false});if(classification.section!==chosen.target.section)throw new Error('Taxonomy not applied');
 const targetFile='staged/posts/'+doc.targetSlug+'.'+doc.format;fs.mkdirSync(path.dirname(work+'/'+targetFile),{recursive:true,mode:0o700});fs.writeFileSync(work+'/'+targetFile,output,{mode:0o600});
 rows.push({sourcePath:doc.sourcePath,sourceSha256:doc.sourceSha256,originalUrl:doc.originalUrl,aliases:doc.aliases,targetSlug:doc.targetSlug,targetUrl:'/posts/'+doc.targetSlug,targetFile,date:metadata.date,
  publicationState:doc.publicationState,scope:'private',format:doc.format,status,taxonomy:chosen.target,sourceCounts:expectedCounts,targetCounts:targetCounts??expectedCounts,diagrams:docDiagrams,codeChecks,assets:resourceLog,unresolvedResources:issues,widgets,rewrittenInternalLinks:links,
  originalBodyText:contentText,originalTitle:metadata.title,targetSha256:hash(output)});
}
const sections={};for(const r of rows)sections[r.taxonomy.section]=(sections[r.taxonomy.section]??0)+1;
const summary={sourceRepository:'pskim-b/hugo-blog',sourceCommit,publishedCommit,articleCount:rows.length,publishedPosts:rows.filter(r=>r.format==='html').length,workingCopies:rows.filter(r=>r.format==='md').length,
 duplicatePublishedAliases:inventory.aliases.length,allPrivate:true,sourceCodeBlocksPreserved:rows.reduce((s,r)=>s+r.codeChecks.length+(r.sourceCounts.sourceFencedCodeBlocks??0),0),
 contentValidated:rows.filter(r=>r.status==='staged-content-validated').length,contentBlocked:rows.filter(r=>r.status!=='staged-content-validated').length,bySection:sections,
 staticDiagrams:rows.reduce((s,r)=>s+r.diagrams.length,0),
 unresolvedReferences:rows.reduce((s,r)=>s+r.unresolvedResources.length,0),externalWidgets:rows.reduce((s,r)=>s+r.widgets.length,0),importedAt,productionDeployment:'not-deployed'};
fs.writeFileSync(work+'/migration-ledger.json',JSON.stringify({summary,records:rows},null,2)+'\n',{mode:0o600});fs.writeFileSync(work+'/migration-summary.json',JSON.stringify(summary,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(summary,null,2));
