"""Download referenced public media into a private Hugo batch, retaining checksum evidence."""
import argparse,concurrent.futures,hashlib,io,ipaddress,json,re,socket,subprocess,os,shutil
from pathlib import Path
from urllib.parse import urlsplit,urljoin,quote
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--workdir',required=True);p.add_argument('--reuse-cache');a=p.parse_args();work=Path(a.workdir).resolve()
if work==Path.cwd()or Path.cwd()in work.parents:raise SystemExit('External private workdir required')
os.umask(0o077);(work/'assets').mkdir(exist_ok=True,mode=0o700)
discovery=json.loads((work/'import-inventory.json').read_text());file=work/'assets-index.json';index=json.loads(file.read_text())if file.exists()else{}
reuse=Path(a.reuse_cache)if a.reuse_cache else None
old=json.loads((reuse/'assets-index.json').read_text())if reuse and(reuse/'assets-index.json').exists()else{}
sha=lambda data:hashlib.sha256(data).hexdigest()
def allowed(url):
 u=urlsplit(url)
 if u.scheme not in['https','http']or not u.hostname or u.username or u.password or'.'not in u.hostname:raise ValueError('Unsupported public resource URL')
 for entry in socket.getaddrinfo(u.hostname,u.port or(443 if u.scheme=='https'else 80),type=socket.SOCK_STREAM):
  if not ipaddress.ip_address(entry[4][0]).is_global:raise ValueError('Non-public network address')
def mime(data,ctype):
 for magic,m,e in[(b'wOFF','font/woff','woff'),(b'wOF2','font/woff2','woff2'),(b'\0\1\0\0','font/ttf','ttf'),(b'OTTO','font/otf','otf'),(b'%PDF-','application/pdf','pdf')]:
  if data.startswith(magic):return m,e
 try:
  im=Image.open(io.BytesIO(data));im.verify();return Image.MIME.get(im.format,'image/'+im.format.lower()),im.format.lower()
 except Exception:pass
 if b'<svg'in data[:1000]and b'<html'not in data[:1000]:return'image/svg+xml','svg'
 if'css'in ctype or b'@font-face'in data:return'text/css','css'
 raise ValueError('Unexpected resource content: '+ctype)
def fetch(url):
 key=sha(url.encode());result={'originalUrl':url,'status':'failed'};tmp=work/'assets'/(key+'.part')
 try:
  previous=old.get(url)
  if previous and previous['status']=='downloaded':
   src=reuse/previous['file'];data=src.read_bytes()
   if sha(data)!=previous['sha256']:raise ValueError('Reused asset checksum mismatch')
   dest=work/'assets'/(key+src.suffix);shutil.copyfile(src,dest);return url,{**previous,'file':str(dest.relative_to(work)),'cacheReuse':'previous-private-migration-batch'}
  allowed(url);effective=url
  for _ in range(6):
   r=subprocess.run(['curl','--globoff','--fail','--silent','--show-error','--max-time','15','--connect-timeout','5','--max-filesize',str(30*1024*1024),'--proto','=http,https','-o',str(tmp),'-w','%{http_code}\n%{content_type}\n%{redirect_url}',quote(effective,safe=":/?&=%+#@,;!$'()*[]")],capture_output=True,text=True,timeout=18)
   lines=r.stdout.splitlines();code=int(lines[0])if lines else 0
   if 300<=code<400 and len(lines)>2 and lines[2]:effective=urljoin(effective,lines[2]);allowed(effective);continue
   if r.returncode:raise ValueError(f'HTTP {code}; '+r.stderr[:200])
   data=tmp.read_bytes();m,e=mime(data,lines[1]if len(lines)>1 else'');dest=work/'assets'/(key+'.'+e);tmp.replace(dest)
   result.update(status='downloaded',effectiveUrl=effective,mime=m,file=str(dest.relative_to(work)),bytes=len(data),sha256=sha(data));break
  else:raise ValueError('Too many redirects')
 except Exception as err:result['error']=str(err)[:300]
 finally:
  if tmp.exists():tmp.unlink()
 return url,result
urls={r['url']for r in discovery['resources']if r['status']=='remote'}
for _ in range(3):
 pending=sorted(u for u in urls if u not in index)
 if not pending:break
 with concurrent.futures.ThreadPoolExecutor(max_workers=5)as pool:
  for url,result in pool.map(fetch,pending):index[url]=result
 for result in list(index.values()):
  if result.get('mime')!='text/css'or result['status']!='downloaded':continue
  text=(work/result['file']).read_text(errors='replace')
  for match in re.finditer(r'''url\(\s*["']?([^)'"\s]+)["']?\s*\)''',text,re.I):
   if not match[1].startswith('data:'):urls.add(urljoin(result.get('effectiveUrl',result['originalUrl']),match[1]))
 file.write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'uniqueResources':len(index),'downloaded':sum(r['status']=='downloaded'for r in index.values()),'failed':sum(r['status']=='failed'for r in index.values())}))
