import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BottomNav } from "@shared/ui/mobile/BottomNav";

vi.mock("@tanstack/react-router", () => ({
  useRouterState: (opts?: { select?: (s: { location: { pathname: string } }) => unknown }) => {
    const state = { location: { pathname: "/home" } };
    return opts?.select ? opts.select(state) : state;
  },
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe("BottomNav", () => {
  it("renders five Vietnamese nav labels", () => {
    render(<BottomNav />);
    expect(screen.getByText("Trang chủ")).toBeInTheDocument();
    expect(screen.getByText("Gia đình")).toBeInTheDocument();
    expect(screen.getByText("Bảo an")).toBeInTheDocument();
    expect(screen.getByText("Cộng đồng")).toBeInTheDocument();
    expect(screen.getByText("Tài khoản")).toBeInTheDocument();
  });

  it("marks home tab as current page", () => {
    render(<BottomNav />);
    const home = screen.getByText("Trang chủ").closest("a");
    expect(home).toHaveAttribute("aria-current", "page");
  });
});
