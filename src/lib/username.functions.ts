import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sha256 } from "js-sha256";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Hash username để log mà không lộ plaintext. Trả 12 ký tự hex đầu của sha256. */
function hashUsername(s: string): string {
  if (!s) return "";
  return sha256(s).slice(0, 12);
}

/**
 * Chuẩn hoá username trước khi truy vấn:
 * - normalize Unicode NFKC
 * - loại mọi khoảng trắng (kể cả zero-width / NBSP) ở đầu/cuối/giữa
 * - chuyển về chữ thường
 */
export function normalizeUsername(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .normalize("NFKC")
    .replace(/[\s\u200B-\u200D\uFEFF]+/g, "")
    .toLowerCase();
}

const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_.]+$/);

type ResolveOutcome = "invalid_input" | "not_found" | "found" | "error";

/** Min response time để chống user enumeration qua timing. */
export const RESOLVE_MIN_RESPONSE_MS = 250;

/** Tối thiểu interface của Supabase admin client cần cho resolve/audit (giúp test mock dễ). */
export interface ResolveDeps {
  rpc: (fn: string, args: { _username: string }) => Promise<{ data: unknown; error: { message: string } | null }>;
  insertAudit: (row: Record<string, unknown>) => Promise<unknown>;
  getIP?: () => string | null;
  getUA?: () => string | null;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Logic thuần (testable) cho resolveLoginEmail.
 * - Mọi nhánh thất bại đều trả { email: null }.
 * - Luôn ghi audit log (best-effort, không throw ra).
 * - Luôn floor thời gian phản hồi >= RESOLVE_MIN_RESPONSE_MS.
 */
export async function resolveLoginEmailImpl(
  rawUsername: unknown,
  deps: ResolveDeps,
): Promise<{ email: string | null }> {
  const now = deps.now ?? (() => Date.now());
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const startedAt = now();

  let email: string | null = null;
  let outcome: ResolveOutcome = "invalid_input";

  try {
    const normalized = normalizeUsername(rawUsername);
    const valid = usernameSchema.safeParse(normalized);
    if (valid.success) {
      const { data: row, error } = await deps.rpc("resolve_login_email", { _username: valid.data });
      if (error) {
        outcome = "error";
        console.error("[resolveLoginEmail] rpc error:", error.message);
      } else {
        email = (row as string | null) ?? null;
        outcome = email ? "found" : "not_found";
      }
    }
  } catch (e) {
    outcome = "error";
    console.error("[resolveLoginEmail] unexpected error:", e);
  }

  try {
    await deps.insertAudit({
      action: "auth.resolve_login_email",
      target_table: "profiles",
      target_id: null,
      metadata: {
        outcome,
        username_hash: hashUsername(normalizeUsername(rawUsername)),
        username_length: typeof rawUsername === "string" ? rawUsername.length : 0,
        ip: deps.getIP?.() ?? null,
        ua: (deps.getUA?.() ?? null)?.slice(0, 200) ?? null,
      },
    });
  } catch (e) {
    console.error("[resolveLoginEmail] audit insert failed:", e);
  }

  const elapsed = now() - startedAt;
  if (elapsed < RESOLVE_MIN_RESPONSE_MS) {
    await sleep(RESOLVE_MIN_RESPONSE_MS - elapsed);
  }
  return { email };
}

const usernameSchemaForFn = usernameSchema; // alias để rõ ý

export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const parsed = z.object({ username: z.string() }).safeParse(input);
    return { username: parsed.success ? parsed.data.username : "" };
  })
  .handler(async ({ data }) => {
    return resolveLoginEmailImpl(data.username, {
      rpc: async (fn, args) => {
        const { data: row, error } = await supabaseAdmin.rpc(fn as "resolve_login_email", args);
        return { data: row, error: error ? { message: error.message } : null };
      },
      insertAudit: async (row) => {
        await supabaseAdmin.from("audit_logs").insert(row as never);
      },
      getIP: () => {
        try { return getRequestIP({ xForwardedFor: true }) ?? null; } catch { return null; }
      },
      getUA: () => {
        try { return getRequestHeader("user-agent") ?? null; } catch { return null; }
      },
    });
  });
// Suppress unused warning từ alias
void usernameSchemaForFn;

/** Kiểm tra username có sẵn không (dùng cho form đăng ký). */
export const checkUsernameAvailable = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ username: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    const normalized = normalizeUsername(data.username);
    const valid = usernameSchema.safeParse(normalized);
    if (!valid.success) return { available: false };

    const { data: row } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", valid.data)
      .maybeSingle();
    return { available: !row };
  });
