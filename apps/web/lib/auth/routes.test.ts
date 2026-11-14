import { describe, expect, it } from "vitest";
import {
  isOwnerApiRoute,
  isProtectedPage,
  isProtectedRoute,
  matchesSegmentPrefix,
} from "./routes";

const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/sign-in/factor-one",
  "/sign-up",
  "/sign-up/verify-email-address",
  "/embed",
  "/embed/abc123",
  "/api/widget",
  "/api/widget/config",
  "/api/widget/chat",
  "/api/clerk/webhook",
  "/api/posthog-config",
  "/dashboardx",
];

const PROTECTED_PAGES = ["/dashboard", "/dashboard/", "/dashboard/projects/123"];

const OWNER_API_PATHS = [
  "/api",
  "/api/projects",
  "/api/projects/123",
  "/api/projects/123/knowledge",
  "/api/projects/123/knowledge/upload-url",
  "/api/projects/123/config",
  "/api/projects/123/conversations",
  "/api/knowledge/456",
  "/api/conversations/789",
  // Deny by default: unknown /api routes need a session
  "/api/anything",
  "/api/account/usage",
  // Whole-segment match: look-alikes of public routes are not public
  "/api/widgetx",
  "/api/widgetfoo/chat",
  "/api/clerk",
  "/api/clerk/webhookx",
  "/api/posthog-configx",
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

describe("matchesSegmentPrefix", () => {
  it("matches the prefix and paths below it", () => {
    expect(matchesSegmentPrefix("/api/widget", "/api/widget")).toBe(true);
    expect(matchesSegmentPrefix("/api/widget/chat", "/api/widget")).toBe(true);
  });

  it("does not match a longer segment", () => {
    expect(matchesSegmentPrefix("/api/widgetx", "/api/widget")).toBe(false);
  });
});
