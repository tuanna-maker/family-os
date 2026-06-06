# Lovable — Upload APK lên Supabase (QR tải app)

> **Project Supabase:** `bigarvjahnxiuovepaxm`  
> **Web:** `https://stoslife.lovable.app`  
> **Mục đích:** Quét QR trên landing page → tải APK Android (Gia đình + Bảo vệ).

---

## PROMPT (copy nguyên khối → paste vào chat Lovable)

```text
Bạn chỉ làm việc trên SUPABASE project bigarvjahnxiuovepaxm.
KHÔNG sửa TanStack routes, KHÔNG port code monorepo.

Nhiệm vụ: host 2 file APK Android để người dùng quét QR tải về.

### Bước 1 — Chạy SQL (FILE 1 + FILE 2 bên dưới)
- Tạo bucket storage `mobile-apks` (public, max 100MB/file)
- Policy SELECT public + INSERT/UPDATE/DELETE cho bucket này

### Bước 2 — Upload 2 file APK vào bucket `mobile-apks`
Tên file chính xác:
- stos-guard.apk (~82 MB) — app Bảo vệ
- stos-family.apk (~82 MB) — app Gia đình

Nếu repo Lovable không có file APK (gitignore), tôi sẽ đính kèm 2 file trong chat hoặc cung cấp link GitHub Releases.

Content-Type: application/vnd.android.package-archive
Upsert nếu đã tồn tại.

### Bước 3 — Verify
Báo lại 2 URL public (phải tải được từ trình duyệt điện thoại):
- https://bigarvjahnxiuovepaxm.supabase.co/storage/v1/object/public/mobile-apks/stos-guard.apk
- https://bigarvjahnxiuovepaxm.supabase.co/storage/v1/object/public/mobile-apks/stos-family.apk

Test HEAD/GET — status 200, Content-Type application/vnd.android.package-archive hoặc application/octet-stream.

### Bước 4 — Web (nếu chưa deploy)
Đảm bảo landing page có section QR trỏ:
- https://stoslife.lovable.app/api/public/downloads/guard
- https://stoslife.lovable.app/api/public/downloads/family

2 API này redirect sang Supabase Storage URL ở bước 3.

KHÔNG paste service_role key trong chat. KHÔNG đổi RLS bucket khác.
```

---

## FILE 1 — Bucket + public read

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mobile-apks',
  'mobile-apks',
  true,
  104857600,
  ARRAY['application/vnd.android.package-archive', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "mobile_apks_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'mobile-apks');
```

## FILE 2 — Upload policy (tránh lỗi is_family_member)

```sql
DROP POLICY IF EXISTS "mobile_apks_insert" ON storage.objects;
DROP POLICY IF EXISTS "mobile_apks_update" ON storage.objects;
DROP POLICY IF EXISTS "mobile_apks_delete" ON storage.objects;

CREATE POLICY "mobile_apks_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mobile-apks');

CREATE POLICY "mobile_apks_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'mobile-apks');

CREATE POLICY "mobile_apks_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'mobile-apks');
```

---

## Đính kèm APK cho Lovable

**Nguồn chuẩn (build React Native, không phải apps/* Capacitor):**

| App | Package | Nguồn build | File gửi Lovable |
|-----|---------|-------------|------------------|
| Bảo vệ | `com.stos.guard` | `mobile/guard/release/guard-app-release.apk` | `web/public/downloads/stos-guard.apk` |
| Gia đình | `vn.unicom.stos.familyrn` | `mobile/family/release/app-release.apk` | `web/public/downloads/stos-family.apk` |

Trước khi gửi, sync bản mới nhất:

```bash
npm run sync:mobile-apks
```

**Không dùng** `apps/family` / `apps/guard` (~8 MB — app web Capacitor cũ).

---

## Sau khi Lovable báo xong

1. Mở điện thoại → quét QR trên `stoslife.lovable.app`
2. Hoặc mở trực tiếp URL Supabase ở bước 3 — phải bắt đầu tải APK
3. Không cần vào Supabase Dashboard
