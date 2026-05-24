# Cross-imports sau tách monorepo

Cập nhật: 2026-05-23. Cả hai app **`npm run build` PASS**.

## Cố ý (cross-domain)

| App | Import | Lý do |
|-----|--------|--------|
| `apps/family` | `features/security-core`, `@/api/security` | Màn `/bao-an`, SOS trên `/home` |
| `apps/family` | `@/hooks/use-family-context`, `@/hooks/use-notifications` | Context/query chỉ có ở Family app |
| `apps/guard` | `features/security-core` + `security-ops` | Toàn bộ ca trực bảo vệ |
| `apps/guard` | `/security` route | SOC web trong app Guard (role cloud) |

## Đã xử lý trong shared packages

- `@shared/ui/*` — UI, mobile shell, hooks (`use-auth`, `use-theme`, …)
- `@shared/supabase/*` — client (Capacitor Preferences), auth, types, `projects-public`
- `@shared/utils/*` — `cn`, formatters, `resolveDestinationPure`

## Cần xử lý thủ công (nếu mở rộng)

### Dead / legacy trong `apps/family`

- `src/features/family-core/scan-receipt.functions.ts` — legacy Lovable serverFn; route dùng `src/api/scan-receipt.ts` → Edge `scan-receipt`. Xóa file `.functions.ts` sau khi Lovable deploy Edge (xem `LOVABLE_SCAN_RECEIPT_DEPLOY.md`).

### Route tree (dev)

- Plugin `@tanstack/router-plugin` bị lỗi `paths[0] undefined` trên Windows + đường dẫn Unicode → **tắt trong Vite**, generate bằng CLI:

```bash
cd apps/family && npx @tanstack/router-cli generate --routesDirectory ./src/routes --generatedRouteTree ./src/routeTree.gen.ts
cd apps/guard  && npx @tanstack/router-cli generate --routesDirectory ./src/routes --generatedRouteTree ./src/routeTree.gen.ts
```

Chạy lại sau khi thêm/xóa file trong `src/routes/`.

### Bun vs npm

- Root `package.json` dùng `bun --cwd` khi có Bun; môi trường hiện tại dùng **npm workspaces** (`npm install`, `npm run build -w @apps/family`).
- Khi có Bun: có thể đổi internal deps sang `workspace:*`.

### Node / Vite

- `engines.node >= 20.19` cho Vite 7; build hiện dùng **Vite 6.3.5** (Node 18 shell vẫn build được).

### Capacitor native

- Chưa chạy `cap add ios/android` — sau `build`, trong từng app: `bunx cap sync` / `npx cap sync`.

### Auth deep link

- Cấu hình scheme `vn.unicom.stos.family://auth` / `vn.unicom.stos.guard://auth` trong native project + Supabase redirect URLs.

### Edge Functions

- `scan-receipt` và logic AI khác: deploy Supabase Edge Function; app gọi `supabase.functions.invoke('scan-receipt')`.

## Grep nhanh phát hiện sót

```bash
# Import monolith còn sót trong apps
rg "@/integrations|@/lib/|@/components/|useServerFn" apps --glob "*.{ts,tsx}"

# shared-ui nội bộ
rg "@/components/" packages/shared-ui
```
