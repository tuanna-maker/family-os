# Tài khoản pilot (đăng nhập app)

Mật khẩu chung: **`Demo@12345`**

Chi tiết go-live: `MOBILE_GO_LIVE.md`

## Seed dữ liệu demo (Lovable SQL Editor)

Copy toàn bộ file **`web/supabase/seeds/lovable_pilot_bootstrap.sql`** → Lovable **SQL editor** → Run.

Script sẽ:
- Apply migration còn thiếu (`family_albums`, SOS push triggers)
- Tạo/cập nhật 6 tài khoản + tenant/project/căn hộ
- Nạp demo: chi tiêu, con cái, ông bà, lịch, album, du lịch, giúp việc, SOS, guard ca trực

Chạy lại an toàn (idempotent) — dữ liệu `[Pilot]` được ghi đè.

## Ma trận app ↔ tài khoản

| Email | App cài | Role | Màn hình sau login |
|-------|---------|------|-------------------|
| `giadinh@securitytech.vn` | STOS **Family** | `family_owner` | `/home` — 5 tab bottom nav |
| `thanhvien@securitytech.vn` | STOS **Family** | `family_member` | `/home` — 5 tab bottom nav |
| `lean@securitytech.vn` | STOS **Family** | `family_owner` (gia đình 2) | `/home` — RLS test |
| `baove@securitytech.vn` | STOS **Guard** | `security_admin` | `/guard` — 4 tab bottom nav |
| `nhanvienbaove@securitytech.vn` | STOS **Guard** | `security_staff` | `/guard` — 4 tab bottom nav |
| `superadmin@securitytech.vn` | Web admin | `super_admin` | Admin dashboard |

Form login pilot pre-fill mặc định:

- **Family** → `giadinh@securitytech.vn`
- **Guard** → `nhanvienbaove@securitytech.vn`

Tắt prefill go-live: `VITE_PILOT_PREFILL=false`

Code: `packages/shared-utils/src/pilot-credentials.ts`
