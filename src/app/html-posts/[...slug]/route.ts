import { NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/posts";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const post = getPostBySlug((await params).slug.join("/"));
  if (!post || post.meta.format !== "html") return new NextResponse("Not found", { status: 404 });
  if (!post.meta.isPublic && !(await isAuthenticated())) {
    return new NextResponse("Authentication required", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return new NextResponse(post.content, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      // Also sandbox direct visits, not just iframe embedding.
      "Content-Security-Policy": "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
    },
  });
}
