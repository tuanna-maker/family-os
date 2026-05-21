import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Loader2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Đăng nhập — STOS Life" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: (s.redirect as string) || "/workspaces",
  }),
  component: LoginPage,
});

type AuthMode = "signin" | "signup";

const ERROR_MAP: Record<string, string> = {
  "Invalid login credentials": "Email hoặc mật khẩu không đúng.",
  "Email not confirmed": "Email chưa được xác thực. Vui lòng kiểm tra hộp thư.",
  "User already registered": "Email này đã được đăng ký. Hãy đăng nhập.",
  "Password should be at least 6 characters": "Mật khẩu phải có ít nhất 6 ký tự.",
  "Unable to validate email address: invalid format": "Định dạng email không hợp lệ.",
  "Signups not allowed for this instance": "Chức năng đăng ký đang tạm khóa.",
};

function translateError(message: string): string {
  return ERROR_MAP[message] ?? message;
}

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    name?: string;
  }>({});

  if (!loading && session) {
    navigate({ to: redirect, replace: true });
  }

  const validate = () => {
    const errs: typeof fieldErrors = {};
    if (mode === "signup" && !name.trim()) errs.name = "Vui lòng nhập họ tên.";
    if (!email.trim()) errs.email = "Vui lòng nhập email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Email không hợp lệ.";
    if (!password) errs.password = "Vui lòng nhập mật khẩu.";
    else if (password.length < 6) errs.password = "Mật khẩu phải có ít nhất 6 ký tự.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!validate()) return;

    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: redirect, replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: redirect, replace: true });
        } else {
          setInfo("Đã gửi email xác thực. Vui lòng kiểm tra hộp thư để hoàn tất đăng ký.");
        }
      }
    } catch (err) {
      setError(translateError((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left brand panel (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand via-primary to-pink p-12 flex-col justify-between text-white">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur grid place-items-center text-2xl shadow-lg">
              🏠
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">STOS Life</p>
              <p className="text-xs text-white/70">Family Core · Security Core</p>
            </div>
          </Link>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Quản lý cuộc sống <br /> gia đình thông minh.
          </h1>
          <p className="text-white/80 max-w-md leading-relaxed">
            Một nơi để theo dõi sức khỏe, lịch trình, an ninh và những khoảnh khắc
            quan trọng của cả gia đình.
          </p>

          <ul className="space-y-3 pt-4">
            {[
              { icon: ShieldCheck, text: "An ninh tòa nhà · cảnh báo thời gian thực" },
              { icon: Users, text: "Theo dõi sức khỏe ông bà, con cái" },
              { icon: Sparkles, text: "Nhắc nhở thuốc, lịch học, sự kiện gia đình" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/90">
                <span className="h-8 w-8 rounded-xl bg-white/15 grid place-items-center">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">© STOS Life · Unicom AI</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex lg:hidden items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand to-pink grid place-items-center text-2xl shadow-[var(--shadow-pop)]">
              🏠
            </div>
            <div>
              <p className="text-base font-bold">STOS Life</p>
              <p className="text-[11px] text-muted-foreground">
                Family Core · Security Core
              </p>
            </div>
          </Link>

          <div className="space-y-1.5 mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              {mode === "signin" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "signin"
                ? "Đăng nhập để tiếp tục với gia đình của bạn."
                : "Chỉ mất một phút để bắt đầu."}
            </p>
          </div>

          <div className="flex rounded-xl bg-muted p-1 text-sm mb-5">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError("");
                  setInfo("");
                  setFieldErrors({});
                }}
                className={`flex-1 py-2 rounded-lg font-medium transition ${
                  mode === m
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? "Đăng nhập" : "Đăng ký"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {mode === "signup" && (
              <Field
                label="Họ và tên"
                icon={User}
                value={name}
                onChange={(v) => {
                  setName(v);
                  if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                }}
                placeholder="Nguyễn Văn A"
                error={fieldErrors.name}
                autoComplete="name"
              />
            )}

            <Field
              label="Email"
              icon={Mail}
              type="email"
              value={email}
              onChange={(v) => {
                setEmail(v);
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
              }}
              placeholder="ban@vidu.vn"
              error={fieldErrors.email}
              autoComplete="email"
            />

            <Field
              label="Mật khẩu"
              icon={Lock}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(v) => {
                setPassword(v);
                if (fieldErrors.password)
                  setFieldErrors({ ...fieldErrors, password: undefined });
              }}
              placeholder="Ít nhất 6 ký tự"
              error={fieldErrors.password}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            {mode === "signin" && (
              <div className="flex justify-end -mt-1">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
            )}


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
              className="w-full h-11 rounded-xl bg-gradient-to-br from-brand to-pink text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[var(--shadow-pop)] hover:opacity-95 active:scale-[0.99] transition"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              {mode === "signin" ? (
                <>
                  Chưa có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-brand font-semibold hover:underline"
                  >
                    Đăng ký ngay
                  </button>
                </>
              ) : (
                <>
                  Đã có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="text-brand font-semibold hover:underline"
                  >
                    Đăng nhập
                  </button>
                </>
              )}
            </p>
          </form>

          <p className="text-center text-[11px] text-muted-foreground mt-6">
            Bằng việc tiếp tục, bạn đồng ý với điều khoản dịch vụ.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  icon: Icon,
  trailing,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trailing?: React.ReactNode;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div
        className={`mt-1 flex items-center gap-2 h-11 rounded-xl bg-muted/40 border px-3 transition focus-within:bg-card focus-within:ring-2 focus-within:ring-brand/50 ${
          error ? "border-emergency/50" : "border-transparent"
        }`}
      >
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
        />
        {trailing}
      </div>
      {error && (
        <span className="mt-1 block text-xs text-emergency font-medium">{error}</span>
      )}
    </label>
  );
}
