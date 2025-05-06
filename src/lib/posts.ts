import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const postsDirectory = path.join(process.cwd(), 'posts');

export function getPostSlugs() {
  return fs.readdirSync(postsDirectory).map((file) => file.replace(/\.md$/, ''));
}

export function getPostBySlug(slug: string) {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);
  return {
    slug,
    title: data.title,
    date: data.date,
    content,
  };
}

export async function getPostHtml(slug: string) {
  const { title, date, content } = getPostBySlug(slug);
  const processed = await remark().use(html).process(content);
  return {
    slug,
    title,
    date,
    contentHtml: processed.toString(),
  };
}
