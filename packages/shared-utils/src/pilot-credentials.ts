/** Tài khoản pilot — Lovable / Supabase staging (Demo@12345). */
export const PILOT_ACCOUNTS = {
  family: {
    owner: {
      identifier: "giadinh@securitytech.vn",
      password: "Demo@12345",
      role: "family_owner" as const,
      label: "Chủ hộ",
    },
    member: {
      identifier: "thanhvien@securitytech.vn",
      password: "Demo@12345",
      role: "family_member" as const,
      label: "Thành viên",
    },
  },
  guard: {
    admin: {
      identifier: "baove@securitytech.vn",
      password: "Demo@12345",
      role: "security_admin" as const,
      label: "Quản lý an ninh",
    },
    staff: {
      identifier: "nhanvienbaove@securitytech.vn",
      password: "Demo@12345",
      role: "security_staff" as const,
      label: "Nhân viên bảo vệ",
    },
  },
} as const;

export type PilotAppTarget = "family" | "guard";

/** App target cố định lúc build (family vs guard) — tránh nhầm prefill giữa hai APK. */
export function getAppTarget(): PilotAppTarget {
  const v = import.meta.env.VITE_APP_TARGET;
  if (v === "family" || v === "guard") return v;
  return "family";
}

/** Bật mặc định pilot; tắt bằng VITE_PILOT_PREFILL=false khi go-live. */
export function pilotPrefillEnabled(): boolean {
  return import.meta.env.VITE_PILOT_PREFILL !== "false";
}

export function getPilotLoginDefaults(app?: PilotAppTarget): {
  identifier: string;
  password: string;
  label: string;
} {
  if (!pilotPrefillEnabled()) {
    return { identifier: "", password: "", label: "" };
  }
  const target = app ?? getAppTarget();
  if (target === "family") {
    const a = PILOT_ACCOUNTS.family.owner;
    return {
      identifier: a.identifier,
      password: a.password,
      label: a.label,
    };
  }
  const a = PILOT_ACCOUNTS.guard.staff;
  return {
    identifier: a.identifier,
    password: a.password,
    label: a.label,
  };
}
