import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@shared/supabase/client";
import { useAuth } from "@shared/ui/hooks/use-auth";
import { getMyContext } from "@/api/auth";
import { resolveLoginEmail, checkUsernameAvailable } from "@/api/username";
import { resolveDestinationPure, getPilotLoginDefaults } from "@shared/utils";
import { PilotDemoBanner } from "@shared/ui";
import { listPublicProjects } from "@shared/supabase";
import {
  Loader2,
  Mail,
  Lock,
  User,
  AtSign,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Users,
  Building2,
  Home,
  Search,
  ChevronDown,
  Check,
  X,
} from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Đăng nhập — STOS Life" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    source: typeof s.source === "string" ? s.source : undefined,
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
  const { source } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useAuth();

    const projectsQuery = useQuery({
    queryKey: ["public-projects"],
    queryFn: () => listPublicProjects(),
    staleTime: 5 * 60_000,
  });
  const projects = projectsQuery.data?.projects ?? [];

  const pilotDefaults = getPilotLoginDefaults();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [identifier, setIdentifier] = useState(pilotDefaults.identifier);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(pilotDefaults.password);
  const [name, setName] = useState("");           // Tên chủ hộ
  const [buildingName, setBuildingName] = useState(""); // Tên chung cư
  const [apartmentNo, setApartmentNo] = useState("");   // Số căn hộ
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    identifier?: string;
    email?: string;
    username?: string;
    password?: string;
    name?: string;
    buildingName?: string;
    apartmentNo?: string;
  }>({});

  // `resolving` = đang chạy resolveDestination (sau signIn hoặc auto-redirect khi đã có session).
  // Dùng để chặn double-navigate và để hiển thị overlay loading.
  const [resolving, setResolving] = useState(false);

  // Snapshot giá trị form ngay khi bắt đầu submit để có thể khôi phục nếu
  // trình duyệt/password manager hoặc một re-render bất ngờ làm rỗng input
  // trong lúc phiên đăng nhập đang chạy.
  const submittingValuesRef = useRef<{ identifier: string; email: string; password: string } | null>(null);
  useEffect(() => {
    if (!busy && !resolving) {
      submittingValuesRef.current = null;
      return;
    }
    const snap = submittingValuesRef.current;
    if (!snap) return;
    if (!identifier && snap.identifier) setIdentifier(snap.identifier);
    if (!email && snap.email) setEmail(snap.email);
    if (!password && snap.password) setPassword(snap.password);
  }, [busy, resolving, identifier, email, password]);

  // Auto-redirect khi đã có session sẵn (vd: user quay lại /login khi vẫn đăng nhập).
  // Phải đợi getMyContext xong rồi mới điều hướng — không bao giờ navigate dựa trên
  // mỗi ?redirect= mà chưa biết role, tránh đẩy family user sang trang sai.
  useEffect(() => {
    if (loading || !session) return;
    if (typeof window === "undefined") return;
    if (source === "landing") return;
    if (busy || resolving) return; // onSubmit đang lo việc điều hướng
    let cancelled = false;
    setResolving(true);
    (async () => {
      const to = await resolveDestination();
      if (!cancelled) navigate({ to, replace: true });
    })().finally(() => {
      if (!cancelled) setResolving(false);
    });
    return () => {
      cancelled = true;
    };
    // resolveDestination đọc roles từ server mỗi lần → không cần thêm dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, source]);


  const validate = () => {
    const errs: typeof fieldErrors = {};
    if (mode === "signin") {
      if (!identifier.trim()) errs.identifier = "Vui lòng nhập tên đăng nhập hoặc email.";
    } else {
      if (!buildingName.trim()) errs.buildingName = "Vui lòng nhập tên chung cư.";
      if (!apartmentNo.trim()) errs.apartmentNo = "Vui lòng nhập số căn hộ.";
      if (!name.trim()) errs.name = "Vui lòng nhập tên chủ hộ.";
      if (!username.trim()) errs.username = "Vui lòng nhập tên đăng nhập.";
      else if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username))
        errs.username = "Tên đăng nhập 3–30 ký tự (chữ, số, . hoặc _).";
      if (!email.trim()) errs.email = "Vui lòng nhập email.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Email không hợp lệ.";
    }
    if (!password) errs.password = "Vui lòng nhập mật khẩu.";
    else if (password.length < 6) errs.password = "Mật khẩu phải có ít nhất 6 ký tự.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Gọi getMyContext có retry để né race khi bearer token vừa được attacher set xong.
  const fetchContextWithRetry = async (attempts = 3, delayMs = 150) => {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await getMyContext();
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
    throw lastErr;
  };

  const resolveDestination = async (): Promise<string> => {
    let requestedRedirect: string | null = null;
    let entrySource: string | null = null;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      requestedRedirect = params.get("redirect");
      entrySource = params.get("source");
    }
    try {
      const ctx = await fetchContextWithRetry();
      return resolveDestinationPure({
        ctx,
        requestedRedirect,
        entrySource,
      });
    } catch {
      return resolveDestinationPure({ ctx: null, requestedRedirect, entrySource });
    }
  };




  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!validate()) return;

    setBusy(true);
    submittingValuesRef.current = { identifier, email, password };
    try {
      if (mode === "signin") {
        const GENERIC_AUTH_ERROR = "Tên đăng nhập/email hoặc mật khẩu không đúng.";
        let loginEmail = identifier.trim();
        if (!loginEmail.includes("@")) {
          // Tra cứu username -> email. Server luôn trả null nếu sai format hoặc không tồn tại
          // để không lộ thông tin username nào tồn tại.
          const res = await resolveLoginEmail({ username: loginEmail });
          if (!res.email) throw new Error(GENERIC_AUTH_ERROR);
          loginEmail = res.email;
        }
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw new Error(GENERIC_AUTH_ERROR);
        const to = await resolveDestination();
        navigate({ to, replace: true });
      } else {

        // Kiểm tra username có sẵn không
        const check = await checkUsernameAvailable({ username: username.trim() });
        if (!check.available) {
          setFieldErrors((f) => ({ ...f, username: "Tên đăng nhập đã tồn tại." }));
          setBusy(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              head_name: name,
              username: username.trim(),
              building_name: buildingName.trim(),
              apartment_no: apartmentNo.trim(),
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session) {
          // Đảm bảo tạo gia đình + gán role family_owner cho tài khoản mới
          try {
            await getMyContext();
          } catch {
            // bỏ qua – getMyContext sẽ được gọi lại khi vào /home
          }
          // Đăng ký từ Landing luôn là tài khoản Gia đình → vào thẳng app gia đình
          navigate({ to: "/home", replace: true });
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
    <div className="min-h-dvh flex bg-background relative">
      {(resolving || (session && !loading && !busy && source !== "landing")) && (
        <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm grid place-items-center">
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
            <span>Đang chuẩn bị workspace của bạn…</span>
          </div>
        </div>
      )}

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
      <div className="flex-1 flex items-center justify-center px-5 py-8 sm:px-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
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
            {mode === "signin" && pilotDefaults.label && (
              <div className="pt-2">
                <PilotDemoBanner roleLabel={pilotDefaults.label} appName="STOS Life" />
              </div>
            )}
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
                className={`flex-1 min-h-11 py-2 rounded-lg font-medium transition touch-manipulation ${
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
              <>
                <SearchableSelectField
                  label="Tên chung cư"
                  icon={Building2}
                  value={buildingName}
                  onChange={(v) => {
                    setBuildingName(v);
                    if (fieldErrors.buildingName)
                      setFieldErrors({ ...fieldErrors, buildingName: undefined });
                  }}
                  error={fieldErrors.buildingName}
                  placeholder={
                    projectsQuery.isLoading
                      ? "Đang tải danh sách..."
                      : projects.length === 0
                        ? "Chưa có chung cư trong hệ thống"
                        : "-- Chọn chung cư --"
                  }
                  options={projects.map((p) => ({
                    value: p.name,
                    label: p.name,
                    sublabel: p.city ?? undefined,
                    searchText: `${p.name} ${p.city ?? ""}`.toLowerCase(),
                  }))}
                  disabled={projectsQuery.isLoading || projects.length === 0}
                />

                <Field
                  label="Số căn hộ"
                  icon={Home}
                  value={apartmentNo}
                  onChange={(v) => {
                    setApartmentNo(v);
                    if (fieldErrors.apartmentNo)
                      setFieldErrors({ ...fieldErrors, apartmentNo: undefined });
                  }}
                  placeholder="vd: A-15-02"
                  error={fieldErrors.apartmentNo}
                  autoComplete="address-line2"
                />
                <Field
                  label="Tên chủ hộ"
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
                <Field
                  label="Tên đăng nhập"
                  icon={AtSign}
                  value={username}
                  onChange={(v) => {
                    setUsername(v.replace(/\s+/g, ""));
                    if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: undefined });
                  }}
                  placeholder="vd: nguyenvana"
                  error={fieldErrors.username}
                  autoComplete="username"
                />
              </>
            )}

            {mode === "signin" ? (
              <Field
                label="Tên đăng nhập hoặc Email"
                icon={AtSign}
                value={identifier}
                onChange={(v) => {
                  setIdentifier(v);
                  if (fieldErrors.identifier) setFieldErrors({ ...fieldErrors, identifier: undefined });
                }}
                placeholder="nguyenvana hoặc ban@vidu.vn"
                error={fieldErrors.identifier}
                autoComplete={pilotDefaults.identifier ? "off" : "username"}
                readOnly={busy || resolving}
              />
            ) : (
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
                readOnly={busy || resolving}
              />
            )}

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
              autoComplete={
                pilotDefaults.password && mode === "signin" ? "off" : mode === "signin" ? "current-password" : "new-password"
              }
              readOnly={busy || resolving}
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
              className="w-full min-h-12 h-12 rounded-xl bg-gradient-to-br from-brand to-pink text-white font-semibold text-base disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[var(--shadow-pop)] hover:opacity-95 active:scale-[0.98] transition touch-manipulation"
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
  readOnly,
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
  readOnly?: boolean;
}) {
  // Giữ nguyên giá trị ngay cả khi trình duyệt/password manager cố ý clear input
  // trong lúc form đang xử lý: nếu DOM value lệch với React state, ép lại bằng state.
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = inputRef.current;
    if (el && el.value !== value) {
      el.value = value;
    }
  }, [value]);
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div
        className={`mt-1 flex items-center gap-2 h-12 rounded-xl bg-muted/40 border px-3 transition focus-within:bg-card focus-within:ring-2 focus-within:ring-brand/50 ${
          error ? "border-emergency/50" : "border-transparent"
        }`}
      >
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          readOnly={readOnly}
          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60 read-only:cursor-default"
        />
        {trailing}
      </div>
      {error && (
        <span className="mt-1 block text-xs text-emergency font-medium">{error}</span>
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  icon: Icon,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div
        className={`mt-1 flex items-center gap-2 h-12 rounded-xl bg-muted/40 border px-3 transition focus-within:bg-card focus-within:ring-2 focus-within:ring-brand/50 ${
          error ? "border-emergency/50" : "border-transparent"
        } ${disabled ? "opacity-60" : ""}`}
      >
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm font-medium outline-none appearance-none cursor-pointer"
        >
          <option value="" disabled>
            {placeholder ?? "-- Chọn --"}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <span className="mt-1 block text-xs text-emergency font-medium">{error}</span>
      )}
    </label>
  );
}

type SearchOption = { value: string; label: string; sublabel?: string; searchText: string };

function SearchableSelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  icon: Icon,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SearchOption[];
  placeholder?: string;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.searchText.includes(q)) : options;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div ref={wrapRef} className="relative mt-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={`w-full flex items-center gap-2 h-11 rounded-xl bg-muted/40 border px-3 transition text-left ${
            error ? "border-emergency/50" : "border-transparent"
          } ${disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-muted/60"} ${
            open ? "bg-card ring-2 ring-brand/50" : ""
          }`}
        >
          {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
          <span
            className={`flex-1 text-sm font-medium truncate ${
              selected ? "text-foreground" : "text-muted-foreground/60"
            }`}
          >
            {selected
              ? selected.sublabel
                ? `${selected.label} · ${selected.sublabel}`
                : selected.label
              : placeholder ?? "-- Chọn --"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground shrink-0 transition ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 h-10 border-b border-border bg-muted/30">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIdx((i) => Math.max(0, i - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const opt = filtered[activeIdx];
                    if (opt) choose(opt.value);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setOpen(false);
                  }
                }}
                placeholder="Tìm theo tên hoặc thành phố..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <ul className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Không tìm thấy chung cư phù hợp
                </li>
              ) : (
                filtered.map((o, i) => {
                  const isSel = o.value === value;
                  const isActive = i === activeIdx;
                  return (
                    <li key={o.value}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIdx(i)}
                        onClick={() => choose(o.value)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition ${
                          isActive ? "bg-muted" : ""
                        } ${isSel ? "text-brand font-semibold" : "text-foreground"}`}
                      >
                        <span className="flex-1 truncate">
                          {o.label}
                          {o.sublabel && (
                            <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                              · {o.sublabel}
                            </span>
                          )}
                        </span>
                        {isSel && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <span className="mt-1 block text-xs text-emergency font-medium">{error}</span>
      )}
    </label>
  );
}


