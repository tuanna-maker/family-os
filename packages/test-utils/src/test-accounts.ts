/** Seed accounts — pilot staging (Lovable). Password: Demo@12345 */
export const TEST_ACCOUNTS = {
  familyOwner: {
    email: "giadinh@securitytech.vn",
    password: "Demo@12345",
    role: "family_owner" as const,
  },
  familyMember: {
    email: "thanhvien@securitytech.vn",
    password: "Demo@12345",
    role: "family_member" as const,
  },
  guardAdmin: {
    email: "baove@securitytech.vn",
    password: "Demo@12345",
    role: "security_admin" as const,
  },
  guardStaff: {
    email: "nhanvienbaove@securitytech.vn",
    password: "Demo@12345",
    role: "security_staff" as const,
  },
  /** @deprecated dùng familyOwner */
  family: {
    email: "giadinh@securitytech.vn",
    password: "Demo@12345",
    role: "family_owner" as const,
  },
  familyOwner2: {
    email: "lean@securitytech.vn",
    password: "Demo@12345",
    role: "family_owner" as const,
  },
  superAdmin: {
    email: "superadmin@securitytech.vn",
    password: "Demo@12345",
    role: "super_admin" as const,
  },
} as const;

export type TestAccountKey = keyof typeof TEST_ACCOUNTS;
