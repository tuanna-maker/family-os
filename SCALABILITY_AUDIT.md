# SCALABILITY_AUDIT.md

> Family OS monorepo · `apps/family`, `apps/guard` · 2026-05-23

## B1. Frontend (mobile)

| Check | Status | Finding | Action |
|-------|--------|---------|--------|
| Bundle < 500KB gzip | ✅ | Family **~298 KB** gzip JS; Guard **~369 KB** gzip JS (single chunk) | Monitor; split if >450 KB |
| Route code-splitting | ❌ | No `React.lazy()` on routes; all routes in one bundle | Add lazy imports in `routeTree` / route components |
| Lazy heavy tabs | ❌ | `chi-tieu_.scan`, `suc-khoe` eager-loaded | `lazy(() => import('./routes/chi-tieu_.scan'))` |
| Tree-shake shadcn | ⚠️ | `@shared/ui` re-exports full `ui/*`; apps import per-component (OK) | Audit barrel imports; avoid `@shared/ui` index |
| WebP/AVIF images | ❌ | Hero JPG refs removed; mock PNG placeholders | Use `srcset` + WebP in `resources/` |
| React Query tuning | ⚠️ | Root `staleTime: 30s`; per-route varies | Family context 5min; notifications 60s poll OK |
| Virtualize long lists | ❌ | Notifications, expenses render full list | Add `@tanstack/react-virtual` on >50 rows |
| Memo MobileShell/BottomNav | ❌ | No `React.memo` on shell components | Wrap + stable callbacks |
| Offline-first | ❌ | No `@tanstack/query-persist-client` | Add IndexedDB persister for GET queries |

### Bundle visualizer (recommended)

```bash
npm run build -w @apps/family
npx vite-bundle-visualizer --config apps/family/vite.config.ts
```

---

## B2. Backend — `createServerFn` → Mobile + Edge

**Legacy:** 22 files, **95** `createServerFn` exports in `src/lib/*.functions.ts` (TanStack Start web).

**Mobile apps:** Plain async functions in `apps/*/src/api/*` calling Supabase JS + RLS.

### Migration classification

| Category | Count (est.) | Mobile approach | Examples |
|----------|--------------|-----------------|----------|
| **CRUD + RLS** | ~70 | `supabase.from().select/insert` | expenses, children, notifications |
| **RPC existing** | ~5 | `supabase.rpc()` | `resolve_login_email` |
| **Edge Function** | ~8 | `supabase.functions.invoke()` | `scan-receipt`, AI, admin bulk |
| **Web-only (admin/BQL/SaaS)** | ~12 | Not in mobile apps | `admin.functions`, `bql.functions` |

### Edge Function candidates

| Function | Reason | Status |
|----------|--------|--------|
| `scan-receipt` | OpenAI/vision secret | ✅ Client calls invoke |
| `log-ingest` | Batch logs, service role | ✅ Added `supabase/functions/` |
| `health-check` | Cron probe | ✅ Added |
| `metrics-aggregate` | MV refresh | ✅ Added |
| `user-data-export` | GDPR zip | 🔲 Planned (SECURITY_HARDENING) |
| `suggestMeals` | Optional LLM | 🔲 Move from `food.functions` |

### Query patterns

| Check | Status | Action |
|-------|--------|--------|
| N+1 avoidance | ⚠️ | `listChildren` uses `Promise.all` (good); `getFamilyToday` multi-query — batch |
| Cursor pagination | ❌ | `listNotifications` uses offset/range | Keyset on `(created_at, id)` |
| Supavisor transaction mode | 🔲 | Enable for Edge Functions in Supabase dashboard |

---

## B3. Database

| Index / optimization | Status | Action |
|---------------------|--------|--------|
| `user_roles(user_id, role)` | ⚠️ | Verify composite index in migrations |
| `notifications(user_id, dedupe_key)` | ⚠️ | Add if dedupe_key used |
| `families(owner_id)` | ✅ | Present |
| `medicine_reminders(family_id, active, time_of_day)` | 🔲 | Add composite |
| `security_requests(family_id, status, created_at DESC)` | 🔲 | Add + partial `WHERE status='open'` |
| Materialized dashboard stats | 🔲 | `metrics_hourly` MV added; extend for dashboard |
| Partition notifications/audit | 🔲 | When >10M rows |
| Archive audit_logs >12mo | 🔲 | pg_cron job |

---

## B4. Realtime

| Check | Status | Finding |
|-------|--------|---------|
| Unsubscribe on unmount | ✅ | `OpenSosCard`, `SosTicketDrawer` call `removeChannel` |
| DB-level filter | ✅ | `filter: request_id=eq.${id}` |
| Max 10 channels/user | ❌ | No client-side limit | Add channel registry in hook |

---

## Priority action items

1. **P0** — Lazy-load routes (`chi-tieu_.scan`, `security` dashboard).
2. **P0** — Deploy Edge Functions (`scan-receipt`, `log-ingest`, `health-check`).
3. **P1** — Partial index on open `security_requests`.
4. **P1** — Virtualize notification + expense lists.
5. **P2** — Query persist + offline cache.
6. **P2** — Cursor pagination for notifications.
