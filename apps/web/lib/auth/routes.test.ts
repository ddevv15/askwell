import { describe, expect, it } from "vitest";
import { isOwnerApiRoute, isProtectedPage, isProtectedRoute } from "./routes";

const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/sign-in/factor-one",
  "/sign-up",
  "/sign-up/verify-email-address",
  "/embed",
  "/embed/abc123",
  "/api/widget/config",
  "/api/widget/chat",
  "/api/clerk/webhook",
  "/api/posthog-config",
];

const PROTECTED_PAGES = ["/dashboard", "/dashboard/", "/dashboard/projects/123"];

const OWNER_API_PATHS = [
  "/api/projects",
  "/api/projects/123",
  "/api/projects/123/knowledge",
  "/api/projects/123/knowledge/upload-url",
  "/api/projects/123/config",
  "/api/projects/123/conversations",
  "/api/knowledge/456",
  "/api/conversations/789",
];

describe("route protection", () => {
  it.each(PUBLIC_PATHS)("%s is public", (path) => {
    expect(isProtectedRoute(path)).toBe(false);
  });

  it.each(PROTECTED_PAGES)("%s is a protected page", (path) => {
    expect(isProtectedPage(path)).toBe(true);
    expect(isOwnerApiRoute(path)).toBe(false);
    expect(isProtectedRoute(path)).toBe(true);
  });

  it.each(OWNER_API_PATHS)("%s is an owner API route", (path) => {
    expect(isOwnerApiRoute(path)).toBe(true);
    expect(isProtectedPage(path)).toBe(false);
    expect(isProtectedRoute(path)).toBe(true);
  });
});
