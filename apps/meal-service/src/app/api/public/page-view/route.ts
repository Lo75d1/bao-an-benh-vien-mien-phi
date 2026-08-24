import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordPublicPageView } from "@/lib/public-page-views";

const COOKIE_NAME = "suat_an_public_visitor";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) return NextResponse.json({ ok: false }, { status: 403 });
  const visitorId = request.cookies.get(COOKIE_NAME)?.value ?? randomUUID();
  await recordPublicPageView(visitorId);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, visitorId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 400 });
  return response;
}
