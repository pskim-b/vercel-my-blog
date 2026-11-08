import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseContent} from '../src/lib/content.mjs';

const args=process.argv.slice(2);
const output=args.shift();
if(!output||!path.isAbsolute(output)||!args.length)throw new Error('Usage: node scripts/sync-private-library.mjs /private/library/posts /private/batch [...]');
process.umask(0o077);
fs.mkdirSync(output,{recursive:true,mode:0o700});
const destination=fs.realpathSync(output);
const repository=fs.realpathSync(process.cwd());
if(destination===repository||destination.startsWith(repository+path.sep))throw new Error('Private library must be outside the public repository');
const manifestFile=path.join(destination,'..','library-manifest.json');
const previous=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8')).entries:[];
const prior=new Map(previous.map(entry=>[entry.slug,entry]));
const seen=new Set();const entries=[];
for(const batchPath of args){
 const batch=fs.realpathSync(batchPath);
 const ledger=JSON.parse(fs.readFileSync(path.join(batch,'migration-ledger.json'),'utf8'));
 for(const record of ledger.records){
  const source=fs.realpathSync(path.resolve(batch,record.targetFile));
  if(!source.startsWith(batch+path.sep))throw new Error('Unsafe source path');
  const extension=path.extname(source);const relative=record.targetSlug+extension;
  const target=path.resolve(destination,relative);
  if(!target.startsWith(destination+path.sep)||seen.has(record.targetSlug))throw new Error('Unsafe or duplicate target slug');
  seen.add(record.targetSlug);
  const bytes=fs.readFileSync(source);const digest=createHash('sha256').update(bytes).digest('hex');
  if(digest!==record.targetSha256)throw new Error('Staged post checksum mismatch');
  const {data}=parseContent(bytes.toString('utf8'),extension.slice(1));
  if(data.scope!=='private'||!data.migration?.source)throw new Error('Only private migration posts are accepted');
  fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
  // Refuse to follow any existing library symlink.
  for(let parent=path.dirname(target);parent!==destination;parent=path.dirname(parent))if(fs.lstatSync(parent).isSymbolicLink())throw new Error('Symlink in library path');
  if(fs.existsSync(target)&&fs.lstatSync(target).isSymbolicLink())throw new Error('Symlink target');
  const existing=fs.existsSync(target)?fs.readFileSync(target):null;
  const currentHash=existing?createHash('sha256').update(existing).digest('hex'):null;
  const locallyEdited=!!existing&&currentHash!==(prior.get(record.targetSlug)?.sha256??digest);
  if(!locallyEdited)fs.writeFileSync(target,bytes,{mode:0o600});
  fs.chmodSync(target,0o600);
  entries.push({slug:record.targetSlug,source:data.migration.source,sha256:locallyEdited?(prior.get(record.targetSlug)?.sha256??digest):digest,stagedSha256:digest,librarySha256:locallyEdited?currentHash:digest,locallyEdited,batch});
 }
}
fs.writeFileSync(path.join(destination,'..','library-manifest.json'),JSON.stringify({count:entries.length,entries},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({count:entries.length,bySource:entries.reduce((counts,r)=>(counts[r.source]=(counts[r.source]??0)+1,counts),{})}));
