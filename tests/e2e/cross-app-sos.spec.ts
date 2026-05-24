import { test, expect } from "@playwright/test";
import { TEST_ACCOUNTS } from "@shared/test-utils/test-accounts";

/**
 * Cross-app SOS flow — requires two browser contexts + live Supabase.
 * Run: E2E_LIVE=1 FAMILY_URL=http://localhost:5173 GUARD_URL=http://localhost:5174 npx playwright test cross-app-sos
 */
test.describe("Cross-app SOS", () => {
  test.skip(!process.env.E2E_LIVE, "Requires live stack");

  test("family SOS → guard receives → guard closes → family resolved", async ({ browser }) => {
    const familyUrl = process.env.FAMILY_URL ?? "http://localhost:5173";
    const guardUrl = process.env.GUARD_URL ?? "http://localhost:5174";

    const familyCtx = await browser.newContext({ baseURL: familyUrl });
    const guardCtx = await browser.newContext({ baseURL: guardUrl });
    const familyPage = await familyCtx.newPage();
    const guardPage = await guardCtx.newPage();

  // Family login + SOS
    await familyPage.goto("/login");
    await familyPage.getByLabel(/email|tên/i).fill(TEST_ACCOUNTS.family.email);
    await familyPage.getByLabel(/mật khẩu/i).fill(TEST_ACCOUNTS.family.password);
    await familyPage.getByRole("button", { name: /đăng nhập/i }).click();
    await familyPage.goto("/bao-an");
    await familyPage.getByRole("button", { name: /SOS|Khẩn cấp/i }).click();

  // Guard login + open security dashboard
    await guardPage.goto("/login");
    await guardPage.getByLabel(/email|tên/i).fill(TEST_ACCOUNTS.guardStaff.email);
    await guardPage.getByLabel(/mật khẩu/i).fill(TEST_ACCOUNTS.guardStaff.password);
    await guardPage.getByRole("button", { name: /đăng nhập/i }).click();
    await guardPage.goto("/security");
    await expect(guardPage.getByText(/SOS|Đang mở/i)).toBeVisible({ timeout: 30_000 });

    await guardPage.getByRole("button", { name: /Hoàn thành|Đóng/i }).first().click();

    await familyPage.reload();
    await expect(familyPage.getByText(/đã xử lý|hoàn thành/i)).toBeVisible({ timeout: 30_000 });

    await familyCtx.close();
    await guardCtx.close();
  });
});
