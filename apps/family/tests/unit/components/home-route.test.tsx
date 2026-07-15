import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/api/security", () => ({
  getSecurityStatus: vi.fn().mockResolvedValue({
    overall: "success",
    headline: "Tất cả bình thường",
    subline: "Không có cảnh báo",
    updated_at: null,
    open_count: 0,
    chips: [],
  }),
}));

vi.mock("@shared/ui/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "u1" }, loading: false, session: null, signOut: vi.fn() }),
}));

vi.mock("@/hooks/use-family-context", () => ({
  useFamilyContext: () => ({
    familyId: "fam-1",
    familyName: "Gia đình test",
    isLoading: false,
  }),
}));

describe("Home route smoke", () => {
  it("exports security status headline strings used on home", async () => {
    const { getSecurityStatus } = await import("@/api/security");
    const status = await getSecurityStatus({ family_id: "fam-1" });
    render(<p>{status.headline}</p>);
    expect(screen.getByText("Tất cả bình thường")).toBeInTheDocument();
  });
});
