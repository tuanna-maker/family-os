import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Pill,
  BookOpen,
  Apple,
  ShoppingCart,
  Stethoscope,
  ShieldAlert,
  Wallet,
  Bell,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { RoundedCard, SectionHeader } from "@shared/ui/common/RoundedCard";
import { LoadingState, ErrorState, EmptyState } from "@shared/ui/common/States";
import { useFamilyContext } from "@/hooks/use-family-context";
import { getDashboard, type DashboardSummary } from "@/api/dashboard";
import { formatVND } from "@shared/utils/formatters";
import { cn } from "@shared/utils";
import { requireAuth } from "@/api/require-auth";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ location }) => requireAuth({ location }),
  head: () => ({
    meta: [
      { title: "Dashboard gia đình — Tổng hợp tiến độ" },
      { name: "description", content: "Tổng hợp nhắc thuốc, việc của con, hạn thực phẩm, an ninh." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { familyId, isLoading: famLoading, error: famErr } = useFamilyContext();
    const q = useQuery({
    queryKey: ["dashboard", familyId],
    queryFn: () => getDashboard({ family_id: familyId! }),
    enabled: !!familyId,
    refetchInterval: 60_000,
  });

  return (
    <MobileShell>
      <header className="px-5 pt-6 pb-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          Tổng quan gia đình
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-1">Cập nhật mỗi phút từ tất cả modules</p>
      </header>

      {famLoading && <LoadingState />}
      {famErr && <div className="px-4"><ErrorState message={famErr.message} /></div>}

      {familyId && q.isLoading && <LoadingState />}
      {q.error && <div className="px-4"><ErrorState message={(q.error as Error).message} /></div>}
      {q.data && <DashboardContent d={q.data} />}
    </MobileShell>
  );
}

function DashboardContent({ d }: { d: DashboardSummary }) {
  const alertCount =
    d.medicines.total_active +
    d.parent_reminders.pending +
    d.homeworks.overdue +
    d.food.expired +
    d.food.expiring_soon +
    d.security.open;

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <section className="px-4">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            to="/suc-khoe"
            label="Nhắc thuốc hôm nay"
            value={d.medicines.total_active}
            sub={d.medicines.total_active ? "đang hoạt động" : "không có"}
            Icon={Pill}
            tone="bg-tint-red text-emergency"
          />
          <KpiCard
            to="/con-cai"
            label="Việc của con"
            value={d.parent_reminders.pending + d.homeworks.pending}
            sub={d.homeworks.overdue ? `${d.homeworks.overdue} quá hạn` : "đúng tiến độ"}
            Icon={BookOpen}
            tone="bg-tint-pink text-pink"
            warning={d.homeworks.overdue > 0}
          />
          <KpiCard
            to="/thuc-pham"
            label="Thực phẩm sắp hết hạn"
            value={d.food.expiring_soon + d.food.expired}
            sub={d.food.expired ? `${d.food.expired} đã hết hạn` : "trong 3 ngày tới"}
            Icon={Apple}
            tone="bg-warning/10 text-warning"
            warning={d.food.expired > 0}
          />
          <KpiCard
            to="/bao-an"
            label="Yêu cầu an ninh"
            value={d.security.open}
            sub={d.security.open ? "đang mở" : "không có"}
            Icon={ShieldAlert}
            tone="bg-tint-blue text-brand"
            warning={d.security.open > 0}
          />
        </div>
      </section>

      {/* Summary banner */}
      <section className="px-4">
        <RoundedCard
          className={cn(
            "flex items-center gap-3 border-0",
            alertCount === 0 ? "bg-success/10" : "bg-warning/10",
          )}
        >
          <div className="h-10 w-10 rounded-2xl bg-card grid place-items-center shadow-[var(--shadow-soft)]">
            {alertCount === 0 ? "✅" : <AlertTriangle className="h-5 w-5 text-warning" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {alertCount === 0
                ? "Mọi việc đều ổn"
                : `${alertCount} mục cần chú ý hôm nay`}
            </p>
            <p className="text-xs text-muted-foreground">
              Chi tiêu tháng: {formatVND(d.expenses_month.total)} ({d.expenses_month.count} giao dịch)
            </p>
          </div>
        </RoundedCard>
      </section>

      {/* Medicine reminders */}
      <ListSection
        title="Nhắc thuốc"
        to="/suc-khoe"
        items={d.medicines.items}
        empty="Không có nhắc thuốc"
        render={(m) => (
          <Row
            key={m.id}
            icon={<Pill className="h-4 w-4 text-emergency" />}
            primary={m.medicine}
            secondary={m.member_name}
            trailing={m.time_of_day ?? ""}
          />
        )}
      />

      {/* Parent reminders + Homework */}
      <ListSection
        title="Việc của con"
        to="/con-cai"
        items={[
          ...d.parent_reminders.items.map((r) => ({ ...r, _t: "rem" as const })),
          ...d.homeworks.items.map((h) => ({ ...h, _t: "hw" as const })),
        ].slice(0, 6)}
        empty="Không có việc cần làm"
        render={(it) =>
          it._t === "rem" ? (
            <Row
              key={`r-${it.id}`}
              icon={<Bell className="h-4 w-4 text-pink" />}
              primary={it.title}
              secondary="Nhắc nhở"
              trailing={fmtDate(it.remind_at)}
            />
          ) : (
            <Row
              key={`h-${it.id}`}
              icon={<BookOpen className="h-4 w-4 text-pink" />}
              primary={it.title}
              secondary={it.subject}
              trailing={it.due_date ?? "—"}
              warn={!!it.due_date && it.due_date < new Date().toISOString().slice(0, 10)}
            />
          )
        }
      />

      {/* Food expiring */}
      <ListSection
        title="Thực phẩm sắp hết hạn"
        to="/thuc-pham"
        items={d.food.items}
        empty="Tủ lạnh ổn định"
        render={(f) => {
          const today = new Date().toISOString().slice(0, 10);
          const expired = !!f.expires_on && f.expires_on < today;
          return (
            <Row
              key={f.id}
              icon={<Apple className={cn("h-4 w-4", expired ? "text-emergency" : "text-warning")} />}
              primary={f.name}
              secondary={f.qty ? `${f.qty} ${f.unit ?? ""}` : ""}
              trailing={f.expires_on ?? "—"}
              warn={expired}
            />
          );
        }}
      />

      {/* Appointments */}
      <ListSection
        title="Lịch khám sắp tới"
        to="/suc-khoe"
        items={d.appointments.items}
        empty="Không có lịch khám"
        render={(a) => (
          <Row
            key={a.id}
            icon={<Stethoscope className="h-4 w-4 text-brand" />}
            primary={a.member_name}
            secondary={a.doctor ?? "—"}
            trailing={fmtDateTime(a.scheduled_at)}
          />
        )}
      />

      {/* Security */}
      <ListSection
        title="Yêu cầu an ninh đang mở"
        to="/bao-an"
        items={d.security.items}
        empty="Không có yêu cầu"
        render={(s) => (
          <Row
            key={s.id}
            icon={<ShieldAlert className="h-4 w-4 text-emergency" />}
            primary={s.request_type.toUpperCase()}
            secondary={s.status}
            trailing={fmtDate(s.created_at)}
          />
        )}
      />

      {/* Shopping + expenses */}
      <section className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Link to="/thuc-pham">
            <RoundedCard className="p-4 bg-tint-green border-0">
              <ShoppingCart className="h-5 w-5 text-success" />
              <p className="mt-2 text-xl font-bold">{d.shopping.pending}</p>
              <p className="text-[11px] text-muted-foreground">cần mua</p>
            </RoundedCard>
          </Link>
          <Link to="/chi-tieu">
            <RoundedCard className="p-4 bg-tint-blue border-0">
              <Wallet className="h-5 w-5 text-brand" />
              <p className="mt-2 text-base font-bold leading-tight">{formatVND(d.expenses_month.total)}</p>
              <p className="text-[11px] text-muted-foreground">chi tiêu tháng</p>
            </RoundedCard>
          </Link>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  to,
  label,
  value,
  sub,
  Icon,
  tone,
  warning,
}: {
  to: string;
  label: string;
  value: number;
  sub: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone: string;
  warning?: boolean;
}) {
  return (
    <Link to={to}>
      <RoundedCard className="p-4 border-0 bg-card h-full">
        <div className={cn("h-9 w-9 rounded-2xl grid place-items-center", tone)}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {label}
        </p>
        <p className={cn("text-2xl font-bold leading-tight mt-0.5", warning && "text-emergency")}>
          {value}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </RoundedCard>
    </Link>
  );
}

function ListSection<T>({
  title,
  to,
  items,
  empty,
  render,
}: {
  title: string;
  to: string;
  items: T[];
  empty: string;
  render: (item: T) => React.ReactNode;
}) {
  return (
    <section className="px-4">
      <SectionHeader
        title={title}
        action={
          <Link to={to} className="text-xs font-semibold text-brand flex items-center gap-0.5">
            Tất cả <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      <RoundedCard className="p-0 overflow-hidden">
        {items.length === 0 ? (
          <EmptyState title={empty} />
        ) : (
          <div className="divide-y divide-border">{items.map(render)}</div>
        )}
      </RoundedCard>
    </section>
  );
}

function Row({
  icon,
  primary,
  secondary,
  trailing,
  warn,
}: {
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
  trailing?: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-8 w-8 rounded-xl bg-muted grid place-items-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{primary}</p>
        {secondary && <p className="text-[11px] text-muted-foreground truncate">{secondary}</p>}
      </div>
      {trailing && (
        <span className={cn("text-[11px] font-medium", warn ? "text-emergency" : "text-muted-foreground")}>
          {trailing}
        </span>
      )}
    </div>
  );
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  } catch {
    return iso;
  }
}
function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
