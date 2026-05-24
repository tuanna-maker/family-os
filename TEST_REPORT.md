# TEST_REPORT.md — Family & Guard Apps

> Updated: 2026-05-23 · Monorepo `apps/family`, `apps/guard`

## Summary

| App | Unit tests | Status | Coverage scope (`vitest.config` API modules) |
|-----|------------|--------|-----------------------------------------------|
| **Family** | 47 tests / 15 files | ✅ PASS | **98.3%** lines · branches 52% |
| **Guard** | 29 tests / 7 files | ✅ PASS | **96.9%** lines · branches 56% |
| **Playwright** | 3 specs | ⏭ SKIP (needs `E2E_LIVE=1`) | Smoke + cross-app SOS |
| **RLS integration** | 1 spec | ⏭ SKIP (needs `SUPABASE_LOCAL=1`) | Cross-family expenses |

### Per-module coverage (Family — gated modules)

| Module | Lines | Notes |
|--------|-------|-------|
| `security.ts` | **99.7%** | SOS dispatch, status, prefs, timeline |
| `notifications.ts` | **100%** | list, unread, mark read |
| `scan-receipt.ts` | **100%** | Edge invoke + errors |
| `notification-prefs.ts` | **100%** | my + family prefs |
| `require-auth.ts` | **94%** | session guard |
| `expenses.ts` | **94%** | CRUD + receipt merge |
| `username.ts` | **91%** | normalize, resolve, availability |

`children.ts` / `elderly-care.ts` — tested separately, **not** in coverage gate (large surface; follow-up).

### Per-module coverage (Guard — gated modules)

| Module | Lines | Notes |
|--------|-------|-------|
| `require-auth.ts` | **100%** | redirect + session |
| `security.ts` | **97%** | listOpenSos, SOS workflow, getSecurityStatus |
| `username.ts` | **91%** | normalize, resolve, availability |

## RTL (component smoke)

| App | Files | Asserts |
|-----|-------|---------|
| Family | `bottom-nav.test.tsx`, `mobile-shell.test.tsx`, `home-route.test.tsx` | 5 nav labels, shell layout, security headline |
| Guard | `guard-nav.test.tsx`, `guard-home.test.tsx` | 4 tab labels, home → `/guard` |

## RLS integration (local only)

```bash
supabase start
supabase db reset
SUPABASE_LOCAL=1 npm run test:integration -w @apps/family
```

File: `apps/family/tests/integration/rls-family-isolation.test.ts` — owner A must not read family B expenses.

## Test infrastructure

```
apps/family/
  vitest.config.ts          # coverage thresholds: lines/fn/stmt 80%, branches 48%
  tests/unit/               # 15 files
  tests/integration/        # RLS (skip without SUPABASE_LOCAL)
  tests/e2e/smoke.spec.ts

apps/guard/
  vitest.config.ts          # branches threshold 38% (optional-chain heavy APIs)
  tests/unit/               # 7 files

packages/test-utils/
  test-accounts.ts
  mock-supabase.ts          # from + rpc + auth helpers
```

### Commands

```bash
npm run test -w @apps/family
npm run test -w @apps/guard
npm run test:coverage -w @apps/family
npm run test:coverage -w @apps/guard
SUPABASE_LOCAL=1 npm run test:integration -w @apps/family   # if script added
E2E_LIVE=1 FAMILY_URL=... GUARD_URL=... npx playwright test
```

## Test accounts (DB seed)

```ts
TEST_ACCOUNTS.family       // giadinh@securitytech.vn
TEST_ACCOUNTS.familyOwner2 // lean@securitytech.vn — RLS cross-family
TEST_ACCOUNTS.guardStaff   // baove@securitytech.vn
// Password: Demo@12345
```

## Coverage thresholds

Enabled in `vitest.config.ts` for scoped API files. Branch thresholds are lower than line thresholds because Vitest counts many defensive `??` branches in Supabase mappers; line/function gates remain ≥80%.

## Remaining gaps

- E2E live: `E2E_LIVE=1` + running dev servers
- `elderly-care.ts` / `children.ts`: unit tests exist but not in 80% gate scope
- Edge deploy: Lovable — see `DEPLOY_EDGE_FUNCTIONS.md`
