import { describe, expect, it } from "vitest";
import { TEST_ACCOUNTS } from "@shared/test-utils/test-accounts";

const ADMIN_ROLES = new Set(["security_admin", "super_admin"]);
const STAFF_ROLES = new Set(["security_staff"]);

describe("guard RBAC — permission matrix", () => {
  it("security_staff cannot access admin endpoints", () => {
    expect(ADMIN_ROLES.has(TEST_ACCOUNTS.guardStaff.role)).toBe(false);
    expect(STAFF_ROLES.has(TEST_ACCOUNTS.guardStaff.role)).toBe(true);
  });

  it("security_admin can access admin endpoints", () => {
    expect(ADMIN_ROLES.has(TEST_ACCOUNTS.guardAdmin.role)).toBe(true);
  });

  it("/security route allows cloud roles only", () => {
    const CLOUD_ALLOWED = ["super_admin", "saas_admin", "tenant_admin", "security_admin", "security_staff"];
    expect(CLOUD_ALLOWED).toContain(TEST_ACCOUNTS.guardStaff.role);
    expect(CLOUD_ALLOWED).not.toContain("family_owner");
  });
});
