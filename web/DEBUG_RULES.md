# DEBUG RULES — Quy trình debug bắt buộc cho AI agent

> Khi user nói **"check bug X"**, agent PHẢI làm theo đúng các bước dưới đây.
> Không tự ý refactor lớn. Không nói "đã fix" nếu chưa verify bằng signal.

---

## 1. Phân loại bug → xác định layer

| Triệu chứng | File / công cụ bắt đầu |
|---|---|
| UI sai, không hiển thị | `src/routes/`, `src/components/`, `src/features/` |
| Data sai / không load | `src/lib/*.functions.ts` + `supabase--read_query` |
| Auth / redirect sai | `src/lib/auth.functions.ts`, `src/lib/resolve-destination.ts`, `src/routes/login.tsx`, `src/routes/__root.tsx` |
| Mobile gọi API lỗi | `supabase/functions/<name>/index.ts` + `supabase--edge_function_logs` |
| RLS / migration | `supabase--linter` + `supabase--analytics_query` (postgres_logs) |
| Performance chậm | `supabase--db_health` + `browser--performance_profile` |
| Cron không chạy | `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;` |
| Hệ thống degraded | `SELECT * FROM public.system_alerts WHERE NOT acknowledged ORDER BY created_at DESC;` |

---

## 2. Thu thập signal (parallel, KHÔNG đoán)

Chạy song song khi có thể:
- `code--read_runtime_errors`
- `code--read_console_logs`
- `code--read_network_requests`
- `stack_modern--server-function-logs` (cho serverFn)
- `supabase--edge_function_logs` (cho edge function)
- `supabase--analytics_query` (DB / auth logs)

---

## 3. Định vị file theo bảng routing

| Layer | Đường dẫn |
|---|---|
| Page route | `src/routes/<path>.tsx` |
| ServerFn | `src/lib/<domain>.functions.ts` |
| Edge Function | `supabase/functions/<name>/index.ts` |
| Migration / RLS | `supabase/migrations/*.sql` |
| Types (read-only) | `src/integrations/supabase/types.ts` |
| Cron job | `cron.job` table (managed qua `supabase--insert`) |

---

## 4. Reproduce TRƯỚC khi fix

- `supabase--curl_edge_functions` — test edge
- `stack_modern--invoke-server-function` — test serverFn
- `supabase--read_query` — verify data

---

## 5. Fix → Verify

- Sửa surgical bằng `code--line_replace`, không rewrite cả file.
- Chạy lại signal ở bước 2 để xác nhận fix.
- KHÔNG nói "đã fix" nếu chưa thấy signal xanh.

---

## 6. Nếu loop > 3 lần cùng lỗi

- Đổi approach, không tự refactor lớn.
- Dùng `vent--send_feedback` nếu là tooling friction.
- Báo user, hỏi rõ phạm vi.

---

## 7. Production observability — endpoints anh có

- **Edge functions**: `log-ingest` (mobile, verify_jwt=true), `health-check` (cron, apikey), `metrics-aggregate` (cron, apikey), `scan-receipt` (verify_jwt=true).
- **Bảng quan trọng**: `app_logs` (log mobile, TTL 30 ngày), `health_checks`, `system_alerts`, `metrics_hourly` (đã REVOKE khỏi anon/authenticated).
- **Cron jobs**: `health-check-1m`, `metrics-aggregate-5m`, `health-alerts-2m`, `cleanup-app-logs-daily`.
- **Correlation ID**: header `x-request-id` xuyên suốt mobile → log-ingest → app_logs.request_id.

---

## 8. Rule cấm

- Không thêm rate-limiting backend (chưa có primitive — workspace rule).
- Không sửa `auth/storage/realtime/supabase_functions/vault` schemas.
- Không tạo Edge Function mới cho logic nội bộ — dùng `createServerFn` của TanStack.
- Không edit `src/routeTree.gen.ts`, `src/integrations/supabase/{client,types,client.server,auth-*}.ts`, `.env`.
