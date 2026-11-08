"""Inventory Hugo TOML source metadata without executing source templates or scripts."""
import argparse,hashlib,json,re
from collections import Counter
from pathlib import Path
from datetime import datetime,date
try:import tomllib
except ImportError:import tomli as tomllib
p=argparse.ArgumentParser();p.add_argument('--workdir',required=True);args=p.parse_args();base=Path(args.workdir).resolve()
if base==Path.cwd()or Path.cwd()in base.parents:raise SystemExit('Use an external private workdir')
src=base/'raw/source';pub=base/'raw/published';rows=[]
for folder in ['content','working']:
 for file in sorted((src/folder).rglob('*')):
  if not file.is_file()or file.suffix.lower()not in['.md','.markdown','.html']:continue
  source=file.read_text();parts=source.split('+++',2)
  if len(parts)!=3:raise ValueError('Unknown Hugo frontmatter format')
  metadata=tomllib.loads(parts[1]);body=parts[2].lstrip('\n')
  rows.append({'sourcePath':str(file.relative_to(src)),'metadata':metadata,'rawFrontmatter':parts[1],
   'bodySha256':hashlib.sha256(body.encode()).hexdigest(),'sourceSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'bodyLength':len(body),
   'fencedCodeBlocks':len(re.findall(r'^```[^\n]*$',body,re.M))//2})
cfg=tomllib.loads((src/'config.toml').read_text())
report={'config':cfg,'documents':rows}
(base/'source-inventory.json').write_text(json.dumps(report,ensure_ascii=False,default=lambda x:x.isoformat()if isinstance(x,(datetime,date))else str(x),indent=2)+'\n');(base/'source-inventory.json').chmod(0o600)
print(json.dumps({'rows':len(rows),'content':sum(r['sourcePath'].startswith('content/')for r in rows),'working':sum(r['sourcePath'].startswith('working/')for r in rows),
 'metadataKeys':dict(Counter(k for r in rows for k in r['metadata'])),'draftValues':dict(Counter(str(r['metadata'].get('draft','absent'))for r in rows)),
 'categories':dict(Counter(str(r['metadata'].get('categories'))for r in rows)),'workingDateFlags':[{k:r['metadata'].get(k)for k in ['date','draft','publishDate','url','slug']}for r in rows if r['sourcePath'].startswith('working/')],
 'publicPostHTML':len(list((pub/'posts').rglob('index.html'))),'routeConfig':{k:cfg.get(k)for k in ['baseURL','permalinks','disablePathToLower','uglyURLs']}},default=str,ensure_ascii=False,indent=2))
