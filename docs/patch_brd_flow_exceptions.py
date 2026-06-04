# -*- coding: utf-8 -*-
"""Inject TASMOS-style exception branches + error codes per BRD flow L0-L15."""
from pathlib import Path
import re

BRD = Path(__file__).parent / "Unicom_BRD_FamilyOS.html"

def block(flow: str, title: str, ex: list[tuple], err: list[tuple], ucs: str = "") -> str:
    ex_rows = "".join(
        f'<tr><td><strong>{a}</strong></td><td>{sit}</td><td>{act}</td><td>{sev}</td></tr>'
        for a, sit, act, sev in ex
    )
    err_rows = "".join(
        f'<tr><td><code>{c}</code></td><td>{http}</td><td>{msg}</td><td>{when}</td></tr>'
        for c, http, msg, when in err
    )
    uc_line = f'<p><strong>UC tham chiếu (SRS 4A):</strong> {ucs}</p>' if ucs else ""
    return f"""
      <h3>Nhánh ngoại lệ — {flow} {title}</h3>
      <table>
        <thead><tr><th>Mã nhánh</th><th>Tình huống</th><th>Hành vi hệ thống</th><th>Mức độ</th></tr></thead>
        <tbody>{ex_rows}</tbody>
      </table>
      <h3>Mã lỗi — {flow} {title}</h3>
      <table>
        <thead><tr><th>Mã</th><th>HTTP</th><th>Thông báo (VI)</th><th>Khi nào</th></tr></thead>
        <tbody>{err_rows}</tbody>
      </table>
      {uc_line}
"""

