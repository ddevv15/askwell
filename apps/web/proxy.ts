import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
// Relative import (not "@/") so Vitest can load this file in the matcher test.
import {
  isOwnerApiRoute,
  isProtectedPage,
  SIGN_IN_URL,
  SIGN_UP_URL,
} from "./lib/auth/routes";

// Clerk reads the session on every matched request. Signed-out requests to
// owner pages are redirected to sign-in; to owner API routes (every /api path
// not on the public list) they get a 401.
// Each owner page and route handler still checks auth itself (defense in depth).
export default clerkMiddleware(
  async (auth, req) => {
    const { pathname } = req.nextUrl;
    if (!isProtectedPage(pathname) && !isOwnerApiRoute(pathname)) return;

    const { isAuthenticated, redirectToSignIn } = await auth();
    if (isAuthenticated) return;

    if (isOwnerApiRoute(pathname)) {
      return NextResponse.json(
        { error: { code: "unauthorized", message: "Sign in required." } },
        { status: 401 },
      );
    }
    return redirectToSignIn({ returnBackUrl: req.url });
  },
  { signInUrl: SIGN_IN_URL, signUpUrl: SIGN_UP_URL },
);

// The proxy never runs on the widget paths. /embed is framed cross-site on
// customers' sites and /api/widget/* takes cross-origin calls; Clerk's
// middleware would still run auth there (and can do handshake / dev-browser
// redirects on a dev instance), which breaks the iframe and wastes work.
// Those routes are public and don't need a session.
export const config = {
  matcher: [
    // Pages: skip Next.js internals, static files, and /embed
    "/((?!_next|api(?:/|$)|embed(?:/|$)|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // API: always run, except /api/widget
    "/api",
    "/api/((?!widget(?:/|$)).*)",
  ],
};
