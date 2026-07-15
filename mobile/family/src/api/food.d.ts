export type ShoppingItemRow = {
  id: string;
  name: string;
  qty: number | null;
  unit: string | null;
  category: string | null;
  purchased: boolean;
};

export type FoodItemRow = {
  id: string;
  name: string;
  expires_on: string | null;
  qty: number | null;
  unit: string | null;
};

export declare function listFood(data: { family_id: string }): Promise<{ items: FoodItemRow[]; shopping: ShoppingItemRow[] }>;
export declare function upsertFoodItem(data: unknown): Promise<{ ok: boolean }>;
export declare function upsertShoppingItem(data: unknown): Promise<{ ok: boolean }>;
export declare function toggleShopping(data: { id: string; purchased: boolean }): Promise<{ ok: boolean }>;
export declare function deleteFoodRow(data: { table: string; id: string }): Promise<{ ok: boolean }>;
export declare function suggestMeals(data: { family_id: string }): Promise<{
  suggestions: Array<{ title: string; reason: string; time: string }>;
  expiring: Array<{ name: string; expires_on: string | null; days: number | null }>;
}>;