FLOWS = {
    "L0": block("L0", "Đăng nhập & RBAC", [
        ("A1", "Sai email/mật khẩu", "Toast chung; không tiết lộ tài khoản tồn tại", "Cao"),
        ("A2", "Role không dùng được trên app", "Chặn shell; gợi ý đúng app Guard/Family", "Cao"),
        ("A3", "JWT hết hạn / refresh fail", "beforeLoad → redirect `/login`; xóa Preferences", "Trung bình"),
        ("A4", "Quên MK — gửi quá nhiều lần", "E-AUTH-429; cooldown 60s", "Thấp"),
        ("A5", "Mạng không ổn định", "Retry + toast; không clear form", "Trung bình"),
    ], [
        ("E-AUTH-001", "401", "Email hoặc mật khẩu không đúng", "Credential sai"),
        ("E-AUTH-008", "403", "Tài khoản không dùng được trên ứng dụng này", "Role mismatch"),
        ("E-AUTH-010", "400", "Liên kết đã hết hạn", "Reset password token"),
        ("E-AUTH-429", "429", "Vui lòng thử lại sau", "Rate limit email"),
        ("E-RLS-001", "403", "Không có quyền truy cập", "family_id context thiếu"),
    ], "UC-01.01 … UC-01.05"),
    "L1": block("L1", "SOS khẩn cấp", [
        ("A1", "Push FCM/APNs thất bại", "Retry tối đa 3; log E-SEC-002; vẫn lưu request", "Cao"),
        ("A2", "Thiết bị offline", "Lưu local queue (Phase 2); hiện toast chờ mạng", "Trung bình"),
        ("A3", "Cư dân hủy khi status=open", "PATCH `cancelled`; không push Guard", "Trung bình"),
        ("A4", "Không có Guard online", "Escalate supervisor + thông báo BQL", "Cao"),
        ("A5", "SOS gắn người cao tuổi", "Payload `elderly_id`; ưu tiên P0 trên Guard", "Cao"),
    ], [
        ("E-SEC-001", "500", "Không gửi được yêu cầu", "INSERT security_requests fail"),
        ("E-SEC-002", "503", "Không gửi được thông báo đến bảo vệ", "Push gateway lỗi"),
        ("E-RLS-001", "403", "Không có quyền", "family_id khác hộ"),
    ], "UC-11.01 … UC-11.04, UC-14.04 … UC-14.05"),
    "L2": block("L2", "OCR hóa đơn", [
        ("A1", "Vision không trích xuất được", "Form trống; user nhập tay", "Trung bình"),
        ("A2", "Ảnh > 10MB hoặc format lạ", "Từ chối upload; gợi ý chụp lại", "Thấp"),
        ("A3", "Scan đã link expense", "Mở read-only; E-EXP-005", "Trung bình"),
        ("A4", "User hủy trước khi lưu", "Không INSERT expenses", "Thấp"),
        ("A5", "amount ≤ 0 sau chỉnh sửa", "E-EXP-002; focus field", "Trung bình"),
    ], [
        ("E-EXP-OCR", "502", "Không đọc được hóa đơn", "Edge / Vision timeout"),
        ("E-EXP-002", "422", "Số tiền không hợp lệ", "amount ≤ 0"),
        ("E-EXP-005", "409", "Hóa đơn đã được ghi nhận", "receipt_scan.expense_id set"),
        ("E-EXP-001", "500", "Không tải chi tiêu", "DB lỗi"),
    ], "UC-03.01 … UC-03.06"),
    "L3": block("L3", "Kỷ niệm & Media", [
        ("A1", "Upload Storage fail từng file", "Retry từng ảnh; giữ progress", "Trung bình"),
        ("A2", "RLS bucket / signed URL", "E-MEM-002; không hiển thị URL lạ", "Cao"),
        ("A3", "User hủy chọn ảnh", "Không gọi Storage", "Thấp"),
        ("A4", "Mất mạng giữa batch", "Resume upload Phase 2", "Trung bình"),
    ], [
        ("E-MEM-001", "413", "Ảnh quá lớn", "> 10MB / file"),
        ("E-MEM-002", "500", "Lỗi tải lên", "Storage policy / network"),
        ("E-RLS-001", "403", "Không có quyền album", "Không phải family_member"),
    ], "UC-08.01 … UC-08.05"),
    "L4": block("L4", "Lịch gia đình", [
        ("A1", "Trùng khung giờ sự kiện", "Warning UI; vẫn cho lưu", "Thấp"),
        ("A2", "starts_at / ends_at không hợp lệ", "E-EVT-001; không INSERT", "Trung bình"),
        ("A3", "Xóa sự kiện", "Confirm dialog → deleteFamilyEvent", "Trung bình"),
        ("A4", "member_scope không khớp", "Lọc ẩn trên lịch chung", "Thấp"),
    ], [
        ("E-EVT-001", "400", "Thời gian không hợp lệ", "Validation Zod"),
        ("E-RLS-001", "403", "Không sửa sự kiện hộ khác", "RLS family_events"),
    ], "UC-07.01 … UC-07.04"),
    "L5": block("L5", "Chăm sóc ông bà", [
        ("A1", "Chưa có elderly_profiles", "CTA tạo hồ sơ mới", "Trung bình"),
        ("A2", "Trễ uống thuốc > 30 phút", "Badge đỏ Dashboard + activity feed", "Cao"),
        ("A3", "SOS từ module ông bà", "Chuyển L1 + `elderly_id`", "Cao"),
        ("A4", "Safe check bỏ qua", "safe_status → warn sau 24h", "Trung bình"),
    ], [
        ("E-ELD-001", "404", "Không tìm thấy hồ sơ", "elderly_id sai"),
        ("E-ELD-002", "403", "Không có quyền", "RLS"),
    ], "UC-05.01 … UC-05.08"),
    "L6": block("L6", "Con cái & Bài tập", [
        ("A1", "RLS deny homework", "Toast E-CHILD-001", "Cao"),
        ("A2", "Bài tập quá hạn", "Highlight đỏ; nhắc parent_reminders", "Trung bình"),
        ("A3", "Parallel fetch một API fail", "Partial UI + retry nút", "Trung bình"),
    ], [
        ("E-CHILD-001", "500", "Lỗi tải dữ liệu con", "API aggregate"),
        ("E-RLS-001", "403", "Không có quyền", "family_id"),
    ], "UC-04.01 … UC-04.05"),
    "L7": block("L7", "Sức khỏe gia đình", [
        ("A1", "Validation hồ sơ y tế", "E-HEALTH-001; giữ form", "Trung bình"),
        ("A2", "Truy cập hồ sơ thành viên khác", "RLS strict — chỉ cùng hộ", "Cao"),
        ("A3", "Lịch khám trùng", "Warning; cho phép lưu", "Thấp"),
    ], [
        ("E-HEALTH-001", "500", "Lỗi hồ sơ y tế", "DB / API"),
        ("E-RLS-001", "403", "Dữ liệu nhạy cảm", "RLS health_*"),
    ], "UC-06.01 … UC-06.05"),
    "L8": block("L8", "Thực phẩm", [
        ("A1", "expires_on null", "Không hiển thị badge hết hạn", "Thấp"),
        ("A2", "≤ 3 ngày", "Badge vàng Home + /thuc-pham", "Trung bình"),
        ("A3", "Đã hết hạn", "Badge đỏ + gợi ý shopping list", "Trung bình"),
    ], [
        ("E-FOOD-001", "500", "Lỗi tủ lạnh", "listFood / upsert fail"),
    ], "UC-09.01 … UC-09.05"),
    "L9": block("L9", "Giúp việc QR", [
        ("A1", "QR ca hết hạn / sai chữ ký", "E-MAID-001; không ghi attendance", "Trung bình"),
        ("A2", "GPS tắt / accuracy thấp", "Cảnh báo; vẫn cho check-in có flag", "Trung bình"),
        ("A3", "Check-out khi chưa check-in", "409 conflict", "Thấp"),
    ], [
        ("E-MAID-001", "400", "QR không hợp lệ", "Token invalid"),
        ("E-MAID-002", "409", "Chưa check-in ca", "Check-out sớm"),
    ], "UC-10.01 … UC-10.03"),
    "L10": block("L10", "QR khách & Vào ra", [
        ("A1", "QR khách hết hạn", "Yêu cầu tạo mã mới", "Trung bình"),
        ("A2", "Vượt số lượt quét", "Chặn vào; thông báo chủ hộ", "Trung bình"),
        ("A3", "Guard quét QR lỗi", "Log audit; không mở cổng tự động", "Cao"),
    ], [
        ("E-SEC-003", "400", "Mã QR không hợp lệ", "Payload / expiry"),
        ("E-SEC-004", "410", "Mã QR đã hết hạn", "expires_at"),
    ], "UC-11.03, UC-11.04"),
    "L11": block("L11", "Thông báo BQL", [
        ("A1", "notification_id không thuộc user", "403; không mark read", "Cao"),
        ("A2", "User tắt loại trong prefs", "Chỉ in-app; không push", "Thấp"),
        ("A3", "Badge unread", "Đồng bộ khi markRead batch", "Thấp"),
    ], [
        ("E-NOTI-001", "500", "Lỗi thông báo", "listNotifications"),
        ("E-NOTI-403", "403", "Không có quyền", "user_id mismatch"),
    ], "UC-12.01 … UC-12.03"),
    "L12": block("L12", "Cộng đồng & Dịch vụ", [
        ("A1", "Validation form (message ngắn)", "E-COM-001 inline", "Thấp"),
        ("A2", "Ticket đã resolved", "Chỉ đọc; không reply", "Thấp"),
        ("A3", "Spam — Phase 2", "Rate limit theo user", "Trung bình"),
    ], [
        ("E-COM-001", "500", "Gửi thất bại", "service_requests insert"),
    ], "UC-13.01 … UC-13.04"),
    "L13": block("L13", "Guard Check-in GPS", [
        ("A1", "Ngoài geofence tòa nhà", "E-GUARD-003; yêu cầu supervisor override", "Cao"),
        ("A2", "Đã check-in ca hiện tại", "E-GUARD-002; hiển thị ca đang mở", "Trung bình"),
        ("A3", "JWT hết hạn", "Redirect login Guard", "Cao"),
    ], [
        ("E-GUARD-001", "401", "Phiên đăng nhập hết hạn", "JWT"),
        ("E-GUARD-002", "409", "Ca trực đã check-in", "Duplicate shift"),
        ("E-GUARD-003", "422", "Ngoài phạm vi tòa nhà", "Geofence"),
    ], "UC-14.02, UC-14.03"),
    "L14": block("L14", "Guard Xử lý SOS", [
        ("A1", "PATCH khi không phải ca / assignee", "403; audit denied", "Cao"),
        ("A2", "SLA > 5 phút chưa in_progress", "Escalate supervisor dashboard", "Cao"),
        ("A3", "Chuyển status không hợp lệ", "409; giữ nguyên state machine", "Trung bình"),
        ("A4", "Realtime disconnect", "Polling fallback 10s", "Trung bình"),
    ], [
        ("E-GUARD-001", "401", "Phiên hết hạn", "JWT"),
        ("E-GUARD-004", "409", "Trạng thái không hợp lệ", "Illegal transition"),
        ("E-SEC-001", "500", "Cập nhật SOS thất bại", "PATCH fail"),
    ], "UC-14.04, UC-14.05, UC-14.07"),
    "L15": block("L15", "Guard Tuần tra QR", [
        ("A1", "QR checkpoint không thuộc route", "E-GUARD-005; log cảnh báo", "Trung bình"),
        ("A2", "Quét trùng điểm trong ca", "Idempotent — cập nhật timestamp", "Thấp"),
        ("A3", "Chưa check-in ca", "Redirect L13 trước", "Trung bình"),
        ("A4", "Ảnh chứng minh bắt buộc — Phase 2", "Block complete nếu thiếu ảnh", "Thấp"),
    ], [
        ("E-GUARD-005", "400", "Điểm tuần tra không hợp lệ", "checkpoint_id"),
        ("E-GUARD-001", "401", "Phiên hết hạn", "JWT"),
    ], "UC-14.06"),
}

