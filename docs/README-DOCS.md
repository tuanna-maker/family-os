# Tài liệu STOS Family OS (UNICOM)

## Bản chính thức — chỉ cập nhật tại đây

| Loại | Mã tài liệu | File | Phiên bản hiện tại |
|------|-------------|------|-------------------|
| **BRD** | UNICOM/BRD-FAMILYOS-001 | [`Unicom_BRD_FamilyOS.html`](./Unicom_BRD_FamilyOS.html) | 1.2 |
| **SRS** | UNICOM/SRS-FAMILYOS-001 | [`Unicom_SRS_FamilyOS.html`](./Unicom_SRS_FamilyOS.html) | 1.2 |

Không dùng bản `*_v1.0.html`, `*_v1.2.html`, `BRD.html`, `SRS.html` (đã gỡ).

## Tham chiếu TASMOS (không chỉnh khi làm Family OS)

- [`TSCAir_BRD_TASMOS_v2.1.html`](./TSCAir_BRD_TASMOS_v2.1.html)
- [`Unicom_SRS_TASMOS_Phase1_v3.0 (4).html`](./Unicom_SRS_TASMOS_Phase1_v3.0%20(4).html)

## Công cụ bảo trì

```bash
cd docs

# Sinh lại 68 UC (markdown nguồn)
python generate_familyos_uc.py

# Gắn UC vào trang 5A của SRS HTML
python sync_srs_usecases.py

# Bổ sung nhánh ngoại lệ / mã lỗi BRD (L0–L15) — chỉ khi sửa logic patch
python patch_brd_flow_exceptions.py
```

- **UC nguồn:** [`familyos-usecases.md`](./familyos-usecases.md) (sinh từ `generate_familyos_uc.py`, đồng bộ vào SRS bằng `sync_srs_usecases.py`).
- **BRD:** sửa trực tiếp `Unicom_BRD_FamilyOS.html`; tăng số phiên bản trong header/footer khi phát hành.

## Logo / asset

- `logo.png`, `logo2.png`, `logo.b64` — dùng chung cho xuất PDF/HTML.
