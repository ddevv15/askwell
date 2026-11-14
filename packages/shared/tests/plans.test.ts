import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, PLANS, type Plan } from "../index";

describe("PLAN_LIMITS", () => {
  it("has exactly the free and pro plans", () => {
    expect(Object.keys(PLAN_LIMITS).sort()).toEqual([...PLANS].sort());
    const plans: Plan[] = ["free", "pro"];
    expect([...PLANS]).toEqual(plans);
  });

  it("matches project.md §5 for Free", () => {
    expect(PLAN_LIMITS.free).toEqual({
      projects: 1,
      messagesPerMonth: 100,
      knowledgeSources: 3,
      customize: {
        customColor: false,
        positions: ["bottom-right"],
        customLabel: false,
        animations: ["fade"],
        customHeader: false,
        hideBadge: false,
      },
    });
  });

  it("matches project.md §5 for Pro", () => {
    expect(PLAN_LIMITS.pro).toEqual({
      projects: 5,
      messagesPerMonth: 2000,
      knowledgeSources: 25,
      customize: {
        customColor: true,
        positions: ["bottom-right", "bottom-left", "top-right", "top-left"],
        customLabel: true,
        animations: ["fade", "slide", "scale"],
        customHeader: true,
        hideBadge: true,
      },
    });
  });
});
