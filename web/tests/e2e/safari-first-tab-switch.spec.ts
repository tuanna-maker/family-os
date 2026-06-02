import { test, expect, devices, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * Mô phỏng người dùng Safari (WebKit) mở App và chuyển Tab LẦN ĐẦU.
 *
 * Mục tiêu kiểm tra:
 *  - Không crash reconciler (kiểu "undefined is not an object (evaluating 'p[t]')")
 *  - Không có hydration mismatch ("Hydration failed", "did not match", "Text content does not match")
 *  - Không có flash UI lỗi (ErrorComponent, toast lỗi, "didn't load"…)
 *  - Trang sau khi chuyển tab có nội dung và BottomNav vẫn hiển thị
 *  - URL khớp tab đã bấm
 *
 * Test này chạy trên WebKit (engine của Safari) ở viewport iPhone để bám sát
 * môi trường người dùng đã từng gặp lỗi "hiện trang lỗi 1-2s rồi mới vào trang".
 */

const TABS = ["/home", "/gia-dinh", "/bao-an", "/cong-dong", "/tai-khoan"] as const;

const FATAL_CONSOLE_PATTERNS = [
  /undefined is not an object/i,
  /null is not an object/i,
  /Cannot read propert/i,
  /Importing a module script failed/i,
  /Failed to fetch dynamically imported module/i,
  /Loading chunk .* failed/i,
  /ChunkLoadError/i,
  /Unhandled (?:promise )?rejection/i,
];

const HYDRATION_PATTERNS = [
  /Hydration failed/i,
  /did not match/i,
  /Text content does not match/i,
  /Minified React error #418/i, // hydration text mismatch
  /Minified React error #421/i, // hydration whole tree fallback
  /Minified React error #423/i, // hydration suspense
  /There was an error while hydrating/i,
];

const ERROR_UI_SELECTORS = [
  "text=/didn.?t load/i",
  "text=/Something went wrong/i",
  "text=/E\\d{3,}/",
  '[data-sonner-toast][data-type="error"]',
];

function attachConsoleWatcher(page: Page) {
  const fatals: string[] = [];
  const hydration: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    const t = msg.text();
    if (HYDRATION_PATTERNS.some((re) => re.test(t))) hydration.push(t);
    if (msg.type() === "error" && FATAL_CONSOLE_PATTERNS.some((re) => re.test(t))) fatals.push(t);
  });
  page.on("pageerror", (err) => {
    if (HYDRATION_PATTERNS.some((re) => re.test(err.message))) hydration.push(err.message);
    if (FATAL_CONSOLE_PATTERNS.some((re) => re.test(err.message))) fatals.push(err.message);
  });
  return { fatals, hydration };
}

async function assertNoErrorUI(page: Page) {
  for (const sel of ERROR_UI_SELECTORS) {
    expect(await page.locator(sel).count(), `Phát hiện UI lỗi: ${sel}`).toBe(0);
  }
}

async function assertPageNotBlank(page: Page) {
  await expect(page.locator("nav").first()).toBeVisible();
  const txt = (await page.locator("body").innerText()).trim();
  expect(txt.length, "Trang bị trống").toBeGreaterThan(0);
}

test.describe("Safari (WebKit) - chuyển Tab lần đầu trong App", () => {
  test.use({
    ...devices["iPhone 13"],
    // Ép dùng WebKit để mô phỏng Safari thật
    browserName: "webkit",
  });

  for (const to of TABS) {
    test(`lần đầu chuyển sang ${to} không crash, không hydration mismatch`, async ({ page }) => {
      const { fatals, hydration } = attachConsoleWatcher(page);

      // Mở app từ trang chủ — đây là lần load đầu tiên, có SSR/hydration
      await page.goto("/home", { waitUntil: "domcontentloaded" });
      await assertPageNotBlank(page);

      // Đợi hydration ổn định (React commit xong) trước khi bấm
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(200);

      // Hydration mismatch (nếu có) thường log NGAY khi hydrate xong
      expect(
        hydration,
        `Hydration mismatch khi load /home:\n${hydration.join("\n")}`,
      ).toHaveLength(0);

      if (to === "/home") {
        // Trường hợp này chỉ verify load đầu tiên đã sạch
        await assertNoErrorUI(page);
        expect(fatals, `Console fatal:\n${fatals.join("\n")}`).toHaveLength(0);
        return;
      }

      // Bấm tab lần đầu — đây là lúc trước đây hay crash / flash trang lỗi
      const link = page.locator(`nav a[href="${to}"]`).first();
      await expect(link).toBeVisible();
      await link.click();

      // Chờ điều hướng + render xong route mới
      await page.waitForURL(`**${to}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(300);

      expect(new URL(page.url()).pathname).toBe(to);
      await assertPageNotBlank(page);
      await assertNoErrorUI(page);

      expect(
        hydration,
        `Hydration mismatch sau khi chuyển sang ${to}:\n${hydration.join("\n")}`,
      ).toHaveLength(0);
      expect(
        fatals,
        `Console fatal sau khi chuyển sang ${to}:\n${fatals.join("\n")}`,
      ).toHaveLength(0);
    });
  }

  test("chuỗi chuyển tab lần đầu liên tiếp vẫn ổn định trên Safari", async ({ page }) => {
    const { fatals, hydration } = attachConsoleWatcher(page);

    await page.goto("/home", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await assertPageNotBlank(page);

    for (const to of TABS) {
      if (to === "/home") continue;
      await page.locator(`nav a[href="${to}"]`).first().click();
      await page.waitForURL(`**${to}`);
      await page.waitForTimeout(150);
      await assertPageNotBlank(page);
      await assertNoErrorUI(page);
    }

    expect(hydration, `Hydration mismatch:\n${hydration.join("\n")}`).toHaveLength(0);
    expect(fatals, `Console fatal:\n${fatals.join("\n")}`).toHaveLength(0);
  });
});
