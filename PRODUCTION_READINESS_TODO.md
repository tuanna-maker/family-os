# Production Readiness — Todo & Prompts

> Tổng hợp 6 việc còn lại sau Prompt 4 (test + audit).  
> **Edge Functions deploy:** giao **Lovable** — dùng [Prompt 6](#6-deploy-edge-functions--lovable) bên dưới.

---

## Todo list

| # | Việc | Owner | Trạng thái | Phụ thuộc |
|---|------|-------|-----------|-----------|
| 1 | [Tests `security.ts`](#1-tests-securityts) | Dev / Cursor | ✅ Xong | — |
| 2 | [RTL tests routes/components](#2-rtl-tests-routescomponents) | Dev / Cursor | ✅ Xong | — |
| 3 | [RLS integration tests (Supabase local)](#3-rls-integration-tests-supabase-local) | Dev / Cursor | ✅ Xong | Supabase CLI + seed |
| 4 | [Bật coverage threshold 80%](#4-bật-coverage-threshold-80) | Dev / Cursor | ✅ Xong | #1, #2 |
| 5 | [Wire `initLogger()` vào `main.tsx`](#5-wire-initlogger-vào-maintsx) | Dev / Cursor | ✅ Xong | #6 (URL Edge) khuyến nghị |
| 6 | [Deploy Edge Functions](#6-deploy-edge-functions--lovable) | **Lovable** | 🔄 Sẵn sàng deploy | `DEPLOY_EDGE_FUNCTIONS.md` + `config.toml` |

Cập nhật cột **Trạng thái**: ⬜ Chưa làm → 🔄 Đang làm → ✅ Xong.

---

## 1. Tests `security.ts`

### Mục tiêu

Coverage `apps/family/src/api/security.ts` và `apps/guard/src/api/security.ts` cho:

- `listOpenSos` — filter `open`/`in_progress`, map `payload.priority`
- `updateSosStatus` — status transition + `sos_events` insert
- `getSecurityStatus` — chips + tone theo `family_id`
- `createSecurityRequest` — đã có; bổ sung assert `request_type`

### Prompt (copy cho agent)

```text
Trong monorepo family-os, bổ sung unit tests Vitest cho security API:

- apps/family/tests/unit/security.test.ts
- apps/guard/tests/unit/security.test.ts

Dùng @shared/test-utils/mock-supabase và vi.mock('@shared/supabase/auth').

Cover: listOpenSos, updateSosStatus, addSosNote, getSecurityStatus (family), createSecurityRequest (sos/fire/intrusion).

Chạy npm run test -w @apps/family && npm run test -w @apps/guard — phải PASS.

Tham chiếu implementation: apps/*/src/api/security.ts
```

### Done khi

- [ ] ≥5 test cases mới cho guard `security.ts` (listOpenSos đã có)
- [ ] Family `security.ts` line coverage > 40% (hướng tới 80% file)
- [ ] `npm run test` PASS cả 2 app

---

## 2. RTL tests routes/components

### Mục tiêu

Smoke RTL cho shell mobile, không cần Supabase live:

- `MobileShell`, `BottomNav` (`@shared/ui/mobile/`)
- 1 route mỗi app: Family `/home`, Guard `/guard/` (mock router + auth)

### Prompt (copy cho agent)

```text
Thêm React Testing Library tests trong apps/family/tests/unit/components/ và apps/guard/tests/unit/components/:

- Render MobileShell + BottomNav với MemoryRouter / TanStack Router test utils
- Mock useAuth (logged in), useFamilyContext (family app)
- Assert nav links tồn tại (aria-label / text tiếng Việt)

Không gọi Supabase thật. Dùng setupTests.ts sẵn có.

Chạy npm run test -w @apps/family và @apps/guard.
```

### Done khi

- [ ] ≥2 RTL files mỗi app
- [ ] Tests PASS
- [ ] Ghi trong TEST_REPORT.md mục RTL

---

## 3. RLS integration tests (Supabase local)

### Mục tiêu

Chứng minh **family_owner A** không đọc được `expenses` của **family B** (RLS thật).

### Prompt (copy cho agent)

```text
Tạo apps/family/tests/integration/rls-family-isolation.test.ts (hoặc scripts/test-rls.sql + vitest skip nếu không có local):

1. Dùng TEST_ACCOUNTS từ @shared/test-utils/test-accounts (giadinh@ / lean@ — Demo@12345)
2. supabase start + supabase db reset (document trong README)
3. signInWithPassword user A → select expenses where family_id = B → expect [] hoặc error
4. Optional: SET request.jwt.claims trong SQL test via supabase test

Mark test describe.skipIf(!process.env.SUPABASE_LOCAL) để CI không fail khi không có local.

Cập nhật TEST_REPORT.md.
```

### Done khi

- [ ] Script hoặc test integration có hướng dẫn chạy local
- [ ] CI: skip khi không có `SUPABASE_LOCAL=1`
- [ ] Document trong `TEST_REPORT.md`

---

## 4. Bật coverage threshold 80%

### Mục tiêu

Sau #1 và #2, bật lại gate trong `vitest.config.ts`:

```ts
thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 }
```

Scope: `include` chỉ các file đã có test (xem `apps/family/vitest.config.ts`).

### Prompt (copy cho agent)

```text
Chạy npm run test:coverage -w @apps/family và @apps/guard.

Bổ sung tests cho đến khi coverage scope trong vitest.config.ts đạt thresholds 80%.

Bật lại coverage.thresholds trong apps/family/vitest.config.ts và apps/guard/vitest.config.ts.

Cập nhật TEST_REPORT.md với số % cuối.

CI .github/workflows/test.yml: fail job nếu coverage dưới ngưỡng (bỏ continue-on-error nếu có).
```

### Done khi

- [ ] `npm run test:coverage` PASS cả 2 app (không ERROR threshold)
- [ ] CI vitest job green

---

## 5. Wire `initLogger()` vào `main.tsx`

### Mục tiêu

Gọi `initLogger({ app: 'family' | 'guard' })` khi app boot; log navigation qua router.

### Prompt (copy cho agent)

```text
Trong apps/family/src/main.tsx và apps/guard/src/main.tsx:

1. import { initLogger, logger } from '@shared/utils/logger'
2. initLogger({ app: 'family' | 'guard', ingestUrl: '/functions/v1/log-ingest' })
3. Sau createRouter: router.subscribe('onResolved', ({ toLocation }) => logger.navigation(toLocation.pathname))

Chỉ gửi log khi import.meta.env.PROD hoặc VITE_ENABLE_LOGGING=true (tránh noise dev).

Không log PII. Cập nhật OBSERVABILITY_PLAN.md checklist.
```

### Done khi

- [ ] Logger init cả 2 app
- [ ] Navigation events (prod hoặc flag)
- [ ] Build PASS: npm run build -w @apps/family && @apps/guard

---

## 6. Deploy Edge Functions — Lovable

> **Bạn dùng Lovable chỉ để cập nhật Supabase** — không paste mỗi prompt dưới đây.  
> **Gửi đúng gói:** [LOVABLE_SUPABASE_DEPLOY.md](./LOVABLE_SUPABASE_DEPLOY.md) (prompt + **đủ 5 file** migration + 3 Edge Functions + config).

### File cần gửi Lovable (từ repo `family-os`)

| # | Gửi nội dung | Đường dẫn local |
|---|--------------|-----------------|
| 1 | Migration SQL | `supabase/migrations/20260523120000_observability.sql` |
| 2 | Edge `log-ingest` | `supabase/functions/log-ingest/index.ts` |
| 3 | Edge `health-check` | `supabase/functions/health-check/index.ts` |
| 4 | Edge `metrics-aggregate` | `supabase/functions/metrics-aggregate/index.ts` |
| 5 | Config snippet | `supabase/config.toml` (mục `[functions.*]`) |

**Không gửi:** `apps/*`, `packages/*`, prompt §6 cũ không kèm file.  
**Không nhờ Lovable:** port TanStack routes / `src/lib/logger.ts` trên app Lovable.

### Prompt + nội dung file đầy đủ

→ Xem **[LOVABLE_SUPABASE_DEPLOY.md](./LOVABLE_SUPABASE_DEPLOY.md)** (copy PROMPT + FILE 1–5).

### ~~Prompt cũ (chỉ tham chiếu — không đủ nếu paste một mình)~~

```markdown
# Task: Deploy Supabase Edge Functions + migration observability — STOS Family OS

## Context

Monorepo `family-os` đã có code sẵn trong repo (chưa deploy):

- `supabase/migrations/20260523120000_observability.sql` — tables: app_logs, request_traces, health_checks, rate_limits, metrics_hourly + RLS
- `supabase/functions/log-ingest/index.ts` — POST batch logs từ mobile
- `supabase/functions/health-check/index.ts` — cron probe DB/auth
- `supabase/functions/metrics-aggregate/index.ts` — gọi RPC refresh_metrics_views()
- Mobile client: `packages/shared-utils/src/logger.ts` → POST `/functions/v1/log-ingest`

Supabase project_id (config.toml): `bigarvjahnxiuovepaxm`

## Yêu cầu

1. **Apply migration** `20260523120000_observability.sql` lên project Supabase đang dùng (staging/prod theo env Lovable).

2. **Deploy Edge Functions** (Deno):
   - `log-ingest` — verify JWT: có thể `verify_jwt = false` + validate service role trong function HOẶC verify_jwt true và đọc user từ JWT. Sanitize: không lưu email/password vào `context`.
   - `health-check` — dùng `SUPABASE_SERVICE_ROLE_KEY`; schedule cron **mỗi 1 phút**
   - `metrics-aggregate` — schedule cron **mỗi 5 phút**

3. **Cấu hình `supabase/config.toml`** (nếu chưa có):

```toml
[functions.log-ingest]
verify_jwt = false

[functions.health-check]
verify_jwt = false

[functions.metrics-aggregate]
verify_jwt = false
```

4. **CORS** cho mobile (trong function hoặc Supabase dashboard):
   - `capacitor://localhost`
   - `https://localhost`
   - Custom schemes: `vn.unicom.stos.family`, `vn.unicom.stos.guard`

5. **Deploy function `scan-receipt`** (nếu chưa có) — mobile Family app gọi `supabase.functions.invoke('scan-receipt')` từ `apps/family/src/api/scan-receipt.ts`. Cần secret OpenAI/vision trong Supabase secrets.

6. **Scheduled triggers** — bật Supabase Cron:
   - `health-check`: `*/1 * * * *`
   - `metrics-aggregate`: `*/5 * * * *`

7. **Secrets** (Supabase Dashboard → Edge Functions → Secrets):
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (auto)
   - `OPENAI_API_KEY` hoặc tương đương cho `scan-receipt` (nếu deploy)

## Verify sau deploy

```bash
# Health
curl -X POST "$SUPABASE_URL/functions/v1/health-check" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"

# Log ingest
curl -X POST "$SUPABASE_URL/functions/v1/log-ingest" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"logs":[{"level":"info","message":"test","app":"family","session_id":"test","ts":"2026-05-23T00:00:00Z"}]}'

# Scan receipt (cần JWT user hợp lệ + image base64)
# invoke từ app hoặc curl với user JWT
```

## Deliverable từ Lovable

- [ ] Confirmation migration applied (screenshot hoặc `supabase migration list`)
- [ ] 3–4 functions deployed + URLs
- [ ] Cron jobs enabled
- [ ] `scan-receipt` deployed hoặc note nếu đã có sẵn trên project
- [ ] Ghi secrets đã set (không paste giá trị secret vào chat)

## Không làm

- Không đổi logic mobile app trừ khi cần fix URL env (`VITE_SUPABASE_URL`)
- Không xóa migration cũ

## Tài liệu tham chiếu trong repo

- `OBSERVABILITY_PLAN.md`
- `SECURITY_HARDENING.md` (mục Edge functions CORS/JWT)
- `apps/family/src/api/scan-receipt.ts`
```

### Done khi (bạn xác nhận sau Lovable)

- [ ] Migration observability trên Supabase
- [ ] `log-ingest`, `health-check`, `metrics-aggregate` live
- [ ] Cron chạy (có row trong `health_checks`)
- [ ] `scan-receipt` live (nếu chưa có)
- [ ] Mobile `.env` trỏ đúng `VITE_SUPABASE_URL`

---

## Thứ tự thực hiện đề xuất

```
6 (Lovable) ──► 5 (initLogger)     ← có URL Edge thật
1 (security tests) ──► 2 (RTL) ──► 4 (threshold 80%)
3 (RLS local) — song song, không block
```

---

## Liên kết tài liệu

| File | Nội dung |
|------|----------|
| [TEST_REPORT.md](./TEST_REPORT.md) | Coverage hiện tại, gaps |
| [SCALABILITY_AUDIT.md](./SCALABILITY_AUDIT.md) | Bundle, pagination, indexes |
| [OBSERVABILITY_PLAN.md](./OBSERVABILITY_PLAN.md) | Logger + Edge architecture |
| [SECURITY_HARDENING.md](./SECURITY_HARDENING.md) | RLS, JWT, CORS, mobile |
| [REMAINING_CROSS_IMPORTS.md](./REMAINING_CROSS_IMPORTS.md) | Cross-import monorepo |
