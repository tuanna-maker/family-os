import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";

vi.mock("@shared/ui/mobile/SideNav", () => ({
  SideNav: () => <aside data-testid="side-nav">Side</aside>,
}));

vi.mock("@shared/ui/mobile/BottomNav", () => ({
  BottomNav: () => <nav data-testid="bottom-nav">Bottom</nav>,
}));

describe("MobileShell", () => {
  it("renders children between side and bottom nav", () => {
    render(
      <MobileShell>
        <main>Nội dung trang</main>
      </MobileShell>,
    );
    expect(screen.getByTestId("side-nav")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
    expect(screen.getByText("Nội dung trang")).toBeInTheDocument();
  });
});
