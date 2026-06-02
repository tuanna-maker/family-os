import { describe, it, expect } from "vitest";
import { scrubLogMessage, scrubLogValue } from "./pii-scrub";

describe("scrubLogMessage", () => {
  it("redacts VN phone numbers", () => {
    expect(scrubLogMessage("Gọi 0901234567 ngay")).toBe("Gọi [REDACTED] ngay");
  });

  it("redacts email addresses", () => {
    expect(scrubLogMessage("user@test.com failed")).toBe("[REDACTED] failed");
  });

  it("redacts Bearer tokens", () => {
    expect(scrubLogMessage("Auth Bearer abc.def.ghi")).toBe("Auth [REDACTED]");
  });

  it("truncates to 2000 chars", () => {
    expect(scrubLogMessage("x".repeat(3000)).length).toBe(2000);
  });
});

describe("scrubLogValue", () => {
  it("redacts sensitive object keys", () => {
    expect(scrubLogValue({ password: "secret123", ok: true })).toEqual({
      password: "[REDACTED]",
      ok: true,
    });
  });

  it("scrubs nested strings", () => {
    expect(scrubLogValue({ note: "call 0901234567" })).toEqual({
      note: "call [REDACTED]",
    });
  });
});
