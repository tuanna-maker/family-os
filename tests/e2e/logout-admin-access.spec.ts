/**
 * E2E: xác nhận sau khi đăng xuất, người dùng không thể xem dữ liệu admin.
 *
 * Phạm vi kiểm tra:
 *  1. Đăng nhập admin → vào được /admin/super và thấy dữ liệu Security Core.
 *  2. Bấm "Đăng xuất" → bị chuyển về /login, session bị xoá khỏi localStorage.
 *  3. Sau khi logout, mở trực tiếp /admin/super, /admin/users, /admin/audit
 *     → bị redirect về /login (?redirect=...) và KHÔNG render dữ liệu admin.
 *  4. Gọi trực tiếp các server function admin bằng fetch không kèm Authorization
 *     → server trả 401 Unauthorized (kiểm tra tầng API/SSR, không chỉ UI).
 *  5. Dùng lại access_token đã thu hồi sau signOut → server từ chối.
 *
 * Cách chạy:
 *   BASE_URL=https://stoslife.lovable.app \
 *   ADMIN_EMAIL=admin@securitytech.vn \
 *   ADMIN_PASSWORD=123456 \
 *   bunx playwright test tests/e2e/logout-admin-access.spec.ts
 *
 * Hoặc dùng preview URL (BASE_URL=https://id-preview--<id>.lovable.app)
 * hoặc local dev (BASE_URL=http://localhost:5173).
 */
import { test, expect, request as pwRequest } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@securitytech.vn";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "123456";

const ADMIN_ROUTES = ["/admin/super", "/admin/users", "/admin/audit"];

// Các serverFn admin cần được bảo vệ. URL theo quy ước của TanStack Start:
//   /_serverFn/<module>--<exportName>_createServerFn_handler
// Nếu tên thay đổi, cập nhật mảng dưới đây.
const PROTECTED_SERVER_FNS = [
  {
    name: "listUsersWithRoles",
    method: "GET" as const,
    url: "/_serverFn/src_lib_admin_functions_ts--listUsersWithRoles_createServerFn_handler",
  },
  {
    name: "listAuditLogs",
    method: "POST" as const,
    url: "/_serverFn/src_lib_admin_functions_ts--listAuditLogs_createServerFn_handler",
    body: { data: { limit: 10 } },
  },
  {
    name: "getMyContext",
    method: "GET" as const,
    url: "/_serverFn/src_lib_auth_functions_ts--getMyContext_createServerFn_handler",
  },
];

test.describe("Logout chặn truy cập dữ liệu admin", () => {
  test("Luồng login → xem admin → logout → bị chặn", async ({ page, context }) => {
    // 1. Login
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/mật khẩu|password/i).first().fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /đăng nhập|sign in/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });

    // 2. Vào trang admin và đảm bảo có dữ liệu Security Core
    await page.goto(`${BASE_URL}/admin/super`);
    await expect(page).toHaveURL(/\/admin\/super/);
    await expect(page.getByText(/security core|super admin|bảng quản trị/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // Lưu token để test reuse sau signOut
    const tokenBeforeLogout = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
          try {
            const v = JSON.parse(localStorage.getItem(k) ?? "null");
            return v?.access_token ?? null;
          } catch {
            return null;
          }
        }
      }
      return null;
    });
    expect(tokenBeforeLogout, "phải có access_token sau khi login").toBeTruthy();

    // 3. Logout (nút trong sidebar hoặc trang tài khoản)
    const logoutBtn = page.getByRole("button", { name: /đăng xuất|logout|sign out/i }).first();
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
    } else {
      await page.goto(`${BASE_URL}/tai-khoan`);
      await page.getByRole("button", { name: /đăng xuất|logout/i }).first().click();
    }
    await page.waitForURL(/\/login/, { timeout: 10_000 });

    // localStorage session đã bị xoá
    const tokenAfterLogout = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        if (k.startsWith("sb-") && k.endsWith("-auth-token")) return localStorage.getItem(k);
      }
      return null;
    });
    expect(tokenAfterLogout, "session phải bị xoá khỏi localStorage").toBeFalsy();

    // 4. Truy cập trực tiếp các route admin → phải bị chuyển /login và KHÔNG lộ dữ liệu admin
    for (const route of ADMIN_ROUTES) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      expect(page.url()).toMatch(/\/login(\?|$)/);
      // Trang login không được chứa các nhãn admin nội bộ
      const html = await page.content();
      expect(html).not.toMatch(/Security Core|Audit Logs|user_roles/i);
    }

    // 5. Gọi trực tiếp server function không kèm Authorization → 401
    const api = await pwRequest.newContext({ baseURL: BASE_URL });
    for (const fn of PROTECTED_SERVER_FNS) {
      const res =
        fn.method === "GET"
          ? await api.get(fn.url)
          : await api.post(fn.url, { data: fn.body ?? {} });
      expect(
        [401, 403],
        `${fn.name} phải trả 401/403 khi chưa đăng nhập (nhận ${res.status()})`,
      ).toContain(res.status());
      const text = await res.text();
      expect(text).not.toMatch(/full_name|audit_logs|user_roles/i);
    }

    // 6. Dùng lại access_token cũ sau signOut → server cũng phải từ chối
    for (const fn of PROTECTED_SERVER_FNS) {
      const res =
        fn.method === "GET"
          ? await api.get(fn.url, {
              headers: { Authorization: `Bearer ${tokenBeforeLogout}` },
            })
          : await api.post(fn.url, {
              headers: { Authorization: `Bearer ${tokenBeforeLogout}` },
              data: fn.body ?? {},
            });
      expect(
        [401, 403],
        `${fn.name} phải từ chối token đã bị logout (nhận ${res.status()})`,
      ).toContain(res.status());
    }
    await api.dispose();

    // context không còn cookie/session
    const cookies = await context.cookies();
    const sbCookies = cookies.filter((c) => c.name.startsWith("sb-"));
    expect(sbCookies, "không còn cookie Supabase sau logout").toHaveLength(0);
  });
});
