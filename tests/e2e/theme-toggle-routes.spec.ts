/**
 * E2E: chuyển Dark/Light trên mọi route Family Core & Security Core.
 *
 * Mục tiêu: phát hiện trang ÉP theme bằng cách thêm `class="dark ..."` (hoặc
 * `class="light ..."`) vào wrapper bên trong <body>. Khi đó dù user bật Light
 * thì wrapper vẫn buộc Dark → giao diện lệch.
 *
 * Cách kiểm:
 *  1. Login.
 *  2. Với mỗi route, set theme="light" → reload → kiểm tra:
 *       - <html> có class "light", không có "dark"
 *       - Không tồn tại descendant nào của <body> mang TOKEN class "dark"
 *         (chỉ tính token độc lập, không tính biến thể `dark:bg-x`)
 *       - body có màu chữ ≠ màu chữ ở dark mode (sanity check theme thực sự áp dụng)
 *     Lặp lại với theme="dark" và kiểm tra ngược lại.
 *
 * Chạy:
 *   BASE_URL=http://localhost:5173 \
 *   USER_EMAIL=member@stoslife.vn USER_PASSWORD=123456 \
 *   bunx playwright test tests/e2e/theme-toggle-routes.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
const USER_EMAIL = process.env.USER_EMAIL ?? process.env.ADMIN_EMAIL ?? "admin@securitytech.vn";
const USER_PASSWORD = process.env.USER_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "123456";

const FAMILY_ROUTES = [
  "/gia-dinh",
  "/lich-gia-dinh",
  "/cham-soc-ong-ba",
  "/cham-soc-ong-ba/nhat-ky",
  "/con-cai",
  "/suc-khoe",
  "/suc-khoe/quan-ly",
  "/chi-tieu",
  "/thuc-pham",
  "/du-lich",
  "/ky-niem-gia-dinh",
  "/quan-ly-giup-viec",
  "/lien-he",
  "/tai-khoan",
  "/thong-bao",
  "/cai-dat/thong-bao",
];

const SECURITY_ROUTES = ["/bao-an"];

const ALL_ROUTES = [...FAMILY_ROUTES, ...SECURITY_ROUTES];

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(/email/i).fill(USER_EMAIL);
  await page.getByLabel(/mật khẩu|password/i).first().fill(USER_PASSWORD);
  await page.getByRole("button", { name: /đăng nhập|sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });
}

async function setThemeAndReload(page: Page, theme: "light" | "dark", path: string) {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("ui:theme", t);
    } catch {}
  }, theme);
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState("networkidle");
}

/**
 * Trả về danh sách selector của các phần tử trong <body> có TOKEN class
 * trùng `forbidden` (vd: "dark" hay "light"). Bỏ qua biến thể tailwind
 * như `dark:bg-x` vì chứa dấu `:`, không khớp `class~="dark"`.
 */
async function findForcedThemeWrappers(page: Page, forbidden: "dark" | "light") {
  return await page.evaluate((token) => {
    const nodes = document.body.querySelectorAll(`[class~="${token}"]`);
    return Array.from(nodes).map((el) => {
      const tag = el.tagName.toLowerCase();
      const cls = (el as HTMLElement).className?.toString().slice(0, 120);
      return `${tag}.${cls}`;
    });
  }, forbidden);
}

async function getBodyColor(page: Page) {
  return await page.evaluate(() => getComputedStyle(document.body).color);
}

test.describe("Theme toggle phủ toàn bộ Family Core + Security Core", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const path of ALL_ROUTES) {
    test(`route ${path}: tôn trọng Dark/Light, không có wrapper ép theme`, async ({ page }) => {
      // ---------- LIGHT ----------
      await setThemeAndReload(page, "light", path);

      const htmlClassLight = await page.locator("html").getAttribute("class");
      expect(htmlClassLight ?? "", `[${path}] <html> phải có class 'light' khi user chọn Light`).toMatch(/\blight\b/);
      expect(htmlClassLight ?? "", `[${path}] <html> KHÔNG được có class 'dark' khi user chọn Light`).not.toMatch(/\bdark\b/);

      const forcedDarkWrappers = await findForcedThemeWrappers(page, "dark");
      expect(
        forcedDarkWrappers,
        `[${path}] Phát hiện wrapper ép class "dark" trong <body> khi đang ở Light mode:\n` +
          forcedDarkWrappers.join("\n"),
      ).toEqual([]);

      const colorLight = await getBodyColor(page);

      // ---------- DARK ----------
      await setThemeAndReload(page, "dark", path);

      const htmlClassDark = await page.locator("html").getAttribute("class");
      expect(htmlClassDark ?? "", `[${path}] <html> phải có class 'dark' khi user chọn Dark`).toMatch(/\bdark\b/);
      expect(htmlClassDark ?? "", `[${path}] <html> KHÔNG được có class 'light' khi user chọn Dark`).not.toMatch(/\blight\b/);

      const forcedLightWrappers = await findForcedThemeWrappers(page, "light");
      expect(
        forcedLightWrappers,
        `[${path}] Phát hiện wrapper ép class "light" trong <body> khi đang ở Dark mode:\n` +
          forcedLightWrappers.join("\n"),
      ).toEqual([]);

      const colorDark = await getBodyColor(page);

      // Sanity: theme thực sự đổi màu chữ giữa hai chế độ
      expect(
        colorDark,
        `[${path}] Màu chữ body không đổi giữa Light/Light=${colorLight} vs Dark=${colorDark} — theme có thể không áp dụng`,
      ).not.toBe(colorLight);
    });
  }
});
