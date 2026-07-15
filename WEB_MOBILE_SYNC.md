# Web vs Mobile — đối chiếu màn hình

> `web/` = clone [stoslife](https://github.com/phanducquanguet/stoslife.git) (Lovable TanStack).  
> Mobile = `apps/family`, `apps/guard`.

## Family app

| Route | Web | Mobile | Trạng thái |
|-------|-----|--------|------------|
| `/home`, `/gia-dinh`, `/chi-tieu`, … | Có (29 route chung) | Có | **Đồng bộ UI** (~±3–14 dòng/import) |
| `/index` | Portal chọn workspace (1790 dòng) | Redirect 7 dòng | Khác cố ý — mobile vào `/home` |
| `__root` | Shell web đầy đủ | Shell mobile tối giản | Khác cố ý |
| BQL / SaaS / Admin / Ops | Chỉ web | Không có | **Không port** (role desktop) |

**Kết luận Family:** Không cần cập nhật hàng loạt — màn cư dân đã mirror web.

## Guard app

| Route | Web | Mobile (trước) | Mobile (sau sync) |
|-------|-----|----------------|-------------------|
| `/guard/` home | Real | Real | Giữ |
| `/guard/check-in` | GPS + `checkInShift` | Stub toast | **Đã sync** → `api/guard-shifts` |
| `/guard/check-out` | GPS + `checkOutShift` | Stub toast | **Đã sync** |
| `/guard/patrol` | DB patrol logs | Mock POINTS[] | **Đã sync** |
| `/guard/schedule` | Real | Real | Giữ |
| `/security` SOC | Real | Real | Giữ |

## API mới (mobile)

- `apps/guard/src/api/guard-shifts.ts` — port từ `web/src/lib/guard.functions.ts`

## Cập nhật tiếp (tuỳ chọn)

- Guard `/guard/incident` — so web nếu có serverFn
- Family: pull diff từng file nếu Lovable web thay đổi lớn (`cham-soc-ong-ba.tsx` −14 dòng)

## Git

Monorepo push lên `stoslife` branch **`monorepo`** — `main` giữ app Lovable web.

### Kéo web từ `main` vào `web/` (không merge cả nhánh)

**Không** chạy `git merge main` hoặc `git pull origin main` ở gốc repo — sẽ đè `apps/`, `mobile/`, cấu trúc monorepo.

| Nhánh `main` (gốc) | Nhánh `mobileapp_kieet` (monorepo) |
|--------------------|-------------------------------------|
| `src/`             | `web/src/`                          |
| `supabase/`        | `web/supabase/`                     |
| `package.json`     | `web/package.json`                  |
| …                  | `web/…`                             |

```bash
# Xem trước
npm run sync:web-from-main -- --dry-run

# Áp dụng
npm run sync:web-from-main

cd web && npm install
git add web/
git commit -m "sync: pull web from main into web/"
```

Giữ nguyên: `web/.env`, `web/public/downloads/` (APK). Sau sync, port thay đổi sang `apps/family`, `mobile/*` theo bảng trên.