# Markers: unique text immediately before next section (inject BEFORE marker)
INJECT = [
    ("L0", '<h2>LUỒNG 1: Gửi SOS khẩn cấp</h2>'),
    ("L1", '<h2>LUỒNG 2: Quét hóa đơn bằng AI (OCR)</h2>'),
    ("L2", '<h2>LUỒNG 3: Quản lý Kỷ niệm & Album ảnh</h2>'),
    ("L3", '  <!-- ===== PAGE 7B: FLOWS L4-L8 ===== -->'),
    ("L4", '<h2>LUỒNG 5: Chăm sóc ông bà & Nhắc thuốc</h2>'),
    ("L5", '<h2>LUỒNG 6: Quản lý con cái</h2>'),
    ("L6", '<h2>LUỒNG 7: Sức khỏe gia đình</h2>'),
    ("L7", '<h2>LUỒNG 8: Thực phẩm & Tủ lạnh</h2>'),
    ("L8", '  <!-- ===== PAGE 7C: FLOWS L9-L15 ===== -->'),
    ("L9", '<h2>LUỒNG 10: QR vào ra & Khách đến thăm</h2>'),
    ("L10", '<h2>LUỒNG 11: Thông báo từ Ban quản lý</h2>'),
    ("L11", '<h2>LUỒNG 12: Cộng đồng & Liên hệ dịch vụ</h2>'),
    ("L12", '      <hr />\n\n      <h2>LUỒNG 13: Guard — Check-in ca trực (GPS)</h2>'),
    ("L13", '<h2>LUỒNG 14: Guard — Xử lý SOS (chi tiết)</h2>'),
    ("L14", '<h2>LUỒNG 15: Guard — Tuần tra điểm QR</h2>'),
    ("L15", '    </div>\n    <div class="inner-brd-footer">\n      <div class="inner-brd-footer-l">© 2026 UNICOM — Nội bộ</div>\n      <div class="inner-brd-footer-r"><span class="ft-page">Trang 9 / 16</span>'),
]

