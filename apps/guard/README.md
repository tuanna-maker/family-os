# STOS Guard (mobile)

Ứng dụng bảo vệ — React 19 + Vite 7 + TanStack Router + Capacitor 6.

## Yêu cầu

- Bun 1.2+
- Xcode / Android Studio (native)

## Cấu hình

```bash
cp .env.example .env
# VITE_AUTH_REDIRECT_URL=vn.unicom.stos.guard://auth
```

## Dev

```bash
# từ root
bun install
bun run dev:guard
```

http://localhost:5174 — `/` → `/guard`.

## Build web

```bash
bun run build
```

## Capacitor

```bash
npm run build:guard
npm run cap:sync -w @apps/guard
npm run cap:open:android -w @apps/guard
```

Debug APK: `npm run android:guard:debug` (từ root monorepo).

`appId`: `vn.unicom.stos.guard` · SOC tại `/security`.
