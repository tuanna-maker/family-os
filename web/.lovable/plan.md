# Family Expense Management Module — Plan

Đây là module **rất lớn** (26 sections, 12+ entities, OCR async pipeline, AI insights, entitlement, governance dashboard, offline sync...). Không thể build hết trong 1 lượt. Đề xuất chia phase và **bắt đầu Phase 1 ngay** sau khi bạn duyệt.

## Phase 1 — Foundation (MVP FREE, ship được, ~1 lượt)
Mục tiêu: Hộ gia đình ghi chi tiêu thủ công + xem tháng + ngân sách cơ bản. KHÔNG OCR, KHÔNG AI.

**Database (migration 1)**:
- `expense_categories` (seed 8 cat mặc định: Ăn uống, Nhà cửa, Con cái, Thú cưng, Y tế, Di chuyển, Giải trí, Khác — icon + color)
- `household_expenses` (family_id, category_id, amount, merchant, txn_date, payer_id, payment_method, note, receipt_url, is_recurring, is_shared)
- `expense_budgets` (family_id, month, total_budget, per-category JSON)
- RLS: family member CRUD, owner full
- Storage bucket `expense-receipts` (private) + policies
- Audit dùng `log_audit` sẵn có

**Routes (mobile-first, Vietnamese)**:
- `/resident/family/expenses` — Dashboard: Monthly Summary Card + Donut + Category Grid + Recent Transactions + Bottom Action Bar
- `/resident/family/expenses/new` — Form thêm chi tiêu (manual + upload ảnh receipt thuần, không OCR)
- `/resident/family/expenses/budget` — Set ngân sách tháng + theo category
- `/resident/family/expenses/reports` — Trend 6 tháng + breakdown category/member/merchant
- `AIInsightCard` ở dashboard hiển thị **locked state** với CTA "Nâng cấp Premium"
- `OCRQuotaBanner` placeholder locked

**Server functions** (`createServerFn` + `requireSupabaseAuth`):
- `listExpenses`, `createExpense`, `updateExpense`, `deleteExpense`
- `getMonthlySummary`, `getCategoryBreakdown`, `getTrend`
- `getBudget`, `upsertBudget`

**Components**: ExpenseSummaryCard, ExpenseDonutChart, AIInsightCard (locked), ExpenseCategoryGrid, RecentTransactionsList, BudgetProgressCard, BottomActionBar

## Phase 2 — Sharing & Permissions + Recurring
- `expense_share_permissions`, `expense_recurring_rules`
- `/resident/family/expenses/share` — permission matrix
- Recurring engine + notifications hook vào `notifications` table sẵn có

## Phase 3 — OCR Pipeline (Premium)
- `receipt_ocr_jobs`, `receipt_ocr_results`, `receipt_ocr_quota`
- `ai_entitlements` (tenant/household scope)
- Server route `/api/public/hooks/ocr-worker` (queue worker, gọi Lovable AI Gemini Vision)
- pg_cron tick mỗi 30s xử OCR jobs `queued`
- UI: ReceiptOcrFlow, quota banner, auto-fill form

## Phase 4 — AI Insights (Premium)
- `expense_ai_insights` cache
- Server fn `generateInsights` dùng `google/gemini-2.5-flash` qua LOVABLE_API_KEY
- Anomaly detection (so sánh tháng), suggestions
- Unlock AIInsightCard khi entitlement ON

## Phase 5 — Governance Dashboard
- `/family/expenses-governance` — chỉ aggregate, không PII
- Materialized view roll-up theo tenant/project

## Phase 6 — Offline + Storage lifecycle + Notifications nâng cao
- IndexedDB queue cho create expense offline
- Thumbnail generation (sharp KHÔNG dùng được trên Worker → dùng Lovable AI image edit hoặc client-side canvas)
- Lifecycle cleanup cron

## Quyết định kỹ thuật quan trọng
- **AI/OCR**: dùng Lovable AI Gateway (`google/gemini-2.5-flash` cho insight, `google/gemini-2.5-pro` cho OCR vision) — KHÔNG cần secret từ user
- **Async OCR**: pg_cron tick worker route `/api/public/hooks/*` thay vì queue ngoài
- **Thumbnail**: client-side canvas resize trước upload (sharp không chạy được trên Cloudflare Worker)
- **Entitlement**: bảng `ai_entitlements` scope theo `household_id` (mặc định FREE)

---

**Đề nghị**: Bắt đầu **Phase 1** ngay. Bạn duyệt plan này thì tôi ship Phase 1 (1 migration + ~10 file routes/components/serverFn). Các phase sau làm tuần tự theo lệnh "Bước tiếp".

Có muốn điều chỉnh scope Phase 1 không (ví dụ gộp thêm share/recurring, hoặc tách nhỏ hơn)?