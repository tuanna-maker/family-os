# -*- coding: utf-8 -*-
"""Đồng bộ nội dung UC (markdown) vào SRS HTML sau khi chạy generate_familyos_uc.py."""
from pathlib import Path
import re

DOCS = Path(__file__).parent
SRS = DOCS / "Unicom_SRS_FamilyOS.html"
MD = DOCS / "familyos-usecases.md"


def main() -> None:
    if not MD.is_file():
        raise SystemExit(f"Thiếu {MD.name} — chạy: python generate_familyos_uc.py")
    if not SRS.is_file():
        raise SystemExit(f"Thiếu {SRS.name}")
    md = MD.read_text(encoding="utf-8").strip()
    html = SRS.read_text(encoding="utf-8")
    pattern = re.compile(
        r'(<script id="md-source" type="text/markdown">)(.*?)(</script>)',
        re.DOTALL,
    )
    if not pattern.search(html):
        raise SystemExit("Không tìm thấy #md-source trong SRS")
    new_html, n = pattern.subn(rf"\1\n{md}\n  \3", html, count=1)
    if n != 1:
        raise SystemExit("Thay thế md-source thất bại")
    SRS.write_text(new_html, encoding="utf-8")
    print(f"Synced {MD.name} -> {SRS.name} ({len(md)} chars)")


if __name__ == "__main__":
    main()