APPENDIX_PAGE = """
  <!-- ===== PAGE 7D: FLOW ERRORS INDEX ===== -->
  <div class="doc-page">
    <div class="inner-brd-header">
      <div class="inner-brd-code">UNICOM/BRD-FAMILYOS-001 · v1.2</div>
      <div class="inner-brd-right">STOS Family OS — Mã lỗi &amp; Ngoại lệ (L0–L15)</div>
    </div>
    <div class="inner-brd-divider"></div>
    <div class="content-area md-render">

      <h1>6.5. Bảng tra cứu mã lỗi theo luồng (TASMOS-level)</h1>
      <p>Phụ lục tổng hợp phục vụ UAT, QA và đối soát với SRS mục 4A (68 UC). Chi tiết nhánh xử lý nằm ngay sau từng
        luồng ở mục 6.</p>

      <table>
        <thead>
          <tr><th>Luồng</th><th>Prefix mã lỗi</th><th>Số nhánh ngoại lệ</th><th>SLA / Ghi chú</th></tr>
        </thead>
        <tbody>
          <tr><td>L0</td><td>E-AUTH-*, E-RLS-001</td><td>5</td><td>Login P95 &lt; 2s</td></tr>
          <tr><td>L1</td><td>E-SEC-*, E-RLS-001</td><td>5</td><td>Push &lt; 5s; Realtime Family</td></tr>
          <tr><td>L2</td><td>E-EXP-*, E-EXP-OCR</td><td>5</td><td>OCR ≥ 80% mẫu UAT</td></tr>
          <tr><td>L3</td><td>E-MEM-*</td><td>4</td><td>Storage private bucket</td></tr>
          <tr><td>L4</td><td>E-EVT-*</td><td>4</td><td>Timezone VN</td></tr>
          <tr><td>L5</td><td>E-ELD-*</td><td>4</td><td>Trễ thuốc 30'</td></tr>
          <tr><td>L6</td><td>E-CHILD-*</td><td>3</td><td>Parallel fetch</td></tr>
          <tr><td>L7</td><td>E-HEALTH-*</td><td>3</td><td>RLS nhạy cảm</td></tr>
          <tr><td>L8</td><td>E-FOOD-*</td><td>3</td><td>Badge ≤3 ngày</td></tr>
          <tr><td>L9</td><td>E-MAID-*</td><td>3</td><td>GPS log</td></tr>
          <tr><td>L10</td><td>E-SEC-003/004</td><td>3</td><td>QR expiry</td></tr>
          <tr><td>L11</td><td>E-NOTI-*</td><td>3</td><td>Per-user inbox</td></tr>
          <tr><td>L12</td><td>E-COM-*</td><td>3</td><td>Ticket lifecycle</td></tr>
          <tr><td>L13–L15</td><td>E-GUARD-*</td><td>3–4 mỗi luồng</td><td>Geofence + SOS SLA</td></tr>
        </tbody>
      </table>

      <h2>Ma trận trạng thái SOS (L1 / L14)</h2>
      <table>
        <thead><tr><th>status</th><th>Cho phép chuyển sang</th><th>Actor</th></tr></thead>
        <tbody>
          <tr><td>open</td><td>in_progress, cancelled</td><td>Guard / Cư dân (hủy)</td></tr>
          <tr><td>in_progress</td><td>resolved</td><td>Guard assigned</td></tr>
          <tr><td>resolved</td><td>— (terminal)</td><td>Guard</td></tr>
          <tr><td>cancelled</td><td>— (terminal)</td><td>Cư dân</td></tr>
        </tbody>
      </table>

      <p><strong>E-SYS-500:</strong> Lỗi hệ thống chung — toast "Đã có lỗi, vui lòng thử lại"; ghi log Sentry/observability.</p>

    </div>
    <div class="inner-brd-footer">
      <div class="inner-brd-footer-l">© 2026 UNICOM — Nội bộ</div>
      <div class="inner-brd-footer-r"><span class="ft-page">Trang 10 / 17</span>UNICOM/BRD-FAMILYOS-001 · v1.2</div>
    </div>
  </div>

"""

