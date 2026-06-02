import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SharePermission = {
  member_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit_all: boolean;
  can_delete: boolean;
  can_manage_budget: boolean;
  can_manage_recurring: boolean;
};

const FamilyOnly = z.object({ family_id: z.string().uuid() });

const UpsertSchema = z.object({
  family_id: z.string().uuid(),
  member_id: z.string().uuid(),
  can_view: z.boolean().default(true),
  can_create: z.boolean().default(true),
  can_edit_all: z.boolean().default(false),
  can_delete: z.boolean().default(false),
  can_manage_budget: z.boolean().default(false),
  can_manage_recurring: z.boolean().default(false),
});

export const listPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FamilyOnly.parse(d))
  .handler(async ({ data, context }): Promise<SharePermission[]> => {
    const { data: rows, error } = await context.supabase
      .from("expense_share_permissions")
      .select(
        "member_id, can_view, can_create, can_edit_all, can_delete, can_manage_budget, can_manage_recurring",
      )
      .eq("family_id", data.family_id);
    if (error) throw new Error(error.message);
    return (rows ?? []) as SharePermission[];
  });

export const upsertPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("expense_share_permissions")
      .upsert(
        {
          family_id: data.family_id,
          member_id: data.member_id,
          can_view: data.can_view,
          can_create: data.can_create,
          can_edit_all: data.can_edit_all,
          can_delete: data.can_delete,
          can_manage_budget: data.can_manage_budget,
          can_manage_recurring: data.can_manage_recurring,
        },
        { onConflict: "family_id,member_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
