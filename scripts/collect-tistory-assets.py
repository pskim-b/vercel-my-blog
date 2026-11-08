"""Collect a Tistory backup and its referenced assets into an external private directory."""
import argparse, concurrent.futures, hashlib, html, io, ipaddress, json, os, re, shutil, socket, subprocess
from pathlib import Path
from urllib.parse import urlsplit, urljoin, quote
from zipfile import ZipFile
from PIL import Image

parser=argparse.ArgumentParser()
parser.add_argument('--archive',required=True)
parser.add_argument('--workdir',required=True)
args=parser.parse_args()
work=Path(args.workdir).resolve()
repo=Path(__file__).resolve().parents[1]
if work==repo or repo in work.parents:raise SystemExit('Private working directory must be outside the public repository')
work.mkdir(parents=True,exist_ok=True,mode=0o700)
os.umask(0o077)
raw=work/'raw';raw.mkdir(exist_ok=True,mode=0o700)
archive=Path(args.archive)
sha=lambda b:hashlib.sha256(b).hexdigest()
archive_sha=sha(archive.read_bytes())
if archive_sha!=json.loads((work/'summary.json').read_text())['archiveSha256']:raise SystemExit('Archive checksum changed')
if not(raw/'source.zip').exists():shutil.copyfile(archive,raw/'source.zip')
with ZipFile(archive)as z:
    if z.testzip():raise SystemExit('ZIP CRC failure')
    for info in z.infolist():
        if info.is_dir():continue
        dest=(raw/info.filename).resolve()
        if raw.resolve() not in dest.parents:raise SystemExit('Unsafe archive path')
        dest.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
        data=z.read(info)
        if not dest.exists()or sha(dest.read_bytes())!=sha(data):dest.write_bytes(data)

inventory=json.loads((work/'inventory.json').read_text())
audit=json.loads((work/'asset-audit.json').read_text())
cache=work/'assets';cache.mkdir(exist_ok=True,mode=0o700)
index_file=work/'assets-index.json'
index=json.loads(index_file.read_text())if index_file.exists()else{}
for ref in inventory['remoteReferences']:
    if ref['tag']=='iframe':index.pop('https:'+ref['value']if ref['value'].startswith('//')else ref['value'],None)
url_re=re.compile(r'''url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)''',re.I)

def public_url(url):
    parsed=urlsplit(url)
    if parsed.scheme not in ['http','https']or not parsed.hostname or parsed.username or parsed.password:raise ValueError('Unsupported resource URL')
    if '.'not in parsed.hostname:raise ValueError('Non-public hostname')
    for entry in socket.getaddrinfo(parsed.hostname,parsed.port or(443 if parsed.scheme=='https'else 80),type=socket.SOCK_STREAM):
        if not ipaddress.ip_address(entry[4][0]).is_global:raise ValueError('Non-public network address')
    return parsed

def media(data,ctype):
    if data.startswith(b'%PDF-'):return 'application/pdf','pdf'
    for magic,mime,ext in [(b'wOFF','font/woff','woff'),(b'wOF2','font/woff2','woff2'),(b'\x00\x01\x00\x00','font/ttf','ttf'),(b'OTTO','font/otf','otf')]:
        if data.startswith(magic):return mime,ext
    try:
        image=Image.open(io.BytesIO(data));image.verify()
        return Image.MIME.get(image.format,'image/'+image.format.lower()),image.format.lower()
    except Exception:pass
    if b'<svg'in data[:1000]and b'<html'not in data[:1000]:return 'image/svg+xml','svg'
    if'css'in ctype or (b'@font-face'in data or b'font-family'in data)and b'<html'not in data[:1000]:return 'text/css','css'
    if data.startswith(b'PK\x03\x04'):return 'application/zip','zip'
    if data.startswith(b'\x1f\x8b'):return 'application/gzip','gz'
    raise ValueError('Unexpected or invalid resource content: '+ctype)

