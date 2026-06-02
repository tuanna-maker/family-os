import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ContactSlotId = "elder" | "family" | "security";

export type FamilyContactRow = {
  slot_id: ContactSlotId;
  label: string;
  icon: string;
  name: string;
  phone: string;
};

export const DEFAULT_CONTACTS: FamilyContactRow[] = [
  { slot_id: "elder", label: "Gọi ông/bà", icon: "👵", name: "Ông/Bà", phone: "" },
  { slot_id: "family", label: "Gọi người thân", icon: "👨‍👩‍👧", name: "Người thân", phone: "" },
  { slot_id: "security", label: "Gọi bảo an", icon: "🛡️", name: "Bảo an toà nhà", phone: "" },
];

export const listFamilyContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { familyId: string }) =>
    z.object({ familyId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<FamilyContactRow[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("family_contacts")
      .select("slot_id,label,icon,name,phone")
      .eq("family_id", data.familyId);
    if (error) throw new Error(error.message);
    const byId = new Map((rows ?? []).map((r) => [r.slot_id, r as FamilyContactRow]));
    return DEFAULT_CONTACTS.map((d) => byId.get(d.slot_id) ?? d);
  });

export const upsertFamilyContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        slot_id: z.enum(["elder", "family", "security"]),
        label: z.string().min(1).max(64),
        icon: z.string().min(1).max(8),
        name: z.string().min(1).max(80),
        phone: z.string().min(3).max(32).regex(/^[\d+\s().-]+$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("family_contacts")
      .upsert(
        {
          family_id: data.familyId,
          slot_id: data.slot_id,
          label: data.label,
          icon: data.icon,
          name: data.name,
          phone: data.phone,
          updated_by: userId,
        },
        { onConflict: "family_id,slot_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetFamilyContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { familyId: string }) =>
    z.object({ familyId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("family_contacts")
      .delete()
      .eq("family_id", data.familyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
