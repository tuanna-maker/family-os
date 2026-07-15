import { z } from "zod";

export const SOS_SCHEMA_VERSION = 1 as const;

const trimmed = (max: number, min = 1) =>
  z
    .string()
    .transform((s) => s.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(min).max(max));

const trimmedOpt = (max: number) =>
  z
    .string()
    .optional()
    .transform((s) => (s ? s.replace(/\s+/g, " ").trim() : ""))
    .transform((s) => (s.length ? s : undefined))
    .pipe(z.string().max(max).optional());

export const sosDispatchSchema = z.object({
  schema_version: z.literal(SOS_SCHEMA_VERSION).default(SOS_SCHEMA_VERSION),
  priority: z.enum(["P1", "P2", "P3"]),
  incident_type: trimmed(80),
  zone: trimmed(80),
  location: trimmedOpt(120),
  team_id: trimmed(40),
  team_name: trimmed(120),
  auto_assigned: z.boolean(),
  note: trimmedOpt(500),
});

export type SosDispatchInput = z.infer<typeof sosDispatchSchema>;

export function validateSosDispatch(input: unknown):
  | { ok: true; data: SosDispatchInput }
  | { ok: false; message: string; field?: string } {
  const parsed = sosDispatchSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const first = parsed.error.issues[0];
  return {
    ok: false,
    field: first?.path.join(".") || undefined,
    message: first?.message || "Dữ liệu SOS không hợp lệ",
  };
}
