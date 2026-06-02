import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * Mô phỏng người dùng bấm rất nhanh giữa các tab dưới và xác nhận:
 *  - Không có trang trống (body có nội dung, BottomNav vẫn hiển thị)
 *  - Không có flash error UI (toast lỗi, ErrorComponent, "didn't load"...)
 *  - Không có lỗi nghiêm trọng trên Console (module load, unhandled rejection)
 *  - URL cuối cùng khớp với tab được bấm cuối
 */

const TABS = ["/", "/gia-dinh", "/bao-an", "/cong-dong", "/tai-khoan"] as const;

const FATAL_CONSOLE_PATTERNS = [
  /Importing a module script failed/i,
  /Failed to fetch dynamically imported module/i,
  /Loading chunk .* failed/i,
  /ChunkLoadError/i,
  /Unhandled (?:promise )?rejection/i,
];

const ERROR_UI_SELECTORS = [
  'text=/didn.?t load/i',
  'text=/Something went wrong/i',
  'text=/E\\d{3,}/', // mã lỗi E#### từ ErrorComponent
  '[data-sonner-toast][data-type="error"]',
];

function attachConsoleWatcher(page: Page) {
  const fatals: string[] = [];
  const handler = (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (FATAL_CONSOLE_PATTERNS.some((re) => re.test(text))) fatals.push(text);
  };
  page.on("console", handler);
  page.on("pageerror", (err) => {
    if (FATAL_CONSOLE_PATTERNS.some((re) => re.test(err.message))) fatals.push(err.message);
  });
  return fatals;
}

async function assertNoErrorUI(page: Page) {
  for (const sel of ERROR_UI_SELECTORS) {
    const count = await page.locator(sel).count();
    expect(count, `Phát hiện UI lỗi: ${sel}`).toBe(0);
  }
}

async function assertPageNotBlank(page: Page) {
  // BottomNav phải luôn hiển thị
  await expect(page.locator("nav")).toBeVisible();
  const bodyText = (await page.locator("body").innerText()).trim();
  expect(bodyText.length, "Trang bị trống").toBeGreaterThan(0);
}

test.describe("BottomNav - bấm nhanh giữa các tab", () => {
  test("rapid tap không gây trang trống / flash lỗi", async ({ page }) => {
    const fatals = attachConsoleWatcher(page);

    await page.goto("/");
    await assertPageNotBlank(page);

    // Tạo chuỗi 30 lần bấm ngẫu nhiên giữa các tab, không chờ điều hướng hoàn tất
    const sequence: string[] = [];
    for (let i = 0; i < 30; i++) {
      const to = TABS[(i * 7 + 3) % TABS.length];
      sequence.push(to);
    }

    for (const to of sequence) {
      // Click không await navigation -> ép tình huống "spam tap"
      const link = page.locator(`nav a[href="${to}"]`).first();
      await link.click({ noWaitAfter: true, force: true }).catch(() => {});
      await page.waitForTimeout(40); // ~25 click/giây
    }

    // Bấm cú cuối có chủ đích và chờ ổn định
    const finalTo = "/cong-dong";
    await page.locator(`nav a[href="${finalTo}"]`).first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);

    expect(new URL(page.url()).pathname).toBe(finalTo);
    await assertPageNotBlank(page);
    await assertNoErrorUI(page);
    expect(fatals, `Console fatal errors:\n${fatals.join("\n")}`).toHaveLength(0);
  });

  test("xoay vòng tất cả tab nhiều lần vẫn render OK", async ({ page }) => {
    const fatals = attachConsoleWatcher(page);
    await page.goto("/");

    for (let round = 0; round < 3; round++) {
      for (const to of TABS) {
        await page.locator(`nav a[href="${to}"]`).first().click({ noWaitAfter: true });
        await page.waitForTimeout(80);
      }
    }

    await page.waitForLoadState("networkidle");
    await assertPageNotBlank(page);
    await assertNoErrorUI(page);
    expect(fatals).toHaveLength(0);
  });
});
