"""Try public web-archive snapshots for missing unsigned image URLs; never send private post bodies."""
import argparse,concurrent.futures,hashlib,io,json,re,subprocess
from pathlib import Path
from urllib.parse import urlsplit,quote
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--workdir',required=True);args=p.parse_args()
work=Path(args.workdir).resolve()
if work==Path.cwd()or Path.cwd()in work.parents:raise SystemExit('Private workdir required')
index=json.loads((work/'assets-index.json').read_text())
ledger=json.loads((work/'migration-ledger.json').read_text())
urls=sorted({r['original']for row in ledger['records']for r in row['unresolvedResources']if r['original'].startswith(('http://','https://'))and not urlsplit(r['original']).query and re.search(r'\.(?:png|gif|jpe?g)$',urlsplit(r['original']).path,re.I)})

def recover(url):
    key=hashlib.sha256(url.encode()).hexdigest();meta=work/'assets'/('archive-'+key+'.json');output={'originalUrl':url,'status':'unavailable'}
    if meta.exists():return json.loads(meta.read_text())
    query='https://web.archive.org/cdx/search/cdx?url='+quote(url,safe='')+'&output=json&filter=statuscode:200&filter=mimetype:image/.*&collapse=digest&limit=1&fl=timestamp,original,mimetype'
    proc=subprocess.run(['curl','--fail','--silent','--show-error','--max-time','15',query],capture_output=True,text=True)
    try:
        if proc.returncode:raise ValueError(proc.stderr[:160])
        rows=json.loads(proc.stdout)
        if len(rows)<2:raise ValueError('No archived image snapshot')
        stamp,original,_=rows[1]
        snapshot='https://web.archive.org/web/'+stamp+'id_/'+original
        tmp=work/'assets'/(key+'.recovery')
        got=subprocess.run(['curl','--fail','--silent','--show-error','--location','--proto','=https,http','--proto-redir','=https,http','--max-time','20','--max-filesize',str(30*1024*1024),'-o',str(tmp),snapshot],capture_output=True,text=True)
        if got.returncode:raise ValueError(got.stderr[:160])
        data=tmp.read_bytes();image=Image.open(io.BytesIO(data));image.verify();mime=Image.MIME.get(image.format,'image/'+image.format.lower())
        dest=work/'assets'/(key+'.recovered-'+image.format.lower());tmp.replace(dest)
        output.update(status='downloaded',effectiveUrl=snapshot,archiveTimestamp=stamp,mime=mime,file=str(dest.relative_to(work)),bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),recoveryMethod='archived-original-image-url',requiresVisualReview=True)
    except Exception as err:output['error']=str(err)
    meta.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n');meta.chmod(0o600)
    return output
with concurrent.futures.ThreadPoolExecutor(max_workers=4)as pool:results=list(pool.map(recover,urls))
for result in results:
    if result['status']=='downloaded':index[result['originalUrl']]=result
(work/'assets-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
(work/'archive-recovery.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'attempted':len(results),'recovered':sum(r['status']=='downloaded'for r in results),'unavailable':sum(r['status']!='downloaded'for r in results)}))