def fetch(url):
    url=html.unescape(url)
    if url.startswith('//'):url='https:'+url
    prior=index.get(url)
    if prior and prior.get('status')=='downloaded'and(work/prior['file']).exists():return url,prior
    key=sha(url.encode());temp=cache/(key+'.part')
    result={'originalUrl':url,'status':'failed'}
    try:
        public_url(url)
        request_url=quote(url,safe=":/?&=%+#@,;!$'()*[]")
        cmd=['curl','--globoff','--fail','--silent','--show-error','--max-time','15','--connect-timeout','5','--max-filesize',str(30*1024*1024),'--proto','=http,https','-A','Mozilla/5.0 (compatible; personal archive migration)','-o',str(temp),'-w','%{http_code}\n%{content_type}\n%{redirect_url}',request_url]
        effective=url
        for attempt in range(6):
            proc=subprocess.run(cmd[:-1]+[quote(effective,safe=":/?&=%+#@,;!$'()*[]")],capture_output=True,text=True,timeout=18)
            lines=proc.stdout.splitlines();code=int(lines[0])if lines else 0
            if 300<=code<400 and len(lines)>2 and lines[2]:
                effective=urljoin(effective,lines[2]);public_url(effective);continue
            if proc.returncode:raise ValueError(f'HTTP {code}; '+proc.stderr[:250])
            ctype=lines[1]if len(lines)>1 else''
            data=temp.read_bytes();mime,ext=media(data,ctype)
            name=f'assets/{key}.{ext}';dest=work/name
            temp.replace(dest)
            result.update(status='downloaded',effectiveUrl=effective,mime=mime,file=name,bytes=len(data),sha256=sha(data))
            break
        else:raise ValueError('Too many redirects')
    except Exception as err:result['error']=str(err)[:350]
    finally:
        if temp.exists():temp.unlink()
    return url,result

urls={r['value']for r in inventory['remoteReferences']if r['tag']!='iframe'}
urls.update(r['value']for r in audit['additionalReferences']if r['location']=='remote')
# Preserve file attachments as sidecars; keep the original document links too.
urls.update(r['href']for r in audit['hyperlinks']if r['attachmentCandidate'])
for round in range(3):
    pending=sorted(u for u in urls if html.unescape('https:'+u if u.startswith('//')else u)not in index)
    if not pending:break
    with concurrent.futures.ThreadPoolExecutor(max_workers=6)as pool:
        for url,result in pool.map(fetch,pending):index[url]=result
    index_file.write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
    for result in list(index.values()):
        if result.get('mime')!='text/css'or result['status']!='downloaded':continue
        css=(work/result['file']).read_text(errors='replace')
        for match in url_re.finditer(css):
            value=next(x for x in match.groups()if x is not None).strip()
            if not value.startswith('data:'):urls.add(urljoin(result.get('effectiveUrl',result['originalUrl']),value))

# Match the missing Open Sans WOFF references to the corresponding downloaded font definitions.
font_map={}
for result in list(index.values()):
    if result.get('mime')!='text/css'or result['status']!='downloaded':continue
    css=(work/result['file']).read_text(errors='replace')
    for block in re.findall(r'@font-face\s*\{[^}]+\}',css):
        def val(name):
            m=re.search(name+r'\s*:\s*([^;]+)',block);return m[1].strip().strip('"\'')if m else''
        if val('font-family')!='Open Sans':continue
        weight=val('font-weight');style=val('font-style')
        if weight not in ['400','700']or style not in ['normal','italic']:continue
        matches=list(url_re.finditer(block))
        if not matches:continue
        font_url=urljoin(result.get('effectiveUrl',result['originalUrl']),next(x for x in matches[0].groups()if x is not None))
        if index.get(font_url,{}).get('status')=='downloaded':font_map[weight+('i'if style=='italic'else'')+'.woff']=font_url
(work/'font-recovery.json').write_text(json.dumps({'method':'same-family/style/weight from the export-referenced Google Fonts stylesheet; original missing WOFF bytes cannot be certified identical','fonts':font_map},indent=2)+'\n')

# Source publication-time evidence from already known public IDs only.
known={'12','16','19'}
evidence=[]
for record in inventory['records']:
    if record['originalId']not in known:continue
    url=record['originalUrlCandidate'];dest=cache/('publication-evidence-'+record['originalId']+'.html')
    proc=subprocess.run(['curl','--fail','--silent','--show-error','--location','--max-time','15','--proto','=http,https','--proto-redir','=http,https','-o',str(dest),url],capture_output=True,text=True)
    entry={'originalId':record['originalId'],'exportDateRaw':record['originalDateRaw'],'url':url}
    if proc.returncode==0:
        source=dest.read_text(errors='replace')
        entry['publishedDateCandidates']=re.findall(r'''(?:datePublished|published_time|dateCreated)["']?\s*(?:content=|[=:])\s*["']([^"']+)''',source)
        entry['dateMeta']=re.findall(r'''<meta[^>]+(?:published|datePublished)[^>]+>''',source,re.I)
        entry['tistoryEntryDate']=re.findall(r'''["']date["']\s*:\s*["'](\d{4}[^"']+)["']''',source)[:3]
        entry['isoTimestamps']=sorted(set(re.findall(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})',source)))[:8]
    else:entry['error']=proc.stderr[:150]
    evidence.append(entry)
(work/'publication-evidence.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'resources':len(index),'downloaded':sum(v['status']=='downloaded'for v in index.values()),'failed':sum(v['status']=='failed'for v in index.values()),'recoveredFontStyles':list(font_map),'publicationEvidence':evidence},ensure_ascii=False,indent=2))
