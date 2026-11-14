import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  isOwnerApiRoute,
  isProtectedPage,
  SIGN_IN_URL,
  SIGN_UP_URL,
} from "@/lib/auth/routes";

// Clerk reads the session on every matched request. Signed-out requests to
// owner pages are redirected to sign-in; to owner API routes they get a 401.
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

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