def main():
    html = BRD.read_text(encoding="utf-8")
    if "Nhánh ngoại lệ — L0" in html:
        print("Already patched")
        return
    # Inject per-flow blocks (reverse order to keep offsets stable)
    for fid, marker in reversed(INJECT):
        chunk = FLOWS[fid]
        if marker not in html:
            raise SystemExit(f"Marker not found for {fid}: {marker[:60]!r}")
        html = html.replace(marker, chunk + "\n\n      " + marker, 1)
    # Insert appendix page before PAGE 8
    page8 = "  <!-- ===== PAGE 8: SCOPE + NFR ===== -->"
    if "PAGE 7D: FLOW ERRORS INDEX" not in html:
        html = html.replace(page8, APPENDIX_PAGE + page8, 1)
    # TOC entry
    toc_old = """        <div class="toc-item level-3"><span class="toc-index">6.4</span><span class="toc-text">L13–L15 STOS Guard: Ca
            trực, SOS, Tuần tra</span></div>
        <div class="toc-item"><span class="toc-index">7</span>"""
    toc_new = """        <div class="toc-item level-3"><span class="toc-index">6.4</span><span class="toc-text">L13–L15 STOS Guard: Ca
            trực, SOS, Tuần tra</span></div>
        <div class="toc-item level-3"><span class="toc-index">6.5</span><span class="toc-text">Mã lỗi &amp; nhánh ngoại lệ theo luồng (tra cứu UAT)</span></div>
        <div class="toc-item"><span class="toc-index">7</span>"""
    if "6.5</span>" not in html:
        html = html.replace(toc_old, toc_new, 1)
    # Bump page totals 16 → 17
    html = html.replace("/ 16</span>", "/ 17</span>")
    html = html.replace("Trang 10 / 17", "Trang 10 / 17", 1)  # appendix already 10
    # Renumber footers after page 9: old 10->11 etc - simple increment for pages 10-16
    for old, new in [(16, 17), (15, 16), (14, 15), (13, 14), (12, 13), (11, 12), (10, 11)]:
        html = html.replace(f"Trang {old} / 17", f"Trang {new} / 17", 1)
    BRD.write_text(html, encoding="utf-8")
    print("BRD patched: L0-L15 exceptions + page 6.5")

if __name__ == "__main__":
    main()
