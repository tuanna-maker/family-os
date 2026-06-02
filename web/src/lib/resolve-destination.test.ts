import { describe, it, expect } from "vitest";
import { resolveDestinationPure, type MyContextLike } from "./resolve-destination";

const family: MyContextLike = {
  roles: ["family_owner"],
  isSuperAdmin: false,
  isAdmin: false,
  isSecurity: false,
};
const member: MyContextLike = {
  roles: ["family_member"],
  isSuperAdmin: false,
  isAdmin: false,
  isSecurity: false,
};
const admin: MyContextLike = {
  roles: ["admin"],
  isSuperAdmin: false,
  isAdmin: true,
  isSecurity: false,
};

describe("resolveDestinationPure — family invariant", () => {
  it("family_owner -> /home (bỏ qua redirect)", () => {
    expect(
      resolveDestinationPure({
        ctx: family,
        requestedRedirect: "/admin/super",
        entrySource: null,
      }),
    ).toBe("/home");
  });

  it("family_member -> /home (bỏ qua redirect)", () => {
    expect(
      resolveDestinationPure({
        ctx: member,
        requestedRedirect: "/guard",
        entrySource: "deeplink",
      }),
    ).toBe("/home");
  });

  it("family + entrySource=landing -> /home", () => {
    expect(
      resolveDestinationPure({
        ctx: family,
        requestedRedirect: null,
        entrySource: "landing",
      }),
    ).toBe("/home");
  });

  it("family kiêm admin -> không ép /home (đi theo nhánh admin)", () => {
    const dual: MyContextLike = {
      roles: ["family_owner", "admin"],
      isAdmin: true,
    };
    expect(
      resolveDestinationPure({ ctx: dual, requestedRedirect: null, entrySource: null }),
    ).toBe("/admin");
  });

  it("kịch bản login -> logout -> login: cùng family ctx luôn ra /home", () => {
    // lần đăng nhập 1: không có redirect
    const first = resolveDestinationPure({
      ctx: family,
      requestedRedirect: null,
      entrySource: "landing",
    });
    // sau khi đăng xuất, login lại với URL có redirect cũ còn sót
    const second = resolveDestinationPure({
      ctx: family,
      requestedRedirect: "/admin/super",
      entrySource: null,
    });
    // login lần 3 với entrySource=landing
    const third = resolveDestinationPure({
      ctx: member,
      requestedRedirect: "/guard",
      entrySource: "landing",
    });
    expect([first, second, third]).toEqual(["/home", "/home", "/home"]);
  });
});

describe("resolveDestinationPure — non-family", () => {
  it("super_admin -> /admin/super", () => {
    expect(
      resolveDestinationPure({
        ctx: { roles: [], isSuperAdmin: true },
        requestedRedirect: null,
        entrySource: null,
      }),
    ).toBe("/admin/super");
  });

  it("security -> /guard", () => {
    expect(
      resolveDestinationPure({
        ctx: { roles: [], isSecurity: true },
        requestedRedirect: null,
        entrySource: null,
      }),
    ).toBe("/guard");
  });

  it("admin -> /admin", () => {
    expect(
      resolveDestinationPure({ ctx: admin, requestedRedirect: null, entrySource: null }),
    ).toBe("/admin");
  });

  it("non-family theo redirect khi entrySource != landing", () => {
    expect(
      resolveDestinationPure({
        ctx: { roles: [] },
        requestedRedirect: "/inbox",
        entrySource: null,
      }),
    ).toBe("/inbox");
  });

  it("non-family bỏ redirect khi entrySource=landing", () => {
    expect(
      resolveDestinationPure({
        ctx: { roles: [] },
        requestedRedirect: "/inbox",
        entrySource: "landing",
      }),
    ).toBe("/home");
  });
});

describe("resolveDestinationPure — fallback", () => {
  it("ctx=null (getMyContext lỗi) -> /home", () => {
    expect(
      resolveDestinationPure({
        ctx: null,
        requestedRedirect: "/admin/super",
        entrySource: null,
      }),
    ).toBe("/home");
  });
});
