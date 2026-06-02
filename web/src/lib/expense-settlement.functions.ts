import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

const Input = z.object({
  familyId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(), // YYYY-MM
});

function monthRange(month?: string) {
  const now = new Date();
  const [y, m] = month ? month.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  return { start, end };
}

export const getSettlement = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { start, end } = monthRange(data.month);

    const [{ data: members, error: mErr }, { data: expenses, error: eErr }] = await Promise.all([
      supabase
        .from('family_members')
        .select('id, user_id, name')
        .eq('family_id', data.familyId),
      supabase
        .from('expenses')
        .select('amount, payer_id, is_shared, spent_on')
        .eq('family_id', data.familyId)
        .gte('spent_on', start)
        .lt('spent_on', end),
    ]);
    if (mErr) throw mErr;
    if (eErr) throw eErr;

    const memberList = (members ?? []).filter((m) => m.user_id);
    const n = memberList.length || 1;

    // paid by user_id
    const paid = new Map<string, number>();
    let sharedTotal = 0;
    for (const e of expenses ?? []) {
      const amt = Number(e.amount) || 0;
      if (e.is_shared && e.payer_id) {
        paid.set(e.payer_id, (paid.get(e.payer_id) ?? 0) + amt);
        sharedTotal += amt;
      }
    }
    const sharePerHead = sharedTotal / n;

    const balances = memberList.map((m) => {
      const p = paid.get(m.user_id!) ?? 0;
      return {
        memberId: m.id,
        userId: m.user_id!,
        name: m.name,
        paid: p,
        share: sharePerHead,
        net: p - sharePerHead, // >0: được nhận, <0: phải trả
      };
    });

    // Suggested transfers (greedy)
    const debtors = balances
      .filter((b) => b.net < -1)
      .map((b) => ({ ...b, remaining: -b.net }))
      .sort((a, b) => b.remaining - a.remaining);
    const creditors = balances
      .filter((b) => b.net > 1)
      .map((b) => ({ ...b, remaining: b.net }))
      .sort((a, b) => b.remaining - a.remaining);

    const transfers: Array<{ fromName: string; toName: string; amount: number }> = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amt = Math.min(debtors[i].remaining, creditors[j].remaining);
      transfers.push({
        fromName: debtors[i].name,
        toName: creditors[j].name,
        amount: Math.round(amt),
      });
      debtors[i].remaining -= amt;
      creditors[j].remaining -= amt;
      if (debtors[i].remaining < 1) i++;
      if (creditors[j].remaining < 1) j++;
    }

    return {
      sharedTotal,
      sharePerHead: Math.round(sharePerHead),
      memberCount: n,
      balances,
      transfers,
    };
  });

export const exportExpensesCsv = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { start, end } = monthRange(data.month);

    const { data: rows, error } = await supabase
      .from('expenses')
      .select('spent_on, title, category, amount, merchant, payment_method, is_shared, note')
      .eq('family_id', data.familyId)
      .gte('spent_on', start)
      .lt('spent_on', end)
      .order('spent_on', { ascending: true });
    if (error) throw error;

    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['Ngày', 'Tiêu đề', 'Danh mục', 'Số tiền', 'Cửa hàng', 'Phương thức', 'Chung', 'Ghi chú'];
    const lines = [header.join(',')];
    for (const r of rows ?? []) {
      lines.push(
        [r.spent_on, r.title, r.category, r.amount, r.merchant, r.payment_method, r.is_shared ? 'Có' : 'Không', r.note]
          .map(esc)
          .join(','),
      );
    }
    return { csv: '\uFEFF' + lines.join('\n'), count: rows?.length ?? 0 };
  });
