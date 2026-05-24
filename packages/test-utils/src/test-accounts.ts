/** Seed accounts in Supabase (staging/demo). */
export const TEST_ACCOUNTS = {
  family: { email: "giadinh@securitytech.vn", password: "Demo@12345", role: "family_owner" as const },
  familyOwner2: { email: "lean@securitytech.vn", password: "Demo@12345", role: "family_owner" as const },
  guardStaff: { email: "baove@securitytech.vn", password: "Demo@12345", role: "security_staff" as const },
  guardAdmin: { email: "longvan@securitytech.vn", password: "Demo@12345", role: "security_admin" as const },
  superAdmin: { email: "superadmin@securitytech.vn", password: "Demo@12345", role: "super_admin" as const },
} as const;

export type TestAccountKey = keyof typeof TEST_ACCOUNTS;
