import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@shared/supabase/client";
import {
  Loader2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Đặt lại mật khẩu — STOS Life" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [sessionOk, setSessionOk] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase auto-exchanges the recovery token from the URL hash and fires
    // an onAuthStateChange("PASSWORD_RECOVERY") event with a temporary session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setSessionOk(true);
      }
      setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionOk(true);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate({ to: "/login", search: { redirect: "/" } }), 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="space-y-1.5 mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Đặt lại mật khẩu</h2>
          <p className="text-sm text-muted-foreground">
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>

        {ready && !sessionOk ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-sm text-emergency bg-emergency/10 border border-emergency/20 rounded-xl p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Liên kết đặt lại không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên
                kết mới.
              </span>
            </div>
            <Link
              to="/forgot-password"
              className="block text-center h-11 leading-[44px] rounded-xl bg-gradient-to-br from-brand to-pink text-white font-semibold shadow-[var(--shadow-pop)]"
            >
              Gửi lại liên kết
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <PwField
              label="Mật khẩu mới"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
              autoComplete="new-password"
            />
            <PwField
              label="Xác nhận mật khẩu"
              value={confirm}
              onChange={setConfirm}
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
              autoComplete="new-password"
            />

            {error && (
              <div className="flex items-start gap-2 text-sm text-emergency bg-emergency/10 border border-emergency/20 rounded-xl p-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {done && (
              <div className="flex items-start gap-2 text-sm text-success bg-success/10 border border-success/20 rounded-xl p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Đã cập nhật mật khẩu. Đang chuyển đến trang đăng nhập…</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || done || !sessionOk}
              className="w-full h-11 rounded-xl bg-gradient-to-br from-brand to-pink text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2 shadow-[var(--shadow-pop)] hover:opacity-95 active:scale-[0.99] transition"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Cập nhật mật khẩu
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function PwField({
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className="mt-1 flex items-center gap-2 h-11 rounded-xl bg-muted/40 border border-transparent px-3 focus-within:bg-card focus-within:ring-2 focus-within:ring-brand/50">
        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder="Ít nhất 6 ký tự"
          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
        />
        <button
          type="button"
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground"
          tabIndex={-1}
          aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
