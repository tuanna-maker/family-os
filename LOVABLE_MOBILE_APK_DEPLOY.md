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

## Publish web (bắt buộc — nếu 404)

APK đã có trên Supabase nhưng **production chưa có route** nếu chưa publish code web.
Gửi Lovable:

```text
Publish/deploy web app lên stoslife.lovable.app với các file:
- src/routes/api/public/downloads/guard.ts
- src/routes/api/public/downloads/family.ts
- src/lib/serve-apk.ts (signed URL bucket mobile-apks)
- src/lib/mobile-apk.ts
- src/routes/index.tsx (section QR)

Verify sau publish:
GET https://stoslife.lovable.app/api/public/downloads/family → redirect tải APK (không 404)
```

## Lưu ý PWA

`manifest-family.json` scope đã thu hẹp `/gia-dinh` — không chặn `/api/public/downloads/*`.
Nếu vẫn bị redirect login: gỡ PWA "STOS Life" cũ trên điện thoại rồi thử lại.
