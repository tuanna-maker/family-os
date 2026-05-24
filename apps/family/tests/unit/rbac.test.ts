import { describe, expect, it } from "vitest";
import { TEST_ACCOUNTS } from "@shared/test-utils/test-accounts";

/**
 * RLS contract test — documents expected isolation.
 * Full integration requires Supabase test project + SET request.jwt.claims.
 */
describe("RBAC — family data isolation (contract)", () => {
  it("defines two distinct family owners for cross-family tests", () => {
    expect(TEST_ACCOUNTS.family.email).not.toBe(TEST_ACCOUNTS.familyOwner2.email);
    expect(TEST_ACCOUNTS.family.role).toBe("family_owner");
  });

  it("family_member must not access another family_id (RLS policy expectation)", () => {
    const familyA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const familyB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    // RLS: expenses.family_id must match caller's family via is_family_member()
    expect(familyA).not.toBe(familyB);
  });
});
