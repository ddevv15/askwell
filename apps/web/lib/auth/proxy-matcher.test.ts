import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it, vi } from "vitest";

// Only the matcher config is under test; stub Clerk so the proxy module loads.
vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: () => () => undefined,
}));

const { config } = await import("../../proxy");

function runsOn(path: string): boolean {
  return unstable_doesMiddlewareMatch({ config, url: path });
}

describe("proxy matcher", () => {
  it.each([
    "/",
    "/dashboard",
    "/dashboard/projects/1",
    "/sign-in",
    "/sign-up/verify",
    "/api",
    "/api/projects",
    "/api/anything",
    "/api/widgetx",
    "/api/clerk/webhook",
    "/api/posthog-config",
    "/embedx",
  ])("runs on %s", (path) => {
    expect(runsOn(path)).toBe(true);
  });

  // Widget paths: cross-site iframe and cross-origin calls; Clerk stays off them.
  it.each([
    "/embed",
    "/embed/abc123",
    "/api/widget",
    "/api/widget/config",
    "/api/widget/chat",
    "/_next/static/chunk.js",
    "/favicon.ico",
  ])("skips %s", (path) => {
    expect(runsOn(path)).toBe(false);
  });
});
