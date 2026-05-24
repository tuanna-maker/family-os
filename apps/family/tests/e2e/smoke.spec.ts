import { test, expect } from "@playwright/test";
import { TEST_ACCOUNTS } from "@shared/test-utils/test-accounts";

test.describe("Family app smoke", () => {
  test.skip(!process.env.E2E_LIVE, "Set E2E_LIVE=1 with dev server + Supabase");

  test("login → home → logout", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email|tên đăng nhập/i).fill(TEST_ACCOUNTS.family.email);
    await page.getByLabel(/mật khẩu/i).fill(TEST_ACCOUNTS.family.password);
    await page.getByRole("button", { name: /đăng nhập/i }).click();
    await expect(page).toHaveURL(/\/home/);
    await page.getByRole("link", { name: /tài khoản/i }).click();
    await page.getByRole("button", { name: /đăng xuất/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
