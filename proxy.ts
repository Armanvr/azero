import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "azero_session";

function getSecret(): Uint8Array {
  const raw = process.env.AZERO_SESSION_SECRET || "dev-only-fallback-secret-change-me-please-32";
  return new TextEncoder().encode(raw);
}

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, getSecret());
      valid = true;
    } catch {
      valid = false;
    }
  }

  const { pathname } = req.nextUrl;
  const isAuthPage = pathname.startsWith("/auth");

  if (!valid && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }
  if (valid && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"]
};
