import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const work=process.argv[process.argv.indexOf('--workdir')+1];
if(!work?.startsWith('/')||work.startsWith(process.cwd()+'/'))throw new Error('Use a private external workdir');
process.umask(0o077);
const hash=x=>createHash('sha256').update(x).digest('hex');
const inventory=JSON.parse(fs.readFileSync(work+'/import-inventory.json'));
const script=work+'/tools/mermaid-10.9.3.min.js';
const browser=await chromium.launch();const diagrams=[];
try{
 const page=await browser.newPage();await page.route('**/*',r=>r.abort());
 await page.setContent('<!doctype html><html><body></body></html>');await page.addScriptTag({path:script});
 await page.evaluate(()=>mermaid.initialize({startOnLoad:false,securityLevel:'strict',htmlLabels:false,theme:'neutral',flowchart:{htmlLabels:false},class:{htmlLabels:false}}));
 for(const doc of inventory.documents){
  const raw=fs.readFileSync(work+'/raw/source/'+doc.sourcePath,'utf8');
  const expressions=[...raw.matchAll(/{{<\s*mermaid\b[^>]*>}}([\s\S]*?){{<\s*\/mermaid\s*>}}/g)];
  for(let i=0;i<expressions.length;i++){
   const source=expressions[i][1].trim();const id='hugoDiagram'+diagrams.length;
   const svg=await page.evaluate(async({id,source})=>(await mermaid.render(id,source)).svg,{id,source});
   if(/<script\b|<foreignObject\b|<image\b/i.test(svg))throw new Error('Diagram must be self-contained static SVG');
   const target='diagrams/'+id+'.svg';fs.mkdirSync(work+'/diagrams',{recursive:true,mode:0o700});fs.writeFileSync(work+'/'+target,svg,{mode:0o600});
   diagrams.push({sourcePath:doc.sourcePath,index:i,source,sourceSha256:hash(source),file:target,sha256:hash(svg),renderer:'mermaid@10.9.3',rendererSha256:hash(fs.readFileSync(script))});
  }
 }
 fs.writeFileSync(work+'/diagrams-index.json',JSON.stringify(diagrams,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({staticDiagrams:diagrams.length}));
}finally{await browser.close()}
