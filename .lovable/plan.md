
# STOS Life — Re-Architect thành Residential Community Operating System

Định vị lại: STOS Life **không phải** Family App. Đây là **nền tảng vận hành cộng đồng cư dân đa tenant** với 5 workspace ngang hàng, trong đó Family Core chỉ là 1 domain.

## 1. Kiến trúc 5 Workspace

```
/console/*    A. PLATFORM CONSOLE      — Super Admin, Platform Ops, Billing, Support, Auditor
/ops/*        B. COMMUNITY OPERATIONS  — BQL Manager, Lễ tân, Vận hành, Kỹ thuật, Kế toán
/security/*   C. SECURITY OPERATIONS   — Security Director, Supervisor, Guard, Patrol
/app/*        D. RESIDENT SERVICES     — Resident, Household member, Helper
/family/*     E. FAMILY CORE (gov)     — Tenant Admin quản trị nhiều hộ gia đình
/workspaces   Workspace picker theo role
/login, /demo-login
```

Hierarchy dữ liệu bắt buộc:
`Platform → Tenant → Project → Building → Block → Floor → Apartment → Household → Resident`

Family Core nằm **dưới** Household, không phải root.

## 2. Thay đổi so với hiện trạng

Hiện tại đã có `/console` (Platform Console với 5 nhóm sidebar gộp chung). Sai định vị — phải **tách** Operations và Security thành workspace riêng vì user, dashboard, KPI, ngôn ngữ vận hành khác nhau hoàn toàn.

| Hiện tại | Mới |
|---|---|
| `/console` (gộp 5 nhóm) | `/console` chỉ còn nhóm PLATFORM |
| nhóm "Vận hành" trong console | `/ops/*` workspace riêng |
| nhóm "An ninh" trong console | `/security/*` workspace riêng |
| nhóm "Dịch vụ cư dân" governance | xoá khỏi console — đã có /app |
| nhóm "Family Core" trong console | `/family/*` workspace governance riêng |
| `/bql/*` legacy | redirect → `/ops/*` |
| `/saas/*` legacy | redirect → `/console/*` |
| `/admin/family*` legacy | redirect → `/family/*` |

## 3. Phase

### Phase 1 — Tách 5 Workspace Shell + Sidebar (deliver ngay)

1. **Roles mở rộng** (`src/constants/permissions.ts`): thêm `platform_ops`, `billing_admin`, `support`, `auditor`, `security_director`, `security_supervisor`, `guard_captain`, `patrol`, `receptionist`, `ops_staff`, `tech_staff`, `finance_staff`, `household_member`, `helper`.
2. **5 navigation manifest** (`src/constants/workspace-nav.ts`): PLATFORM_NAV, OPS_NAV, SECURITY_NAV, RESIDENT_NAV, FAMILY_NAV — mỗi cái đúng spec sidebar trong prompt.
3. **Workspace shells** (tái dùng `ConsoleShell` đã có, đổi tên + tham số hoá):
   - `PlatformShell` (light, white, blue accent)
   - `OpsShell` (light, dispatch-center feel, deep blue header strip)
   - `SecurityShell` (dark professional, command-center, status indicators)
   - `ResidentShell` (mobile-first, đã có `MobileShell` — wrap lại)
   - `FamilyGovShell` (light enterprise, tenant filter prominent)
4. **Layout routes**:
   - `src/routes/console.tsx` (rewrite — chỉ PLATFORM nav)
   - `src/routes/ops.tsx` + `ops.index.tsx`
   - `src/routes/security.tsx` + `security.index.tsx`
   - `src/routes/family.tsx` + `family.index.tsx`
   - `src/routes/app.tsx` (gom resident routes hiện tại)
5. **Workspace picker** (`/workspaces`): rewrite hiển thị 5 workspace, lọc theo role.
6. **Dashboard placeholders** mỗi workspace (KPI strip + alerts + empty-state các module chưa làm) — không build sâu Phase 1.
7. **Legacy redirects**: `/bql/*` → `/ops/*`, `/saas/*` → `/console/*`, `/admin/family*` → `/family/*`, `/admin/elderly-care` etc → `/family/elderly-care`. Dùng `beforeLoad` redirect.

### Phase 2 — Platform Dashboard + Ops Dashboard hoàn chỉnh
- Giữ widgets dashboard hiện có (`KpiStrip`, `GrowthChart`, `PerformanceTriad`, `AlertsPanel`, `ProjectMap`) → di chuyển vào `/console/index.tsx` đúng định vị PLATFORM.
- Build OPS dashboard: SLA tickets, occupancy, fee collection, complaints queue.

### Phase 3 — Security Operations Console
- Sidebar Security đầy đủ 11 mục.
- Dashboard: guards online, patrol checkpoints map, QR scans/h, incident queue, emergency button, watchlist alerts.
- Theme dark command-center.

### Phase 4 — Family Core governance + Resident Portal polish
- Family Core: enterprise table multi-household (tenant filter, project filter, quota, consent, audit).
- Resident `/app/*`: gom routes `qr-vao-ra`, `dich-vu`, `thanh-toan`, `thong-bao`, `tai-khoan` vào mobile shell.

### Phase 5 — Dọn legacy + multi-tenant scope
- Xoá `/portal`, `/home`, `/dashboard`, `/bao-an`, các route trùng.
- Ensure mọi mock data có `tenantId/projectId/buildingId/apartmentId/householdId`.
- `useScopedCollection` mở rộng cho 5 workspace scope.

## 4. Câu hỏi trước khi triển khai

1. **Phase 1 (5 shell + nav + placeholder + redirect)** trước, đúng chứ? Hay làm Phase 1+2 cùng lúc (Console + Ops dashboard đầy đủ)?
2. **Security workspace dark theme** (command-center feel) hay light đồng nhất với các shell khác?
3. **Giữ redirect alias `/bql`→`/ops`, `/saas`→`/console`** trong 1-2 sprint hay xoá luôn?

Mặc định nếu duyệt không trả lời: **Phase 1, Security dark, giữ redirect alias.**
