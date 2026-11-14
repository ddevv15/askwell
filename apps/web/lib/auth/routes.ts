// Which paths need a signed-in owner, and where Clerk sends people.
// Pure functions so the public/protected split is unit tested (routes.test.ts).
// project.md §8: owner pages and owner API routes need a Clerk session;
// the widget, embed, landing page, sign-in/up and system routes stay public.

export const SIGN_IN_URL = "/sign-in";
export const SIGN_UP_URL = "/sign-up";
export const AFTER_AUTH_URL = "/dashboard";
export const AFTER_SIGN_OUT_URL = SIGN_IN_URL;

const PROTECTED_PAGE_PREFIXES = ["/dashboard"] as const;

// Every /api route needs a session unless it is listed here (deny by default),
// so a new owner route is never public by accident.
const PUBLIC_API_PREFIXES = [
  "/api/widget",
  "/api/clerk/webhook",
  "/api/posthog-config",
] as const;

/**
 * True when `pathname` is `prefix` itself or a path below it. Matches whole
 * segments, so `/api/widget` covers `/api/widget/chat` but not `/api/widgetx`.
 */
export function matchesSegmentPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function matchesAny(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => matchesSegmentPrefix(pathname, prefix));
}

/** Owner pages: signed-out visitors are redirected to sign-in. */
export function isProtectedPage(pathname: string): boolean {
  return matchesAny(pathname, PROTECTED_PAGE_PREFIXES);
}

/** Owner API routes (every /api path not on the public list): signed-out requests get a 401. */
export function isOwnerApiRoute(pathname: string): boolean {
  return matchesSegmentPrefix(pathname, "/api") && !matchesAny(pathname, PUBLIC_API_PREFIXES);
}

/** True for any path that needs a Clerk session. */
export function isProtectedRoute(pathname: string): boolean {
  return isProtectedPage(pathname) || isOwnerApiRoute(pathname);
}
