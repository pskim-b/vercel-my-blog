import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {editableHtml,reviseHtml,savePrivateRevision} from '../src/lib/post-editing.mjs';
import {parseContent} from '../src/lib/content.mjs';
const source='<!--\n---\ntitle: "Original"\ndate: "2001-03-02"\ncategory: "old"\nlabel: ["tistory"]\nscope: "private"\ndescription: "Old text"\nmigration: {"source":"tistory","originalUrl":"https://example.com/old","originalPublishedAt":"2001-03-02","importedAt":"2026-11-08T00:00:00Z"}\n---\n-->\n<!doctype html><html><head><title>Original</title><style>p{color:red}</style></head><body><h1>Original</h1><div class="article-view"><p>Old text</p><img src="data:image/png;base64,AA=="><pre>  code\n</pre></div></body></html>';
test('editing preserves original metadata and surrounding styles while updating title/body/description',()=>{
 const edit=editableHtml(source);assert.ok(edit.html.includes('data:image/png'));
 const updated=reviseHtml(source,{title:'Edited',html:edit.html.replace('Old text','Revised text')});
 const parsed=parseContent(updated,'html');assert.equal(parsed.data.title,'Edited');assert.equal(parsed.data.date,'2001-03-02');assert.deepEqual(parsed.data.migration,parseContent(source,'html').data.migration);
 assert.ok(parsed.content.includes('<style>p{color:red}</style>'));assert.ok(parsed.content.includes('<h1>Edited</h1>'));assert.ok(parsed.content.includes('<pre>  code\n</pre>'));assert.ok(parsed.data.description.startsWith('Revised text'));
 assert.throws(()=>reviseHtml(source,{title:'A',html:'<script>alert(1)</script>'}));
});
test('private saves keep a revision and refuse stale or out-of-root writes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'post-edit-'));const posts=path.join(root,'posts');fs.mkdirSync(posts);const file=path.join(posts,'one.html');fs.writeFileSync(file,source);
 try{const next=reviseHtml(source,{title:'Edited',html:'<p>New</p>'});savePrivateRevision(file,source,next,posts);assert.equal(fs.readFileSync(file,'utf8'),next);assert.equal(fs.readdirSync(path.join(root,'revisions')).length,1);assert.throws(()=>savePrivateRevision(file,source,next,posts));assert.throws(()=>savePrivateRevision(file,next,source,path.join(root,'revisions')));}finally{fs.rmSync(root,{recursive:true,force:true});}
});
