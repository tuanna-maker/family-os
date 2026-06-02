import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

const FamilyInput = z.object({ familyId: z.string().uuid() });

export const getEntitlement = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => FamilyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: ent, error } = await supabase
      .from('ai_entitlements')
      .select('plan, ocr_monthly_quota, insights_enabled, expires_at')
      .eq('family_id', data.familyId)
      .maybeSingle();
    if (error) throw error;
    return {
      plan: ent?.plan ?? 'free',
      ocrQuota: ent?.ocr_monthly_quota ?? 5,
      insightsEnabled: ent?.insights_enabled ?? false,
      expiresAt: ent?.expires_at ?? null,
    };
  });

export const activatePremiumTrial = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => FamilyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: ent, error } = await supabase.rpc('activate_premium_trial', {
      _family_id: data.familyId,
    });
    if (error) throw new Error(error.message);
    return { ent };
  });

export const requestPremiumUpgrade = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ familyId: z.string().uuid(), note: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from('premium_upgrade_requests').insert({
      family_id: data.familyId,
      requested_by: userId,
      plan: 'premium',
      status: 'pending',
      note: data.note ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const listMyUpgradeRequests = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => FamilyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from('premium_upgrade_requests')
      .select('id, status, plan, note, created_at, reviewed_at')
      .eq('family_id', data.familyId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return { requests: rows ?? [] };
  });
