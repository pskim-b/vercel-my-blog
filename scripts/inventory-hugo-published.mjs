import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'parse5';
const work=process.argv[process.argv.indexOf('--workdir')+1];
if(!path.isAbsolute(work??'')||work.startsWith(process.cwd()+'/'))throw new Error('Use a private external workdir');
const walk=n=>[n,...(n.childNodes??[]).flatMap(walk)];
const text=n=>n.nodeName==='#text'?n.value:(n.childNodes??[]).map(text).join('');
const hasClass=(n,name)=>n.attrs?.some(a=>a.name==='class'&&a.value.split(/\s+/).includes(name));
const rows=[];
function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())visit(file);else if(entry.name==='index.html'){
 const all=walk(parse(fs.readFileSync(file,'utf8')));const body=all.find(n=>hasClass(n,'post__content'));if(!body)continue;
 const title=all.find(n=>hasClass(n,'post__title'));if(!title)throw new Error('Article title missing');
 rows.push({publishedPath:path.relative(work+'/raw/published',file),title:text(title).trim()});
}}}
visit(work+'/raw/published/posts');process.umask(0o077);
fs.writeFileSync(work+'/published-inventory.json',JSON.stringify(rows,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({publishedArticlePaths:rows.length}));
