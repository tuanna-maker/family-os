import { describe, expect, it } from "vitest";
import { GUARD_BOTTOM_TABS } from "@/routes/guard";

describe("Guard home route contract", () => {
  it("home tab points to /guard", () => {
    const home = GUARD_BOTTOM_TABS.find((t) => t.label === "Trang chủ");
    expect(home?.to).toBe("/guard");
    expect(home?.exact).toBe(true);
  });
});
