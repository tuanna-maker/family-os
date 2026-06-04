import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { QrCameraScanner } from "@/components/QrCameraScanner";
import { normalizeQrPayload, isHelperShiftToken } from "@/lib/qr-payload";
import { redeemHelperShiftToken } from "@/api/helpers";
import { scanVisitorPass } from "@/api/visitor-passes";
import { requireAuth } from "@/api/require-auth";
import { toast } from "sonner";

const searchSchema = z.object({
  type: z.enum(["helper", "visitor"]).default("helper"),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/quet-ma")({
  validateSearch: searchSchema,
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({ meta: [{ title: "Quét mã QR — STOS Life" }] }),
  component: QuetMaPage,
});

function QuetMaPage() {
  const navigate = useNavigate();
  const { type, redirect } = Route.useSearch();
  const qc = useQueryClient();

  const redeemMut = useMutation({
    mutationFn: async (raw: string) => {
      const code = normalizeQrPayload(raw);
      if (type === "visitor") {
        if (isHelperShiftToken(code)) {
          throw new Error("Đây là mã ca giúp việc, không phải mã khách");
        }
        return scanVisitorPass({ pass_code: code });
      }
      if (!isHelperShiftToken(code)) {
        const guest = await scanVisitorPass({ pass_code: code }).catch(() => null);
        if (guest) return guest;
        throw new Error("Mã không hợp lệ — cần mã HLP-… cho giúp việc");
      }
      return redeemHelperShiftToken({ token: code });
    },
    onSuccess: (res) => {
      if ("guest_name" in res && res.guest_name) {
        toast.success(`Đã cho ${res.guest_name} vào`);
        qc.invalidateQueries({ queryKey: ["visitor-passes"] });
      } else {
        toast.success("Đã ghi nhận chấm công");
        qc.invalidateQueries({ queryKey: ["helper-bundle"] });
        qc.invalidateQueries({ queryKey: ["family-helpers"] });
      }
      if (redirect) {
        navigate({ to: redirect });
      } else {
        navigate({ to: type === "visitor" ? "/qr-vao-ra" : "/quan-ly-giup-viec" });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const title = type === "visitor" ? "Quét mã khách" : "Quét mã ca giúp việc";
  const hint =
    type === "visitor"
      ? "Mã từ thẻ QR khách do chủ hộ tạo"
      : "Mã HLP-… phát từ màn hình giúp việc";

  return (
    <QrCameraScanner
      active
      title={title}
      hint={hint}
      manualPlaceholder={type === "visitor" ? "Mã pass khách…" : "HLP-…"}
      onScan={(raw) => {
        if (!redeemMut.isPending) redeemMut.mutate(raw);
      }}
      onClose={() => {
        if (redirect) navigate({ to: redirect });
        else navigate({ to: "/home" });
      }}
    />
  );
}
