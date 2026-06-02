# Mobile go-live checklist (Family OS)

Phần **Cursor / mobile monorepo** vs **DevOps / Lovable Dashboard** (tách rõ trách nhiệm).

---

## A. Env mobile (`.env` — đồng bộ Lovable)

**`apps/family/.env`**

```env
VITE_SUPABASE_URL=https://bigarvjahnxiuovepaxm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_AUTH_REDIRECT_URL=vn.unicom.stos.family://auth
VITE_APP_TARGET=family
VITE_SENTRY_DSN=
VITE_PILOT_PREFILL=true
```

**`apps/guard/.env`**

```env
VITE_SUPABASE_URL=https://bigarvjahnxiuovepaxm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_AUTH_REDIRECT_URL=vn.unicom.stos.guard://auth
VITE_APP_TARGET=guard
VITE_SENTRY_DSN=
VITE_PILOT_PREFILL=true
```

| Biến | Trạng thái |
|------|------------|
| Supabase URL + anon key | ✅ Đã có trong `.env` local |
| `VITE_SENTRY_DSN` | ⚠️ **Chưa có** — app vẫn chạy; Sentry no-op khi DSN rỗng |
| `VITE_ENABLE_LOGGING` | Tùy chọn dev; prod APK dùng `PROD=true` |

### Lấy `VITE_SENTRY_DSN`

1. [sentry.io](https://sentry.io) → Create project → **React** (hoặc 1 project + tag `app: family|guard`)
2. **Settings → Client Keys (DSN)** → copy URL dạng `https://xxx@xxx.ingest.sentry.io/xxx`
3. Dán vào cả hai `.env` (có thể dùng chung 1 DSN) + GitHub secret `VITE_SENTRY_DSN` cho CI

### Bảo mật go-live prod

- `VITE_PILOT_PREFILL=false` — tắt auto-fill tài khoản demo
- `VITE_SENTRY_DSN` — **public OK** (DSN không phải secret)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — **anon key public OK**, RLS bảo vệ data
- **KHÔNG BAO GIỜ** đặt `SUPABASE_SERVICE_ROLE_KEY` vào mobile app

**CI secrets** (`.github/workflows/mobile-build.yml`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SENTRY_DSN` (khi có).

---

## B. Supabase Dashboard — Auth redirect (DevOps, Lovable không sửa)

**Authentication → URL Configuration → Redirect URLs:**

```
vn.unicom.stos.family://auth
vn.unicom.stos.guard://auth
capacitor://localhost
```

---

## C. Sentry (đã wire trong code)

- `@sentry/capacitor` + `@sentry/react` — init tại `apps/*/src/init-sentry.ts`
- `tracesSampleRate: 0.2`
- `beforeSend` scrub PII (phone VN, email, JWT) — `packages/shared-utils/src/pii-scrub.ts`
- Root bọc `SentryAppRoot` (`ErrorBoundary`) — `packages/shared-ui/src/mobile/SentryAppRoot.tsx`

**Cần làm:** Tạo 2 project Sentry (hoặc 1 project + tag `app`) → copy DSN vào `.env` và CI secret.

---

## D. log-ingest E2E test

```bash
# Sau khi login app hoặc Supabase Auth, lấy access_token
export USER_JWT="eyJ..."
export VITE_SUPABASE_PUBLISHABLE_KEY="eyJ...anon..."
node scripts/verify-log-ingest.mjs
```

Verify trong **Database → app_logs**:

- [ ] `user_id` = uid người đăng nhập
- [ ] `request_id` = UUID script in ra
- [ ] `message` có `[REDACTED]` (không còn `0901234567` / email thô)

---

## E. Pilot login — 4 tài khoản (mật khẩu `Demo@12345`)

| Email | App | Role | Sau login mong đợi |
|-------|-----|------|-------------------|
| `giadinh@securitytech.vn` | **STOS Family** | `family_owner` | `/home` — bottom nav 5 tab (Trang chủ, Gia đình, Bảo an SOS, Cộng đồng, Tài khoản) |
| `thanhvien@securitytech.vn` | **STOS Family** | `family_member` | `/home` — cùng menu Family (quyền RLS theo member) |
| `baove@securitytech.vn` | **STOS Guard** | `security_admin` | `/guard` — nav 4 tab Guard |
| `nhanvienbaove@securitytech.vn` | **STOS Guard** | `security_staff` | `/guard` — nav 4 tab Guard |

**Không đổi app:** tài khoản Guard trên Family app → lỗi đăng nhập / redirect sai (by design).

Checklist manual trên APK:

- [ ] Family + giadinh → thấy STOS Life, menu 5 tab
- [ ] Family + thanhvien → vào được `/home`
- [ ] Guard + baove → thấy STOS Guard, menu 4 tab
- [ ] Guard + nhanvienbaove → vào được `/guard`

---

## F. Build APK / CI

```bash
npm run android:family:debug   # local pilot
npm run android:guard:debug
```

GitHub Actions: tag `family-v*` / `guard-v*` hoặc workflow_dispatch — cần secrets Supabase (+ Sentry DSN khi bật).

---

## G. Hạ tầng (DevOps — không thuộc Cursor)

- [ ] Lovable Cloud Team + PITR
- [ ] Cloudflare WAF + Turnstile (domain published)
- [ ] Better Stack ← `health_checks`, `system_alerts`, `app_logs`
- [ ] Telegram/Slack bot poll `system_alerts WHERE acknowledged=false`

---

## H. Code references

| Thành phần | Path |
|------------|------|
| Logger + JWT | `packages/shared-utils/src/logger.ts` |
| PII scrub | `packages/shared-utils/src/pii-scrub.ts` |
| Sentry config | `packages/shared-utils/src/sentry-config.ts` |
| Sentry init | `apps/family/src/init-sentry.ts`, `apps/guard/src/init-sentry.ts` |
| Error boundary | `packages/shared-ui/src/mobile/SentryAppRoot.tsx` |
| Verify script | `scripts/verify-log-ingest.mjs` |
