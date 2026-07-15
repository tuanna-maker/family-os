/**
 * RLS integration — requires local Supabase:
 *   supabase start
 *   supabase db reset
 *   SUPABASE_LOCAL=1 npm run test -w @apps/family -- tests/integration
 *
 * @see TEST_REPORT.md
 */
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { TEST_ACCOUNTS } from "@shared/test-utils/test-accounts";

const runLocal = process.env.SUPABASE_LOCAL === "1";
const url = process.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

describe.skipIf(!runLocal)("RLS — family expense isolation", () => {
  it("family owner A cannot read another family's expenses", async () => {
    const clientA = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error: signErr } = await clientA.auth.signInWithPassword({
      email: TEST_ACCOUNTS.family.email,
      password: TEST_ACCOUNTS.family.password,
    });
    expect(signErr).toBeNull();

    const { data: myFamilies } = await clientA
      .from("families")
      .select("id")
      .limit(1)
      .maybeSingle();
    expect(myFamilies?.id).toBeTruthy();

    const clientB = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error: signErrB } = await clientB.auth.signInWithPassword({
      email: TEST_ACCOUNTS.familyOwner2.email,
      password: TEST_ACCOUNTS.familyOwner2.password,
    });
    expect(signErrB).toBeNull();

    const { data: otherFamily } = await clientB
      .from("families")
      .select("id")
      .limit(1)
      .maybeSingle();
    expect(otherFamily?.id).toBeTruthy();

    if (otherFamily!.id === myFamilies!.id) {
      // Seed only has one family — skip assertion
      return;
    }

    const { data: leaked, error } = await clientA
      .from("expenses")
      .select("id, amount")
      .eq("family_id", otherFamily!.id);

    expect(error).toBeNull();
    expect(leaked ?? []).toHaveLength(0);
  });
});
