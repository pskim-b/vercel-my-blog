import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "blog_auth";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

function getConfiguredPasswordHash() {
  if (process.env.BLOG_AUTH_PASSWORD_HASH) {
    return process.env.BLOG_AUTH_PASSWORD_HASH.trim().toLowerCase();
  }

  if (process.env.BLOG_AUTH_PASSWORD) {
    return sha256(process.env.BLOG_AUTH_PASSWORD);
  }

  return "";
}

function getCookieSecret() {
  return (
    process.env.BLOG_AUTH_SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    getConfiguredPasswordHash()
  );
}

function signSession() {
  const secret = getCookieSecret();
  if (!secret) return null;

  return createHmac("sha256", secret).update("blog-auth-v1").digest("hex");
}

export function verifyPassword(password: string) {
  const configuredHash = getConfiguredPasswordHash();
  if (!configuredHash) return false;

  return safeEqual(sha256(password), configuredHash);
}

export function createAuthCookieValue() {
  const signature = signSession();
  return signature ? `v1.${signature}` : "";
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  const expectedValue = createAuthCookieValue();
  if (!cookieValue || !expectedValue) return false;

  return safeEqual(cookieValue, expectedValue);
}
