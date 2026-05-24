# SECURITY_HARDENING.md

> RLS audit + mobile auth + Edge Function security · 2026-05-23

## D1. RLS (database)

### Helper functions (SECURITY DEFINER — no recursion)

Defined in `20260519070331_*.sql`:

- `public.has_role(_user_id, _role)` ✅
- `public.is_family_member(_user_id, _family_id)` ✅
- `public.is_super_admin(_user_id)` ✅

Policies use these helpers — **not** inline `user_roles` subqueries (avoids recursion).

### RLS enabled (sample)

| Table | RLS | Policy pattern |
|-------|-----|----------------|
| `families` | ✅ | owner + member |
| `expenses` | ✅ | `is_family_member` |
| `security_requests` | ✅ | requester + security roles |
| `notifications` | ✅ | `user_id = auth.uid()` |
| `medicine_reminders` | ✅ | family scoped |
| `app_logs` (new) | ✅ | service insert; super_admin read |

### RLS test procedure

```sql
SET request.jwt.claims = '{"sub": "<family-a-uuid>", "role": "authenticated"}';
SELECT * FROM expenses;  -- expect only family A rows

SET request.jwt.claims = '{"sub": "<family-b-uuid>", "role": "authenticated"}';
SELECT * FROM expenses;  -- expect zero rows from family A
```

### Findings & fixes

| ID | Severity | Finding | Fix |
|----|----------|---------|-----|
| RLS-01 | Medium | `app_logs` readable only by super_admin | ✅ Migration applied |
| RLS-02 | Low | Some legacy web tables (BQL) not in mobile scope | Document exclusion |
| RLS-03 | Medium | No automated RLS test in CI | Add `supabase test db` job |

---

## D2. Auth (mobile)

| Check | Status | Implementation |
|-------|--------|----------------|
| Session storage | ✅ | `@capacitor/preferences` via `@shared/supabase/storage.ts` |
| Not localStorage (native) | ✅ | Falls back to localStorage web dev only |
| Deep link auth | ✅ | `vn.unicom.stos.family://auth`, `vn.unicom.stos.guard://auth` |
| Biometric lock | 🔲 | Add `@capacitor-community/biometric-auth` |
| Auto-logout 30min idle | 🔲 | `@capacitor/app` state + timer |
| Refresh token rotation | ✅ | Supabase default; verify revoke on logout |

---

## D3. Edge functions

| Check | Status | Notes |
|-------|--------|-------|
| JWT verify | ⚠️ | Enable `verify_jwt = true` in config.toml per function |
| Zod validation | ⚠️ | Add to `log-ingest`, `scan-receipt` |
| Rate limit 60/min | 🔲 | `rate_limits` table in observability migration |
| CORS | ⚠️ | Allow `capacitor://localhost`, `https://localhost`, app schemes |
| No PII in logs | ⚠️ | Strip email/phone in log-ingest sanitizer (TODO) |

### CORS allowlist (recommended)

```
capacitor://localhost
http://localhost:*
https://localhost:*
vn.unicom.stos.family://*
vn.unicom.stos.guard://*
```

---

## D4. Data protection

| Check | Status |
|-------|--------|
| Supabase at-rest encryption | ✅ (platform) |
| Health/financial RLS strict | ✅ family-scoped |
| Audit log on sensitive read | 🔲 Add trigger on `health_records` SELECT |
| GDPR export | 🔲 Edge `user-data-export` |
| Account delete cascade | 🔲 Trigger + anonymize audit |

---

## D5. Mobile binary

| Check | Status | Action |
|-------|--------|--------|
| Android minify | ⚠️ | Set `minifyEnabled true` in release buildType |
| iOS bitcode | N/A | Deprecated; use dSYM |
| Certificate pinning | 🔲 | `@ionic-enterprise/secure-storage` or native plugin |
| Root/jailbreak detect | 🔲 | `@capacitor-community/device-security-detect` |
| No console.log prod | ❌ | Vite `esbuild.drop: ['console']` in prod |

### Recommended `vite.config.ts` prod

```ts
build: {
  minify: 'esbuild',
  esbuild: { drop: ['console', 'debugger'] },
}
```

---

## D6. Supply chain

| Check | Status |
|-------|--------|
| `npm audit` in CI | ✅ `.github/workflows/test.yml` |
| Dependabot | 🔲 Add `.github/dependabot.yml` |
| Pin Capacitor exact | ⚠️ Currently `^6.x` — pin to patch in release branch |

### Dependabot template

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule: { interval: weekly }
```

---

## Mobile vs server boundary (golden rule)

| Logic | Where |
|-------|-------|
| CRUD with RLS | Supabase JS in app |
| Secrets / AI / bulk | Edge Function (Deno) |
| Scheduled / alerts | pg_cron + Edge |
| Admin web (BQL/SaaS) | Legacy TanStack Start (not mobile) |

---

## Immediate fixes applied

1. Observability tables with RLS (`app_logs`, `rate_limits`, `health_checks`)
2. Capacitor Preferences auth storage (existing)
3. URL schemes in Info.plist (native setup script)
4. CI audit gate (high CVE warning)

## Next hardening sprint

1. Enable JWT verify on all Edge Functions
2. Biometric + idle logout
3. RLS integration tests in CI
4. ProGuard + strip console in release builds
5. Certificate pinning for Supabase domain
