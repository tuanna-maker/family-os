import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight, Building, Building2, CheckCircle2, Loader2, Mail, MessageCircle,
  Phone, Sparkles, User, Users,
} from "lucide-react";
import { submitDemoLead } from "@/lib/demo-leads.functions";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Đặt lịch demo STOS — Ban Quản Lý chung cư" },
      { name: "description", content: "Đăng ký demo 30 phút bộ giải pháp vận hành chung cư STOS dành cho Ban Quản Lý: cư dân, căn hộ, yêu cầu dịch vụ, phí và an ninh." },
      { property: "og:title", content: "Đặt lịch demo STOS — Ban Quản Lý chung cư" },
      { property: "og:description", content: "Đăng ký demo 30 phút bộ giải pháp vận hành chung cư STOS dành cho Ban Quản Lý." },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const [form, setForm] = useState({
    full_name: "", company: "", email: "", phone: "",
    role: "", project_name: "", scale: "", message: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const name = form.full_name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (!name || !email || !phone) return toast.error("Vui lòng nhập họ tên, email và số điện thoại");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Email không hợp lệ");
    setBusy(true);
    try {
      const res = await submitDemoLead({
        data: {
          full_name: name,
          company: form.company.trim() || null,
          email,
          phone,
          role: form.role || null,
          project_name: form.project_name.trim() || null,
          scale: form.scale || null,
          message: form.message.trim() || null,
          source: "demo_page",
        },
      });
      if (!res.ok) { toast.error(res.error); return; }
      setDone(true);
      toast.success("Đã nhận yêu cầu demo", { description: "STOS sẽ liên hệ trong 24 giờ làm việc." });
    } catch {
      toast.error("Không thể gửi, vui lòng thử lại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stos-landing min-h-screen bg-white">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-sm font-semibold" style={{ color: "hsl(var(--brand-navy))" }}>← STOS</Link>
          <Link to="/bql" className="text-sm font-semibold text-muted-foreground hover:text-foreground">Workspace BQL</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 grid lg:grid-cols-5 gap-10 lg:gap-16 items-start">
        <section className="lg:col-span-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Đặt lịch demo
          </span>
          <h1 className="mt-5 text-3xl sm:text-4xl font-semibold leading-tight" style={{ color: "hsl(var(--brand-navy))" }}>
            Demo STOS cho Ban Quản Lý <span style={{ color: "hsl(var(--brand-electric))" }}>trong 30 phút</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Chuyên gia STOS sẽ liên hệ trong 24 giờ làm việc, demo theo dự án thực tế của bạn: hồ sơ cư dân, căn hộ, yêu cầu dịch vụ, phí quản lý, an ninh và bảo trì tài sản.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-foreground/80">
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(160 60% 40%)" }} /> Tư vấn 1-1 với chuyên gia vận hành chung cư.</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(160 60% 40%)" }} /> Tài khoản dùng thử kèm dữ liệu mẫu cho dự án của bạn.</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(160 60% 40%)" }} /> Lộ trình triển khai chi tiết trong 14 ngày.</li>
            <li className="flex items-start gap-2.5"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(160 60% 40%)" }} /> Báo giá theo số căn hộ và module triển khai.</li>
          </ul>
        </section>

        <form onSubmit={onSubmit} className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Họ và tên *" icon={<User className="h-3.5 w-3.5" />}>
              <input required value={form.full_name} onChange={upd("full_name")} maxLength={120} className="stos-input" placeholder="Nguyễn Văn A" />
            </Field>
            <Field label="Vai trò" icon={<User className="h-3.5 w-3.5" />}>
              <select value={form.role} onChange={upd("role")} className="stos-input">
                <option value="">Chọn vai trò</option>
                <option value="bql_manager">Trưởng BQL</option>
                <option value="bql_staff">Nhân viên BQL</option>
                <option value="tenant_admin">Chủ đầu tư / Tenant Admin</option>
                <option value="security">Bộ phận an ninh</option>
                <option value="other">Khác</option>
              </select>
            </Field>
            <Field label="BQL / Công ty" icon={<Building className="h-3.5 w-3.5" />}>
              <input value={form.company} onChange={upd("company")} maxLength={160} className="stos-input" placeholder="BQL toà nhà ABC" />
            </Field>
            <Field label="Tên dự án" icon={<Building2 className="h-3.5 w-3.5" />}>
              <input value={form.project_name} onChange={upd("project_name")} maxLength={200} className="stos-input" placeholder="VD: Vinhomes Smart City" />
            </Field>
            <Field label="Email *" icon={<Mail className="h-3.5 w-3.5" />}>
              <input required type="email" value={form.email} onChange={upd("email")} maxLength={255} className="stos-input" placeholder="ban@example.vn" />
            </Field>
            <Field label="Số điện thoại *" icon={<Phone className="h-3.5 w-3.5" />}>
              <input required type="tel" value={form.phone} onChange={upd("phone")} maxLength={40} className="stos-input" placeholder="+84 ..." />
            </Field>
            <Field label="Quy mô căn hộ" icon={<Users className="h-3.5 w-3.5" />}>
              <select value={form.scale} onChange={upd("scale")} className="stos-input">
                <option value="">Chọn quy mô</option>
                <option value="<200">Dưới 200 căn</option>
                <option value="200-1000">200 – 1.000 căn</option>
                <option value="1000-5000">1.000 – 5.000 căn</option>
                <option value=">5000">Trên 5.000 căn</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Bạn quan tâm điều gì?" icon={<MessageCircle className="h-3.5 w-3.5" />}>
                <textarea value={form.message} onChange={upd("message")} maxLength={2000} rows={4}
                  className="stos-input" placeholder="Mô tả ngắn nhu cầu vận hành, số toà, số căn, module quan tâm…" />
              </Field>
            </div>
          </div>

          {done && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm" style={{ borderColor: "hsl(160 60% 40% / 0.3)", background: "hsl(160 60% 40% / 0.06)", color: "hsl(160 60% 28%)" }}>
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Đã gửi thành công! STOS sẽ liên hệ với bạn trong 24 giờ làm việc.</span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground max-w-xs">
              Bằng việc gửi, bạn đồng ý cho STOS liên hệ tư vấn theo thông tin đã cung cấp.
            </p>
            <button type="submit" disabled={busy}
              className="inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
              style={{ background: "var(--grad-electric)" }}>
              {busy ? (<><Loader2 className="h-4 w-4 animate-spin" /> Đang gửi…</>) : (<>Gửi đăng ký <ArrowRight className="h-4 w-4" /></>)}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
        {icon}{label}
      </span>
      {children}
    </label>
  );
}
