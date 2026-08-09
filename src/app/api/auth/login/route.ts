import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createAuthCookieValue, verifyPassword } from "@/lib/auth";

function safeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = form.get("password");
  const next = safeNextPath(form.get("next"));

  if (typeof password !== "string" || !verifyPassword(password)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", next);
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, 303);
  }

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(AUTH_COOKIE_NAME, createAuthCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
