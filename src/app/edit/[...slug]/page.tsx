import fs from 'node:fs';
import {notFound,redirect} from 'next/navigation';
import Link from 'next/link';
import {isAuthenticated} from '@/lib/auth';
import {getPrivateHtmlFile} from '@/lib/posts';
import {editableHtml} from '@/lib/post-editing.mjs';
export const dynamic='force-dynamic';
export default async function EditPost({params}:{params:Promise<{slug:string[]}>}){
 const slug=(await params).slug.join('/');const encoded=slug.split('/').map(encodeURIComponent).join('/');
 if(!(await isAuthenticated()))redirect('/login?next='+encodeURIComponent('/edit/'+encoded));
 if(process.env.BLOG_ENABLE_POST_EDITING!=='true')notFound();
 const file=getPrivateHtmlFile(slug);if(!file)notFound();
 const post=editableHtml(fs.readFileSync(file,'utf8'));
 return <main className="mx-auto max-w-5xl p-6 text-gray-200">
  <Link href={'/html-posts/'+encoded} className="text-teal-400">← 글로 돌아가기</Link>
  <h1 className="my-5 text-2xl font-bold">HTML 글 수정</h1>
  <p className="mb-5 text-sm text-gray-400">제목과 본문 HTML을 수정할 수 있습니다. 이미지·코드·표의 태그는 유지해주세요. 저장하면 비공개 수정본에 반영하며, 이전 버전을 보관합니다.</p>
  <form method="post" action={'/api/post-edits/'+encoded} className="space-y-5">
   <input type="hidden" name="revision" value={post.revision}/>
   <label className="block">제목<input name="title" required defaultValue={post.data.title} className="mt-2 block w-full rounded border border-gray-600 bg-gray-950 p-3"/></label>
   <label className="block">본문 HTML<textarea name="html" required defaultValue={post.html} rows={28} spellCheck={false} className="mt-2 block w-full rounded border border-gray-600 bg-gray-950 p-3 font-mono text-sm"/></label>
   <button type="submit" className="rounded bg-teal-700 px-5 py-3 font-semibold text-white">수정 저장</button>
  </form>
 </main>;
}
