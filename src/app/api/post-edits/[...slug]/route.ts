import fs from 'node:fs';
import {NextResponse} from 'next/server';
import {isAuthenticated} from '@/lib/auth';
import {getPrivateHtmlFile} from '@/lib/posts';
import {postRevision,reviseHtml,savePrivateRevision} from '@/lib/post-editing.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{slug:string[]}>}){
 if(!(await isAuthenticated()))return new NextResponse('Authentication required',{status:401});
 if(process.env.BLOG_ENABLE_POST_EDITING!=='true')return new NextResponse('Editing disabled',{status:403});
 const origin=request.headers.get('origin');
 if(!origin||new URL(origin).host!==request.headers.get('host'))return new NextResponse('Invalid origin',{status:403});
 const slug=(await params).slug.join('/');const file=getPrivateHtmlFile(slug);
 if(!file||!process.env.BLOG_PRIVATE_POSTS_DIR)return new NextResponse('Not found',{status:404});
 const form=await request.formData();const source=fs.readFileSync(file,'utf8');
 if(form.get('revision')!==postRevision(source))return new NextResponse('다른 수정이 반영되었습니다. 수정 화면을 다시 열어주세요.',{status:409});
 const title=form.get('title'),html=form.get('html');
 if(typeof title!=='string'||typeof html!=='string')return new NextResponse('제목과 본문이 필요합니다.',{status:400});
 try{const updated=reviseHtml(source,{title,html});savePrivateRevision(file,source,updated,process.env.BLOG_PRIVATE_POSTS_DIR);}
 catch{return new NextResponse('저장하지 못했습니다. 본문 HTML을 확인하고 수정 화면을 다시 열어주세요.',{status:400});}
 return NextResponse.redirect(new URL('/html-posts/'+slug.split('/').map(encodeURIComponent).join('/'),request.url),303);
}
