# STOS Monorepo

Hệ điều hành gia đình đô thị — monorepo Bun/npm workspaces.

| App | Path | Mô tả |
|-----|------|--------|
| STOS Family | `apps/family` | Ứng dụng cư dân (iOS/Android) |
| STOS Guard | `apps/guard` | Ứng dụng bảo vệ (iOS/Android) |

Shared packages: `packages/shared-ui`, `packages/shared-supabase`, `packages/shared-utils`.

## Cài đặt

```bash
npm install          # hoặc: bun install
cp apps/family/.env.example apps/family/.env
cp apps/guard/.env.example apps/guard/.env
```

Bootstrap native lần đầu (Capacitor + ios/android + assets + permissions):

```bash
npm run native:setup
```

## Dev web

```bash
npm run dev:family   # http://localhost:5173
npm run dev:guard    # http://localhost:5174
```

## Build web + sync Capacitor

```bash
npm run build:family   # vite build + cap sync
npm run build:guard
```

## Build APK

Release (ký release keystore — cấu hình trong Android Studio):

```bash
npm run android:family
# → apps/family/android/app/build/outputs/apk/release/app-release.apk

npm run android:guard
# → apps/guard/android/app/build/outputs/apk/release/app-release.apk
```

Debug (local, không cần keystore):

```bash
npm run android:family:debug
# → apps/family/android/app/build/outputs/apk/debug/app-debug.apk

npm run android:guard:debug
# → apps/guard/android/app/build/outputs/apk/debug/app-debug.apk
```

## Build IPA

```bash
npm run ios:family   # mở Xcode → Product > Archive > Distribute
npm run ios:guard
```

Trong Xcode: chọn team signing, Archive, rồi Distribute App.

## Yêu cầu local

### Android

- JDK 17
- Android Studio + Android SDK 34
- Biến môi trường `ANDROID_HOME` (hoặc SDK mặc định `%LOCALAPPDATA%\Android\Sdk` trên Windows)
- **Windows + đường dẫn có dấu (OneDrive):** Gradle/Java có thể lỗi — script `android-build.mjs` tự `subst S:`; hoặc clone repo sang `C:\dev\family-os`

### iOS

- macOS, Xcode 15+
- Apple Developer account (distribution)

## Capacitor

| App | appId | Deep link auth |
|-----|-------|----------------|
| Family | `vn.unicom.stos.family` | `vn.unicom.stos.family://auth` |
| Guard | `vn.unicom.stos.guard` | `vn.unicom.stos.guard://auth` |

Plugins: Preferences, SplashScreen, StatusBar, App, Browser, PushNotifications, Camera, Geolocation.

## CI mobile

Workflow `.github/workflows/mobile-build.yml`:

- Tag `family-v*` → build Android + iOS Family
- Tag `guard-v*` → build Android + iOS Guard
- Secrets: `APPLE_DEVELOPER_CERTIFICATE`, `APPLE_DEVELOPER_CERTIFICATE_PASSWORD`

## Scripts hữu ích

```bash
npm run routes:family    # regenerate TanStack route tree
npm run assets:family    # regenerate icon/splash PNG
npm run cap:sync -w @apps/family
npm run test -w @apps/family   # Vitest unit tests
npm run test -w @apps/guard
npm run test:coverage -w @apps/family
E2E_LIVE=1 npx playwright test   # live smoke (needs dev servers + Supabase)
```

Tài liệu audit: `TEST_REPORT.md`, `SCALABILITY_AUDIT.md`, `OBSERVABILITY_PLAN.md`, `SECURITY_HARDENING.md`.
