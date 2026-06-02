import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard } from "@/components/common/RoundedCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Ticket, ClipboardPaste } from "lucide-react";

export const Route = createFileRoute("/gia-dinh_/nhap-ma")({
  head: () => ({ meta: [{ title: "Nhập mã lời mời — Gia đình tôi" }] }),
  component: EnterInviteCodePage,
});

// Token là chuỗi hex (>=32 ký tự) sinh từ household-invite.functions.
const TOKEN_RE = /[a-f0-9]{32,}/i;

function extractToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Nếu là URL, lấy segment cuối cùng khớp pattern.
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const m = parts[i].match(TOKEN_RE);
      if (m) return m[0].toLowerCase();
    }
  } catch {
    // không phải URL — bỏ qua
  }
  const m = trimmed.match(TOKEN_RE);
  return m ? m[0].toLowerCase() : null;
}

function EnterInviteCodePage() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractToken(value);
    if (!token) {
      setError("Mã hoặc liên kết không hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }
    setError(null);
    navigate({ to: "/gia-dinh/invite/$token", params: { token } });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setValue(text);
        setError(null);
      }
    } catch {
      toast.error("Không truy cập được clipboard. Vui lòng dán thủ công.");
    }
  };

  return (
    <MobileShell>
      <PageHeader title="Nhập mã lời mời" back="/gia-dinh" />

      <section className="px-4 mt-2 space-y-4">
        <RoundedCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-tint-blue grid place-items-center shrink-0">
              <Ticket className="h-5 w-5 text-brand" />
            </div>
            <div className="text-[13px] text-muted-foreground leading-relaxed">
              Dán <span className="font-semibold text-foreground">liên kết mời</span> hoặc
              <span className="font-semibold text-foreground"> mã token</span> bạn nhận được
              qua email/SMS để mở lời mời.
            </div>
          </div>
        </RoundedCard>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="invite-input" className="text-[13px] font-semibold">
              Liên kết hoặc mã mời
            </Label>
            <div className="flex gap-2">
              <Input
                id="invite-input"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="https://... hoặc 64 ký tự token"
                autoComplete="off"
                spellCheck={false}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handlePaste}
                aria-label="Dán từ clipboard"
              >
                <ClipboardPaste className="h-4 w-4" />
              </Button>
            </div>
            {error && (
              <p className="text-[12px] text-emergency font-medium">{error}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!value.trim()}>
            Mở lời mời
          </Button>
        </form>
      </section>
    </MobileShell>
  );
}
