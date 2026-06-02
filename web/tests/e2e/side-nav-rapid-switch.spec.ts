import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * Mô phỏng bấm nhanh trên SideNav desktop (≥ md) và xác nhận:
 *  - Không có trang trống (SideNav + body có nội dung)
 *  - Không có flash error UI (toast lỗi, ErrorComponent, "didn't load"…)
 *  - Không có lỗi nghiêm trọng trên Console
 *  - URL cuối khớp tab cuối
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
  "text=/didn.?t load/i",
  "text=/Something went wrong/i",
  "text=/E\\d{3,}/",
  '[data-sonner-toast][data-type="error"]',
];

function attachConsoleWatcher(page: Page) {
  const fatals: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const t = msg.text();
    if (FATAL_CONSOLE_PATTERNS.some((re) => re.test(t))) fatals.push(t);
  });
  page.on("pageerror", (err) => {
    if (FATAL_CONSOLE_PATTERNS.some((re) => re.test(err.message))) fatals.push(err.message);
  });
  return fatals;
}

async function assertNoErrorUI(page: Page) {
  for (const sel of ERROR_UI_SELECTORS) {
    expect(await page.locator(sel).count(), `Phát hiện UI lỗi: ${sel}`).toBe(0);
  }
}

async function assertPageNotBlank(page: Page) {
  await expect(page.locator("aside nav")).toBeVisible();
  const txt = (await page.locator("body").innerText()).trim();
  expect(txt.length, "Trang bị trống").toBeGreaterThan(0);
}

test.describe("SideNav (desktop) - bấm nhanh giữa các tab", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("rapid click không gây trang trống / flash lỗi", async ({ page }) => {
    const fatals = attachConsoleWatcher(page);
    await page.goto("/");
    await expect(page.locator("aside nav")).toBeVisible();
    await assertPageNotBlank(page);

    const sequence: string[] = [];
    for (let i = 0; i < 30; i++) sequence.push(TABS[(i * 7 + 3) % TABS.length]);

    for (const to of sequence) {
      await page
        .locator(`aside nav a[href="${to}"]`)
        .first()
        .click({ noWaitAfter: true, force: true })
        .catch(() => {});
      await page.waitForTimeout(40);
    }

    const finalTo = "/cong-dong";
    await page.locator(`aside nav a[href="${finalTo}"]`).first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);

    expect(new URL(page.url()).pathname).toBe(finalTo);
    await assertPageNotBlank(page);
    await assertNoErrorUI(page);

    // Tab cuối phải được highlight (aria-current="page")
    await expect(
      page.locator(`aside nav a[href="${finalTo}"][aria-current="page"]`),
    ).toBeVisible();

    expect(fatals, `Console fatal:\n${fatals.join("\n")}`).toHaveLength(0);
  });

  test("xoay vòng tất cả tab nhiều lần vẫn render OK", async ({ page }) => {
    const fatals = attachConsoleWatcher(page);
    await page.goto("/");

    for (let round = 0; round < 3; round++) {
      for (const to of TABS) {
        await page
          .locator(`aside nav a[href="${to}"]`)
          .first()
          .click({ noWaitAfter: true });
        await page.waitForTimeout(80);
      }
    }

    await page.waitForLoadState("networkidle");
    await assertPageNotBlank(page);
    await assertNoErrorUI(page);
    expect(fatals).toHaveLength(0);
  });
});
