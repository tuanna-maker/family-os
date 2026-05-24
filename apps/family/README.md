# STOS Family (mobile)

Ứng dụng cư dân — React 19 + Vite 7 + TanStack Router + Capacitor 6.

## Yêu cầu

- [Bun](https://bun.sh) 1.2+
- Xcode (iOS) / Android Studio (Android) khi build native

## Cấu hình

```bash
cp .env.example .env
# Điền VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
# Deep link auth: vn.unicom.stos.family://auth
```

## Dev (web)

Từ root monorepo:

```bash
bun install
bun run dev:family
```

Hoặc trong thư mục app:

```bash
bun dev
```

Mở http://localhost:5173 — mặc định redirect `/` → `/home`.

## Build web

```bash
bun run build
```

Output: `dist/`

## Capacitor (iOS / Android)

```bash
npm run build:family    # vite build + cap sync
npm run cap:sync -w @apps/family
npm run cap:open:ios -w @apps/family      # hoặc android
```

Regenerate icon/splash sau khi đổi `resources/`:

```bash
npm run cap:assets -w @apps/family
```

Debug APK:

```bash
npm run android:family:debug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

`appId`: `vn.unicom.stos.family` · `appName`: STOS Family

Session Supabase lưu qua **Capacitor Preferences** trên thiết bị thật; dev web dùng `localStorage`.

## Workspace packages

- `@shared/ui` — shadcn, mobile shell, hooks
- `@shared/supabase` — client, auth
- `@shared/utils` — `cn`, formatters, `resolveDestinationPure`
