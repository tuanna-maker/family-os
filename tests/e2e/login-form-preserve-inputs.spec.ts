/**
 * E2E: trong suốt quá trình submit → điều hướng sau khi đăng nhập thành công,
 * form login KHÔNG được tự xoá giá trị input (username/identifier + password).
 *
 * Lý do: trước đây có bug "nháy form" — bấm Đăng nhập, ô identifier và
 * password đột nhiên rỗng trước khi router kịp chuyển trang. Test này canh
 * gác regression bằng cách poll giá trị 2 input liên tục cho tới khi URL
 * rời khỏi /login và assert không có frame nào input rỗng.
 *
 * Cách chạy:
 *   BASE_URL=http://localhost:5173 \
 *   LOGIN_USERNAME=lean \
 *   LOGIN_PASSWORD=123456 \
 *   bunx playwright test tests/e2e/login-form-preserve-inputs.spec.ts
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
const USERNAME = process.env.LOGIN_USERNAME ?? "lean";
const PASSWORD = process.env.LOGIN_PASSWORD ?? "123456";

test.describe("Login form giữ nguyên input trong khi điều hướng", () => {
  test("Identifier + password không bị xoá từ lúc submit đến khi rời /login", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`);

    const identifier = page.getByLabel(/tên đăng nhập hoặc email/i);
    const password = page.getByLabel(/mật khẩu/i).first();
    const submit = page.getByRole("button", { name: /đăng nhập/i }).first();

    await identifier.fill(USERNAME);
    await password.fill(PASSWORD);

    await expect(identifier).toHaveValue(USERNAME);
    await expect(password).toHaveValue(PASSWORD);

    // Bắt đầu poll giá trị input ngay trước khi bấm submit, dừng khi URL
    // không còn ở /login. Mọi frame phải có cả 2 input != rỗng.
    const stopFlag = { stop: false };
    const samples: Array<{ t: number; url: string; id: string; pw: string }> = [];
    const t0 = Date.now();

    const poller = (async () => {
      while (!stopFlag.stop) {
        try {
          const idVal = await identifier.inputValue({ timeout: 500 }).catch(() => "<unmounted>");
          const pwVal = await password.inputValue({ timeout: 500 }).catch(() => "<unmounted>");
          samples.push({ t: Date.now() - t0, url: page.url(), id: idVal, pw: pwVal });
          // Nếu đã rời khỏi /login (input có thể bị unmount → đó là OK), dừng.
          if (!page.url().includes("/login")) break;
        } catch {
          break;
        }
        await page.waitForTimeout(40);
      }
    })();

    await submit.click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15_000 });
    stopFlag.stop = true;
    await poller;

    // Lọc các sample còn ở trang /login (sau khi rời trang, input có thể là
    // "<unmounted>" — không tính là bug).
    const loginSamples = samples.filter((s) => s.url.includes("/login"));
    expect(loginSamples.length, "phải có ít nhất 1 sample khi vẫn ở /login").toBeGreaterThan(0);

    const cleared = loginSamples.filter((s) => s.id === "" || s.pw === "");
    if (cleared.length > 0) {
      console.log("Samples bị rỗng:", cleared);
    }
    expect(
      cleared,
      `Form bị xoá input giữa chừng (${cleared.length}/${loginSamples.length} frame rỗng)`,
    ).toHaveLength(0);
  });
});
