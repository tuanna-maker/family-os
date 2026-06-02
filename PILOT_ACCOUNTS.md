# Tài khoản pilot (đăng nhập app)

Mật khẩu chung: **`Demo@12345`**

Chi tiết go-live: `MOBILE_GO_LIVE.md`

## Ma trận app ↔ tài khoản

| Email | App cài | Role | Màn hình sau login |
|-------|---------|------|-------------------|
| `giadinh@securitytech.vn` | STOS **Family** | `family_owner` | `/home` — 5 tab bottom nav |
| `thanhvien@securitytech.vn` | STOS **Family** | `family_member` | `/home` — 5 tab bottom nav |
| `baove@securitytech.vn` | STOS **Guard** | `security_admin` | `/guard` — 4 tab bottom nav |
| `nhanvienbaove@securitytech.vn` | STOS **Guard** | `security_staff` | `/guard` — 4 tab bottom nav |

Form login pilot pre-fill mặc định:

- **Family** → `giadinh@securitytech.vn`
- **Guard** → `nhanvienbaove@securitytech.vn`

Tắt prefill go-live: `VITE_PILOT_PREFILL=false`

Code: `packages/shared-utils/src/pilot-credentials.ts`
