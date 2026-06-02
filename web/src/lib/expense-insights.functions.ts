import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

const FamilyInput = z.object({ familyId: z.string().uuid() });

export const getLatestInsight = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => FamilyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from('expense_ai_insights')
      .select('*')
      .eq('family_id', data.familyId)
      .order('period_month', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return { insight: row };
  });

export const listAnomalies = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => FamilyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from('expense_anomalies')
      .select('*, expenses(amount, category, spent_on, note)')
      .eq('family_id', data.familyId)
      .eq('resolved', false)
      .order('detected_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return { anomalies: rows ?? [] };
  });

export const resolveAnomaly = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ anomalyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from('expense_anomalies')
      .update({ resolved: true })
      .eq('id', data.anomalyId);
    if (error) throw error;
    return { ok: true };
  });

export const detectAnomalies = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => FamilyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: count, error } = await supabase.rpc('detect_expense_anomalies', {
      p_family_id: data.familyId,
    });
    if (error) throw error;
    return { inserted: count ?? 0 };
  });

export const generateInsight = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => FamilyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check premium entitlement
    const { data: ent } = await supabase
      .from('ai_entitlements')
      .select('plan, insights_enabled')
      .eq('family_id', data.familyId)
      .maybeSingle();
    const isPremium = ent?.plan === 'premium' || ent?.insights_enabled === true;
    if (!isPremium) {
      throw new Error('AI Insights là tính năng Premium. Hãy nâng cấp để sử dụng.');
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error('LOVABLE_API_KEY chưa cấu hình');

    // Aggregate current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const { data: expenses, error: expErr } = await supabase
      .from('expenses')
      .select('amount, category, spent_on, note, merchant')
      .eq('family_id', data.familyId)
      .gte('spent_on', monthStart)
      .order('spent_on', { ascending: false })
      .limit(200);
    if (expErr) throw expErr;

    const totals = new Map<string, number>();
    let grand = 0;
    for (const e of expenses ?? []) {
      const v = Number(e.amount) || 0;
      totals.set(e.category, (totals.get(e.category) ?? 0) + v);
      grand += v;
    }
    const topCategories = Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const prompt = `Bạn là cố vấn tài chính gia đình. Phân tích chi tiêu tháng này (VND):
- Tổng: ${grand.toLocaleString('vi-VN')}đ
- Top danh mục: ${topCategories.map((c) => `${c.category}: ${c.amount.toLocaleString('vi-VN')}đ`).join(', ')}
- Số giao dịch: ${expenses?.length ?? 0}

Trả về JSON với keys: summary (1-2 câu tiếng Việt), recommendations (mảng 3 gợi ý ngắn gọn tiếng Việt).`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Bạn trả lời CHỈ bằng JSON hợp lệ.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`AI Gateway lỗi ${aiRes.status}: ${txt.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? '{}';
    let parsed: { summary?: string; recommendations?: string[] } = {};
    try { parsed = JSON.parse(content); } catch { parsed = { summary: content }; }

    const periodMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    const { data: upserted, error: upErr } = await supabase
      .from('expense_ai_insights')
      .upsert({
        family_id: data.familyId,
        period_month: periodMonth,
        summary: parsed.summary ?? 'Không có tóm tắt.',
        top_categories: topCategories,
        anomalies: [],
        recommendations: parsed.recommendations ?? [],
        model: 'google/gemini-2.5-flash',
        generated_at: new Date().toISOString(),
      }, { onConflict: 'family_id,period_month' })
      .select()
      .single();
    if (upErr) throw upErr;

    return { insight: upserted };
  });
