import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from 'parse5';
import {execFileSync} from 'node:child_process';
const args=process.argv.slice(2);const work=fs.realpathSync(args[args.indexOf('--workdir')+1]);
if(work===process.cwd()||work.startsWith(process.cwd()+path.sep))throw new Error('Use a private external workdir');
const sourceCommit=execFileSync('git',['-C',work+'/raw/source','rev-parse','HEAD'],{encoding:'utf8'}).trim();
const source=JSON.parse(fs.readFileSync(work+'/source-inventory.json','utf8'));
const published=JSON.parse(fs.readFileSync(work+'/published-inventory.json','utf8'));
const nodes=n=>[n,...(n.childNodes??[]).flatMap(nodes)];const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
const hash=value=>createHash('sha256').update(value).digest('hex');
const cls=(n,v)=>(attr(n,'class')??'').split(/\s+/).includes(v);
const rendered=published.map(doc=>{const html=fs.readFileSync(work+'/raw/published/'+doc.publishedPath,'utf8');const all=nodes(parse(html,{sourceCodeLocationInfo:true}));const body=all.find(n=>cls(n,'post__content'));const fragment=html.slice(body.sourceCodeLocation.startOffset,body.sourceCodeLocation.endOffset);return{...doc,bodyHash:hash(fragment),fragment,all};});
const docs=[];const used=new Set();const refs=[];
const imageFiles=[];
function walkImages(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory()&&e.name!=='.git')walkImages(file);else if(e.isFile()&&/\.(png|jpe?g|gif|svg)$/i.test(e.name))imageFiles.push(file);}}
walkImages(work+'/raw/published');walkImages(work+'/raw/source/content');walkImages(work+'/raw/source/static');
function localAsset(url,baseUrl){
  if(!url||/^data:|^#/.test(url))return{status:'embedded'};
  const resolved=new URL(url,baseUrl);
  if(resolved.hostname==='pskim-b.github.io'){
    const rel=decodeURIComponent(resolved.pathname).replace(/^\/+/, '');
    for(const root of ['raw/published','raw/source/static']){
      const file=path.resolve(work,root,rel);if(!file.startsWith(path.resolve(work,root)+path.sep))throw new Error('Unsafe asset path');
      if(fs.existsSync(file)&&fs.statSync(file).isFile())return{status:'local',file:path.relative(work,file),sha256:hash(fs.readFileSync(file))};
    }
    const matches=imageFiles.filter(file=>path.basename(file).normalize('NFC')===path.basename(rel).normalize('NFC'));
    if(matches.length&&new Set(matches.map(file=>hash(fs.readFileSync(file)))).size===1){const file=matches[0];return{status:'local',file:path.relative(work,file),sha256:hash(fs.readFileSync(file)),recoveryMethod:'same-filename-and-identical-source-snapshot-bytes',originalAssetUrl:resolved.href};}
  }
  return{status:'remote',url:resolved.href};
}
for(const doc of source.documents){
  const m=doc.metadata;const working=doc.sourcePath.startsWith('working/');
  const expected=doc.sourcePath.replace(/^content\//,'').replace(/\.(md|markdown|html)$/i,'').toLowerCase()+'/index.html';
  const titleMatches=rendered.filter(p=>p.title.normalize('NFC').trim()===m.title.normalize('NFC').trim());
  const page=working?null:rendered.find(p=>p.publishedPath===expected)??(titleMatches.length===1?titleMatches[0]:null);
  if(!working&&!page)throw new Error('Unmatched source permalink: '+doc.sourcePath);
  const originalUrl=working?new URL('https://github.com/pskim-b/hugo-blog/blob/'+sourceCommit+'/'+doc.sourcePath).href:new URL(page.publishedPath.replace(/index\.html$/,''),'https://pskim-b.github.io/').href;
  const slug=working?'hugo/working/'+path.basename(doc.sourcePath).replace(/\.(md|markdown|html)$/i,'').toLowerCase():'hugo/'+page.publishedPath.replace(/^posts\//,'').replace(/\/index\.html$/,'');
  const aliases=[];
  if(page){
    for(const other of rendered)if(other.publishedPath!==page.publishedPath&&other.title===page.title&&other.bodyHash===page.bodyHash){aliases.push({originalUrl:new URL(other.publishedPath.replace(/index\.html$/,''),'https://pskim-b.github.io/').href,publishedPath:other.publishedPath,evidence:'identical-article-html'});used.add(other.publishedPath);}
    used.add(page.publishedPath);
    const bodyNodes=nodes(page.all.find(n=>cls(n,'post__content')));
    for(const n of [...bodyNodes,...page.all.filter(n=>n.tagName==='link'&&attr(n,'rel')==='stylesheet')])for(const a of n.attrs??[]){
      if(!['src','poster','data-src','srcset'].includes(a.name)&&!(n.tagName==='link'&&a.name==='href')&&!(n.tagName==='a'&&a.name==='href'&&/\.(pdf|zip|png|jpe?g)(?:$|[?#])/i.test(a.value)))continue;
      if(n.tagName==='iframe')continue;
      const values=a.name==='srcset'?a.value.split(',').map(v=>v.trim().replace(/\s+\d+(?:\.\d+)?[wx]$/,'')):[a.value];
      for(const value of values)refs.push({slug,tag:n.tagName,attribute:a.name,value,originalUrl,...localAsset(value,originalUrl)});
    }
  }
  docs.push({...doc,originalUrl,originalPath:new URL(originalUrl).pathname,targetSlug:slug,publishedPath:page?.publishedPath??null,format:working?'md':'html',publicationState:working?'working-copy':'published-snapshot',aliases,renderedBodySha256:page?.bodyHash??null});
}
const unaccounted=rendered.filter(p=>!used.has(p.publishedPath));
if(unaccounted.length)throw new Error('Published articles not accounted for: '+unaccounted.map(d=>d.publishedPath));
process.umask(0o077);fs.writeFileSync(work+'/import-inventory.json',JSON.stringify({documents:docs,resources:refs,aliases:docs.flatMap(d=>d.aliases),unaccountedPublished:[]},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({sourceDocuments:docs.length,published:docs.filter(d=>d.format==='html').length,working:docs.filter(d=>d.format==='md').length,duplicatePublishedRoutes:docs.flatMap(d=>d.aliases).length,resources:refs.length,local:refs.filter(r=>r.status==='local').length,remote:refs.filter(r=>r.status==='remote').length}));
