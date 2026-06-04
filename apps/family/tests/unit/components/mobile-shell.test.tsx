import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";

vi.mock("@shared/ui/mobile/SideNav", () => ({
  SideNav: () => <aside data-testid="side-nav">Side</aside>,
}));

describe("MobileShell", () => {
  it("renders children without bottom nav", () => {
    render(
      <MobileShell>
        <main>Nội dung trang</main>
      </MobileShell>,
    );
    expect(screen.getByTestId("side-nav")).toBeInTheDocument();
    expect(screen.queryByTestId("bottom-nav")).not.toBeInTheDocument();
    expect(screen.getByText("Nội dung trang")).toBeInTheDocument();
  });
});
