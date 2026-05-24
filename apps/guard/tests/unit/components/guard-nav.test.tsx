import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GUARD_BOTTOM_TABS } from "@/routes/guard";

vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => ({ location: { pathname: "/guard" } }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  createFileRoute: () => (opts: unknown) => opts,
  redirect: vi.fn(),
  Outlet: () => null,
}));

vi.mock("@shared/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "g1" } } }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [{ role: "security_staff" }], error: null }),
    })),
  },
}));

function GuardNavPreview() {
  return (
    <nav>
      <ul>
        {GUARD_BOTTOM_TABS.map(({ to, label }) => (
          <li key={to}>
            <a href={to}>{label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

describe("Guard bottom navigation", () => {
  it("defines four Vietnamese tabs", () => {
    expect(GUARD_BOTTOM_TABS).toHaveLength(4);
    expect(GUARD_BOTTOM_TABS.map((t) => t.label)).toEqual([
      "Trang chủ",
      "Lịch trực",
      "Thông báo",
      "Tài khoản",
    ]);
  });

  it("renders guard nav labels", () => {
    render(<GuardNavPreview />);
    expect(screen.getByText("Trang chủ")).toBeInTheDocument();
    expect(screen.getByText("Lịch trực")).toBeInTheDocument();
    expect(screen.getByText("Thông báo")).toBeInTheDocument();
    expect(screen.getByText("Tài khoản")).toBeInTheDocument();
  });
});
