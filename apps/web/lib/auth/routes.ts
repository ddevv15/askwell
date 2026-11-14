// Which paths need a signed-in owner, and where Clerk sends people.
// Pure functions so the public/protected split is unit tested (routes.test.ts).
// project.md §8: owner pages and owner API routes need a Clerk session;
// the widget, embed, landing page, sign-in/up and system routes stay public.

export const SIGN_IN_URL = "/sign-in";
export const SIGN_UP_URL = "/sign-up";
export const AFTER_AUTH_URL = "/dashboard";
export const AFTER_SIGN_OUT_URL = SIGN_IN_URL;

const PROTECTED_PAGE_PREFIXES = ["/dashboard"] as const;

const OWNER_API_PREFIXES = [
  "/api/projects",
  "/api/knowledge",
  "/api/conversations",
] as const;

// Mirrors the `/prefix(.*)` patterns in the task: the prefix itself and
// anything after it.
function startsWithAny(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

/** Owner pages: signed-out visitors are redirected to sign-in. */
export function isProtectedPage(pathname: string): boolean {
  return startsWithAny(pathname, PROTECTED_PAGE_PREFIXES);
}

/** Owner API routes: signed-out requests get a 401 JSON error. */
export function isOwnerApiRoute(pathname: string): boolean {
  return startsWithAny(pathname, OWNER_API_PREFIXES);
}

/** True for any path that needs a Clerk session. */
export function isProtectedRoute(pathname: string): boolean {
  return isProtectedPage(pathname) || isOwnerApiRoute(pathname);
}
