import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Fam = z.object({ family_id: z.string().uuid() });

export type FoodItemRow = {
  id: string;
  name: string;
  category: string | null;
  qty: number | null;
  unit: string | null;
  location: string | null;
  expires_on: string | null;
  notes: string | null;
};
export type ShoppingItemRow = {
  id: string;
  name: string;
  qty: number | null;
  unit: string | null;
  category: string | null;
  purchased: boolean;
};

export const listFood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Fam.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [inv, sh] = await Promise.all([
      supabase.from("food_items").select("*").eq("family_id", data.family_id).order("expires_on", { ascending: true, nullsFirst: false }),
      supabase.from("shopping_items").select("*").eq("family_id", data.family_id).order("purchased").order("created_at", { ascending: false }),
    ]);
    return {
      items: (inv.data ?? []) as FoodItemRow[],
      shopping: (sh.data ?? []) as ShoppingItemRow[],
    };
  });

export const upsertFoodItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().nullable().optional(),
      family_id: z.string().uuid(),
      name: z.string().min(1).max(80),
      category: z.string().max(40).nullable().optional(),
      qty: z.number().nullable().optional(),
      unit: z.string().max(20).nullable().optional(),
      location: z.enum(["fridge", "freezer", "pantry", "other"]).nullable().optional(),
      expires_on: z.string().nullable().optional(),
      notes: z.string().max(200).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data;
    const payload = {
      ...rest,
      category: data.category || null,
      qty: data.qty ?? null,
      unit: data.unit || null,
      location: data.location || null,
      expires_on: data.expires_on || null,
      notes: data.notes || null,
    };
    if (id) {
      const { error } = await supabase.from("food_items").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("food_items").insert({ ...payload, created_by: userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const upsertShoppingItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().nullable().optional(),
      family_id: z.string().uuid(),
      name: z.string().min(1).max(80),
      qty: z.number().nullable().optional(),
      unit: z.string().max(20).nullable().optional(),
      category: z.string().max(40).nullable().optional(),
      purchased: z.boolean().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data;
    const payload = {
      ...rest,
      qty: data.qty ?? null,
      unit: data.unit || null,
      category: data.category || null,
    };
    if (id) {
      const { error } = await supabase.from("shopping_items").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("shopping_items").insert({ ...payload, created_by: userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const toggleShopping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), purchased: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("shopping_items").update({ purchased: data.purchased }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFoodRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      table: z.enum(["food_items", "shopping_items"]),
      id: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Suggest meals based on current inventory, prioritising items that are
 *  about to expire. */
export const suggestMeals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Fam.parse(d))
  .handler(async ({ data, context }) => {
    const { data: items } = await context.supabase
      .from("food_items")
      .select("name, category, expires_on")
      .eq("family_id", data.family_id)
      .limit(100);

    const rows = (items ?? []) as { name: string; category: string | null; expires_on: string | null }[];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const withDays = rows.map((r) => {
      let days: number | null = null;
      if (r.expires_on) {
        const d = new Date(r.expires_on);
        days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
      }
      return { ...r, days };
    });

    const names = withDays.map((i) => i.name.toLowerCase());
    const has = (kw: string) => names.some((n) => n.includes(kw));
    const expiringNames = withDays
      .filter((i) => i.days !== null && i.days <= 3)
      .map((i) => i.name);

    const suggestions: { title: string; reason: string; time: string }[] = [];
    const push = (title: string, reason: string, time: string) =>
      suggestions.push({ title, reason, time });

    if (has("trứng") && has("cà chua")) push("Trứng chiên cà chua", "Có trứng và cà chua", "15 phút");
    if ((has("thịt") || has("bò")) && has("rau")) push("Thịt xào rau", "Có thịt và rau tươi", "20 phút");
    if (has("gà")) push("Gà kho gừng", "Có gà tươi trong tủ", "30 phút");
    if (has("cá") || has("hồi")) push("Cá kho tộ", "Có cá tươi", "35 phút");
    if (has("rau") || has("ngót") || has("cải")) push("Canh rau", "Tận dụng rau tươi", "20 phút");
    if (expiringNames.length > 0)
      push(
        "Bữa tận dụng tủ lạnh",
        `Ưu tiên dùng: ${expiringNames.slice(0, 3).join(", ")}`,
        "25 phút",
      );
    if (suggestions.length === 0)
      push("Cơm trắng + canh rau", "Bữa cơ bản, ai cũng ăn được", "30 phút");

    return {
      suggestions: suggestions.slice(0, 4),
      expiring: withDays
        .filter((i) => i.days !== null && i.days <= 7)
        .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
        .slice(0, 6)
        .map((i) => ({ name: i.name, expires_on: i.expires_on, days: i.days })),
    };
  });

