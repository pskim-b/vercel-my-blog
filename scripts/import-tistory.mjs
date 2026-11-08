import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'parse5';
import { parseContent } from '../src/lib/content.mjs';
import { taxonomy } from '../src/lib/taxonomy.mjs';
import { validateTistoryTaxonomy } from '../src/lib/tistory-taxonomy.mjs';

const args = process.argv.slice(2);
const workArg = args[args.indexOf('--workdir') + 1];
if (!args.includes('--workdir') || !path.isAbsolute(workArg)) throw new Error('--workdir needs an external absolute path');
const work = fs.realpathSync(workArg);
if (work === process.cwd() || work.startsWith(process.cwd() + path.sep)) throw new Error('Private staging must stay outside the public repository');
process.umask(0o077);
const read = file => JSON.parse(fs.readFileSync(path.join(work, file), 'utf8'));
const inventory = read('inventory.json');
const assets = read('assets-index.json');
const fonts = read('font-recovery.json').fonts;
const evidence = read('publication-evidence.json');
const assignments = fs.existsSync(path.join(work, 'taxonomy-assignments.json')) ? read('taxonomy-assignments.json').entries : {};
const timezoneVerified = evidence.length >= 3 && evidence.every(e => e.publishedDateCandidates?.includes(e.exportDateRaw.replace(' ', 'T') + '+09:00'));
if (!timezoneVerified) throw new Error('Original publication time and timezone are not corroborated');
const out = path.join(work, 'staged/posts/tistory');
fs.mkdirSync(out, { recursive: true, mode: 0o700 });
const hash = text => createHash('sha256').update(text).digest('hex');
const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;
const cls = (node, name) => (attr(node, 'class') ?? '').split(/\s+/).includes(name);
function nodes(node) { return [node, ...(node.childNodes ?? []).flatMap(nodes), ...(node.content ? nodes(node.content) : [])]; }
function text(node) {
  if (!node || ['style','script'].includes(node.tagName) || attr(node, 'data-migration-added')) return '';
  return node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(text).join('');
}
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const cssUrls = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)(?:\s*format\([^)]*\))?/gi;
const newAssets = new Map();
const previousLedger = fs.existsSync(path.join(work, 'migration-ledger.json')) ? read('migration-ledger.json') : null;
const importedAt = inventory.importedAt ?? previousLedger?.summary.importedAt ?? new Date().toISOString();
const records = [];
for (const record of inventory.records) {
  const original = fs.readFileSync(path.join(work, 'raw', record.exportPath), 'utf8').replace(/^\uFEFF/, '');
  if (hash(fs.readFileSync(path.join(work, 'raw', record.exportPath))) !== record.htmlSha256) throw new Error('Source file changed');
  const tree = parse(original, { sourceCodeLocationInfo: true });
  const all = nodes(tree);
  const sourceBody = all.find(n => cls(n, 'article-view'));
  const edits = [];
  const resourceLog = [];
  const failures = [];
  const videos = [];
  function asset(value, sourcePath, kind) {
    if (!value || value.startsWith('#') || /^data:/i.test(value)) return { value, kind: 'embedded-or-fragment' };
    let result;
    let originalUrl;
    if (/^(https?:)?\/\//i.test(value)) {
      originalUrl = value.startsWith('//') ? 'https:' + value : value;
      result = assets[originalUrl];
    } else if (/^[a-z][a-z\d+.-]*:/i.test(value)) return { value, kind: 'other-scheme' };
    else {
      const clean = decodeURIComponent(value.split(/[?#]/)[0]);
      const location = path.resolve(work, 'raw', path.posix.dirname(sourcePath), clean).normalize('NFC');
      if (!location.startsWith(path.join(work, 'raw') + path.sep)) throw new Error('Resource path escapes raw archive');
      if (fs.existsSync(location)) {
        const data = fs.readFileSync(location);
        const extension = path.extname(location).toLowerCase();
        const mime = ({ '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.css':'text/css' })[extension];
        result = mime ? { status:'downloaded', file:path.relative(work,location), mime, sha256:hash(data), bytes:data.length } : undefined;
      } else if (fonts[path.basename(clean)]) {
        originalUrl = fonts[path.basename(clean)]; result = assets[originalUrl];
      }
    }
    if (result?.status === 'downloaded') {
      const data = fs.readFileSync(path.join(work, result.file));
      if (hash(data) !== result.sha256) throw new Error('Cached asset checksum mismatch');
      resourceLog.push({ original:value, sourcePath, kind, mime:result.mime, file:result.file, sha256:result.sha256, bytes:result.bytes,
        ...(originalUrl ? { resolvedUrl:originalUrl } : {}),
        ...(result.recoveryMethod ? { recoveryMethod:result.recoveryMethod, archiveTimestamp:result.archiveTimestamp, requiresVisualReview:true } : {}) });
      newAssets.set(result.sha256, { file:result.file, bytes:result.bytes });
      return { value:`data:${result.mime};base64,${data.toString('base64')}`, mime:result.mime, result };
    }
    failures.push({ original:value, sourcePath, kind, reason:result?.error ?? 'Resource unavailable in archive/cache' });
    return { value, kind:'unresolved' };
  }
  function css(source, sourcePath) {
    return source.replace(cssUrls, (full, quoted, single, bare) => {
      const value = (quoted ?? single ?? bare).trim();
      const resolved = asset(value, sourcePath, 'css-url');
      if (resolved.value === value) return full;
      const format = ({ 'font/ttf':'truetype','font/otf':'opentype','font/woff':'woff','font/woff2':'woff2' })[resolved.mime];
      return `url("${resolved.value}")${format ? ` format("${format}")` : ''}`;
    });
  }
  for (const n of all) {
    const loc = n.sourceCodeLocation;
    if (!loc) continue;
    if (n.tagName === 'link' && attr(n,'rel') === 'stylesheet') {
      const source = attr(n,'href');
      const resolved = asset(source, record.exportPath, 'stylesheet');
      if (resolved.result?.mime === 'text/css') {
        let style = fs.readFileSync(path.join(work, resolved.result.file), 'utf8');
        // Nested remote stylesheet URLs are resolved to their effective URL before embedding.
        if (/^(https?:)?\/\//i.test(source)) {
          style = style.replace(cssUrls, (full,a,b,c) => {
            const value = (a ?? b ?? c).trim();
            return /^data:|^#/.test(value) ? full : full.replace(value, new URL(value, resolved.result.effectiveUrl ?? source).href);
          });
        }
        const stylePath = resolved.result.file.startsWith('raw/') ? resolved.result.file.slice(4) : record.exportPath;
        edits.push({ start:loc.startOffset, end:loc.endOffset, text:`<style data-migration-stylesheet="true">${css(style,stylePath).replace(/<\/style/gi,'<\\/style')}</style>` });
      }
      continue;
    }
    if (n.tagName === 'iframe') {
      const url = attr(n,'src');
      videos.push({ url, provider: /youtube/.test(url ?? '') ? 'youtube' : 'other', status:'preserved-in-source-but-blocked-by-current-viewer-policy' });
      continue;
    }
    for (const a of n.attrs ?? []) {
      const location = loc.attrs?.[a.name];
      if (!location) continue;
      let value = a.value;
      if (['src','data-src','poster','background'].includes(a.name)) value = asset(value, record.exportPath, `${n.tagName}-${a.name}`).value;
      else if (a.name === 'style') value = css(value, record.exportPath);
      else if (a.name === 'srcset') {
        if (!value.trim().startsWith('data:')) value = value.split(',').map(candidate => {
          const match = candidate.trim().match(/^(.*?)(\s+\d+(?:\.\d+)?[wx])?$/);
          return asset(match[1],record.exportPath,`${n.tagName}-srcset`).value + (match[2] ?? '');
        }).join(', ');
      } else if (n.tagName === 'a' && a.name === 'href' && !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) {
        const file = path.resolve(work,'raw',path.posix.dirname(record.exportPath),decodeURIComponent(value.split(/[?#]/)[0]));
        if (fs.existsSync(file) && /\.(png|jpe?g)$/i.test(file)) value = asset(value,record.exportPath,'image-link').value;
      }
      if (value !== a.value) edits.push({ start:location.startOffset, end:location.endOffset, text:`${a.name}="${escape(value)}"` });
    }
    if (n.tagName === 'style' && loc.endTag) {
      const value = original.slice(loc.startTag.endOffset,loc.endTag.startOffset);
      const replacement = css(value,record.exportPath);
      if (replacement !== value) edits.push({ start:loc.startTag.endOffset, end:loc.endTag.startOffset, text:replacement });
    }
    if (attr(n,'data-ke-type') === 'moreLess') {
      edits.push({ start:loc.startOffset,end:loc.startOffset,text:'<details open class="migration-details"><summary data-migration-added="true">원문 접기 / 펼치기</summary>' });
      edits.push({ start:loc.endOffset,end:loc.endOffset,text:'</details>' });
    }
    if (n.tagName === 'table') {
      let parent=n.parentNode; let nested=false;
      while (parent) { if (parent.tagName === 'table') nested=true;parent=parent.parentNode; }
      if (!nested) {
        edits.push({start:loc.startOffset,end:loc.startOffset,text:'<div class="migration-table-scroll">'});
        edits.push({start:loc.endOffset,end:loc.endOffset,text:'</div>'});
      }
    }
  }
  const sourceCounts = Object.fromEntries(['img','table','pre','code','iframe'].map(tag => [tag,all.filter(n=>n.tagName===tag).length]));
  const pending = [...(failures.length ? ['unresolved-resources'] : []),...(videos.length ? ['embedded-video-playback'] : [])];
  const status = pending.length ? 'staged-with-content-blockers' : 'staged-content-validated';
  const body = all.find(n=>n.tagName==='body');
  const controls = `<style>.migration-review-note{box-sizing:border-box;padding:12px 20px;background:#fff7dc;color:#593f06;border-bottom:1px solid #dfc577;font:14px/1.6 system-ui,sans-serif;overflow-wrap:anywhere}.migration-review-note a{color:#805600}.migration-table-scroll{max-width:100%;overflow-x:auto}.migration-details .moreless-content{display:block!important}.migration-details .btn-toggle-moreless{display:none!important}.migration-details>summary{cursor:pointer;padding:8px;color:#555}.article-view img{max-width:100%;height:auto}@media(max-width:1120px){body{min-width:0!important}#wrap,#container,.area-main,.area-view,.main,.inner-article-header{box-sizing:border-box;width:100%!important;min-width:0!important;max-width:100%!important;margin-left:0!important;margin-right:0!important}.area-main,.area-view,.inner-article-header{padding-left:16px!important;padding-right:16px!important}.title-article{white-space:normal!important;overflow-wrap:anywhere}.article-view{min-width:0;overflow-wrap:anywhere}.article-view pre{max-width:100%;overflow-x:auto}.article-view iframe{max-width:100%}}</style>`;
  const note = `<aside class="migration-review-note" data-migration-added="true">비공개 이관 검토본 · 공개 상태 확인 대기${failures.length ? ` · 복구가 필요한 자원 참조 ${failures.length}개` : ' · 이미지·표·코드 정적 검증 통과'}${videos.length ? ` · 영상 ${videos.length}개는 현재 뷰어에서 재생되지 않습니다.` : ''}${videos.length ? '<details><summary>보존된 영상 원본 링크</summary>'+videos.map((v,i)=>`<a href="${escape(v.url)}" rel="noreferrer">영상 ${i+1}</a>`).join(' · ')+'</details>' : ''}</aside>`;
  if (!body?.sourceCodeLocation?.startTag) throw new Error('Missing original body tag');
  // Some exports put a meta tag before <html>, so their parsed head has no source location.
  edits.push({start:body.sourceCodeLocation.startTag.endOffset,end:body.sourceCodeLocation.startTag.endOffset,text:controls+note});
  let converted=original;
  let boundary=Infinity;
  for (const e of edits.sort((a,b)=>b.start-a.start || b.end-a.end)) {
    if (e.end>boundary && e.start!==e.end) throw new Error('Overlapping HTML edit');
    converted=converted.slice(0,e.start)+e.text+converted.slice(e.end);boundary=e.start;
  }
  const targetNodes=nodes(parse(converted));
  const targetBody=targetNodes.find(n=>cls(n,'article-view'));
  if (text(sourceBody)!==text(targetBody)) throw new Error(`Article ${record.originalId}: source text changed`);
  const targetCounts=Object.fromEntries(Object.keys(sourceCounts).map(tag=>[tag,targetNodes.filter(n=>n.tagName===tag).length]));
  if (JSON.stringify(sourceCounts)!==JSON.stringify(targetCounts)) throw new Error('Content element counts changed');
  for (const tag of ['pre','code','table']) {
    const before=all.filter(n=>n.tagName===tag).map(text);
    const after=targetNodes.filter(n=>n.tagName===tag).map(text);
    if (JSON.stringify(before)!==JSON.stringify(after)) throw new Error(`${tag} content changed`);
  }
  const date=record.originalDateRaw.replace(' ','T')+'+09:00';
  const labels=record.originalTagsRaw.split(/\s*#/).map(v=>v.trim()).filter(Boolean);
  const assignment=assignments[record.originalId];
  if (assignment) assignment.target=validateTistoryTaxonomy(assignment.target,taxonomy);
  const metadata={ title:record.title,date,category:record.originalCategory || 'tistory',label:[...new Set([...labels,'tistory',...(assignment?.addLabels ?? [])])],scope:'private',
    description:text(sourceBody).replace(/\s+/g,' ').trim().slice(0,140) || record.title,
    migration:{source:'tistory',originalUrl:record.originalUrlCandidate,originalPath:`/${record.originalId}`,originalId:record.originalId,
      sourcePath:record.exportPath,originalPublishedAt:date,originalDateRaw:record.originalDateRaw,originalCategory:record.originalCategory,
      originalTags:labels,sourceVisibility:'unknown',importedAt,archiveSha256:inventory.summary.archiveSha256,
      timezoneEvidence:'publication-evidence.json: IDs 12,16,19 match article:published_time with +09:00',verificationStatus:status,contentBlockers:pending,
      ...(assignment ? { taxonomy:assignment.target, taxonomyRule:assignment.rule } : {})} };
  const header=Object.entries(metadata).map(([key,value])=>`${key}: ${JSON.stringify(value)}`).join('\n');
  const output=`<!--\n---\n${header}\n---\n-->\n${converted}`;
  const parsed=parseContent(output,'html');
  if (parsed.data.label.includes('ai-generated')||parsed.data.label.includes('ai-generate')||!parsed.data.label.includes('tistory')) throw new Error('Invalid provenance labels');
  const file=path.join(out,`${record.originalId}.html`);
  fs.writeFileSync(file,output,{mode:0o600});
  records.push({originalId:record.originalId,originalUrl:record.originalUrlCandidate,sourcePath:record.exportPath,targetSlug:`tistory/${record.originalId}`,
    targetUrl:`/posts/tistory/${record.originalId}`,targetFile:path.relative(work,file),date,scope:'private',sourceVisibility:'unknown',status,contentBlockers:pending,
    sourceHtmlSha256:record.htmlSha256,targetSha256:hash(output),bodyTextSha256:hash(text(targetBody)),sourceCounts,targetCounts,
    assets:resourceLog,unresolvedResources:failures,videos,originalCategory:record.originalCategory,originalTitle:record.title,
    ...(assignment ? { taxonomy:assignment.target, taxonomyRule:assignment.rule } : {})});
}
const summary={observedOn:'2026-11-08',articleCount:records.length,allPrivate:records.every(r=>r.scope==='private'),
  sourceVisibilityUnverified:records.length,contentValidated:records.filter(r=>r.status==='staged-content-validated').length,
  contentBlocked:records.filter(r=>r.status==='staged-with-content-blockers').length,unresolvedResourceArticles:records.filter(r=>r.unresolvedResources.length).length,
  videoArticles:records.filter(r=>r.videos.length).length,unresolvedReferences:records.reduce((sum,r)=>sum+r.unresolvedResources.length,0),
  inlineAssetUniqueBytes:[...newAssets.values()].reduce((sum,r)=>sum+r.bytes,0),targetBytes:records.reduce((sum,r)=>sum+fs.statSync(path.join(work,r.targetFile)).size,0),
  originalTextAndElementCountsPreserved:true,missingIds:inventory.summary.missingIdsIn1To236,
  sourceArchiveSha256:inventory.summary.archiveSha256,importedAt,productionDeployment:'not-deployed'};
fs.writeFileSync(path.join(work,'migration-ledger.json'),JSON.stringify({summary,records},null,2)+'\n',{mode:0o600});
fs.writeFileSync(path.join(work,'migration-summary.json'),JSON.stringify(summary,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(summary,null,2));
