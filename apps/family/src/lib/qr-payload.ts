/** Chuẩn hoá nội dung quét QR (URL, JSON, mã thô). */
export function normalizeQrPayload(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (t.startsWith("HLP-")) return t;

  if (t.startsWith("{")) {
    try {
      const j = JSON.parse(t) as { pass_code?: string; token?: string; code?: string };
      if (j.token?.startsWith("HLP-")) return j.token;
      if (j.pass_code) return j.pass_code;
      if (j.code) return j.code;
    } catch {
      /* ignore */
    }
  }

  try {
    const u = new URL(t);
    const pass = u.searchParams.get("pass") ?? u.searchParams.get("code") ?? u.searchParams.get("pass_code");
    if (pass) return pass.trim();
    const last = u.pathname.split("/").filter(Boolean).pop();
    if (last && last.length >= 8) return last;
  } catch {
    /* not a URL */
  }

  return t;
}

export function isHelperShiftToken(code: string): boolean {
  return code.startsWith("HLP-");
}
