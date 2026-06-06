# APK download — đã triển khai trên Lovable

## Kiến trúc (production)

| Thành phần | Giá trị |
|------------|---------|
| Bucket | `mobile-apks` (private — workspace chặn public bucket) |
| Guard APK | `stos-guard.apk` (~85.5 MB) |
| Family APK | `stos-family.apk` (~85.7 MB) |
| API tải | `/api/public/downloads/guard` · `/api/public/downloads/family` |
| Cơ chế | Server tạo **signed URL 10 phút** → redirect → force download |

**QR trên landing encode:**
- `https://stoslife.lovable.app/api/public/downloads/guard`
- `https://stoslife.lovable.app/api/public/downloads/family`

**Không dùng** `storage/v1/object/public/...` — bucket private.

## Nguồn APK build (React Native)

| App | Package | Build |
|-----|---------|-------|
| Bảo vệ | `com.stos.guard` | `npm run android:mobile-guard` |
| Gia đình | `vn.unicom.stos.familyrn` | `npm run android:mobile-family` |

Sync trước khi upload lại:

```bash
npm run sync:mobile-apks
```

## Cập nhật APK mới

Gửi Lovable:

```text
Upload lại 2 file vào bucket mobile-apks (private, upsert):
- stos-guard.apk
- stos-family.apk
(đính kèm file từ web/public/downloads/)
```

## Lưu ý PWA

Nếu điện thoại đã cài PWA "STOS Life", có thể bị chuyển về `/login?source=pwa-family`.
Cách xử lý: gỡ PWA cũ hoặc mở link tải bằng Chrome (không qua shortcut PWA).
