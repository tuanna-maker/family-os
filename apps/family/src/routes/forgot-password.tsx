import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@shared/supabase/client";
import { Loader2, Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Quên mật khẩu — STOS Life" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email không hợp lệ.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setInfo(
        "Đã gửi liên kết đặt lại mật khẩu tới email của bạn. Vui lòng kiểm tra hộp thư (và mục Spam).",
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/login"
          search={{ redirect: "/" }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
        </Link>

        <div className="space-y-1.5 mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Quên mật khẩu?</h2>
          <p className="text-sm text-muted-foreground">
            Nhập email của bạn, chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Email
            </span>
            <div className="mt-1 flex items-center gap-2 h-11 rounded-xl bg-muted/40 border border-transparent px-3 focus-within:bg-card focus-within:ring-2 focus-within:ring-brand/50">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@vidu.vn"
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </label>

          {error && (
            <div className="flex items-start gap-2 text-sm text-emergency bg-emergency/10 border border-emergency/20 rounded-xl p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {info && (
            <div className="flex items-start gap-2 text-sm text-success bg-success/10 border border-success/20 rounded-xl p-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-xl bg-gradient-to-br from-brand to-pink text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2 shadow-[var(--shadow-pop)] hover:opacity-95 active:scale-[0.99] transition"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Gửi liên kết đặt lại
          </button>
        </form>
      </div>
    </div>
  );
}
