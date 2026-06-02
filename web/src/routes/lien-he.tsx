import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, RotateCcw, Check, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import { useFamilyContext } from "@/hooks/use-family-context";
import {
  listFamilyContacts,
  upsertFamilyContact,
  resetFamilyContacts,
  DEFAULT_CONTACTS,
  type FamilyContactRow,
} from "@/lib/family-contacts.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lien-he")({
  head: () => ({
    meta: [
      { title: "Người liên hệ — STOS Life" },
      {
        name: "description",
        content:
          "Đặt số điện thoại cho Gọi ông/bà, Gọi người thân, Gọi bảo an của gia đình.",
      },
    ],
  }),
  component: ContactsPage,
});

function ContactsPage() {
  const { familyId, family, isLoading } = useFamilyContext();

  if (isLoading) {
    return (
      <MobileShell>
        <PageHeader eyebrow="Family Core" back="/gia-dinh" title="Người liên hệ" emoji="📇" />
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Đang tải…
        </div>
      </MobileShell>
    );
  }

  if (!familyId) {
    return (
      <MobileShell>
        <PageHeader eyebrow="Family Core" back="/gia-dinh" title="Người liên hệ" emoji="📇" />
        <section className="px-4 mt-2">
          <RoundedCard className="text-center space-y-3 py-6">
            <p className="text-sm text-muted-foreground">
              Bạn cần tham gia một gia đình để sử dụng danh bạ.
            </p>
            <Link
              to="/gia-dinh"
              className="inline-block px-4 py-2 rounded-2xl bg-brand text-white text-sm font-semibold"
            >
              Tới Gia đình
            </Link>
          </RoundedCard>
        </section>
      </MobileShell>
    );
  }

  return <ContactsLoaded familyId={familyId} familyName={family?.name ?? ""} />;
}

function ContactsLoaded({ familyId, familyName }: { familyId: string; familyName: string }) {
  const listFn = useServerFn(listFamilyContacts);
  const upsertFn = useServerFn(upsertFamilyContact);
  const resetFn = useServerFn(resetFamilyContacts);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["family-contacts", familyId],
    queryFn: () => listFn({ data: { familyId } }),
  });

  const upsertM = useMutation({
    mutationFn: (c: FamilyContactRow) =>
      upsertFn({ data: { familyId, ...c } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-contacts", familyId] }),
  });

  const resetM = useMutation({
    mutationFn: () => resetFn({ data: { familyId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-contacts", familyId] });
      toast.success("Đã khôi phục số mặc định");
    },
  });

  const contacts = q.data ?? DEFAULT_CONTACTS;

  function handleSave(c: FamilyContactRow, name: string, phone: string) {
    const cleaned = phone.replace(/[^\d+\s().-]/g, "").trim();
    if (!cleaned) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }
    upsertM.mutate(
      { ...c, name: name.trim() || c.name, phone: cleaned },
      {
        onSuccess: () =>
          toast.success(`Đã lưu ${c.label}`, { description: `${name} · ${cleaned}` }),
        onError: (e) => toast.error("Không lưu được", { description: (e as Error).message }),
      },
    );
  }

  function handleCall(c: FamilyContactRow) {
    if (!c.phone) return;
    if (typeof window !== "undefined") window.location.href = `tel:${c.phone.replace(/\s/g, "")}`;
  }

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Family Core"
        back="/gia-dinh"
        title="Người liên hệ"
        subtitle={familyName || "Số gọi nhanh của gia đình"}
        emoji="📇"
      />

      <section className="px-4 mt-5">
        <SectionHeader
          title="Số gọi nhanh"
          subtitle="3 số quan trọng nhất, ai trong nhà cũng gọi được"
        />
        {q.isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((c) => (
              <ContactCard
                key={`${familyId}-${c.slot_id}`}
                contact={c}
                saving={upsertM.isPending}
                onSave={handleSave}
                onCall={handleCall}
              />
            ))}
          </div>
        )}
      </section>

      <section className="px-4 mt-6 mb-8">
        <button
          onClick={() => resetM.mutate()}
          disabled={resetM.isPending}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground py-3 rounded-2xl border border-border bg-card disabled:opacity-60"
        >
          <RotateCcw className="h-4 w-4" />
          Khôi phục mặc định
        </button>
      </section>
    </MobileShell>
  );
}

function ContactCard({
  contact,
  saving,
  onSave,
  onCall,
}: {
  contact: FamilyContactRow;
  saving: boolean;
  onSave: (c: FamilyContactRow, name: string, phone: string) => void;
  onCall: (c: FamilyContactRow) => void;
}) {
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone);

  // Sync khi server data refresh
  useEffect(() => {
    setName(contact.name);
    setPhone(contact.phone);
  }, [contact.name, contact.phone]);

  const dirty = name !== contact.name || phone !== contact.phone;

  return (
    <RoundedCard className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-tint-blue grid place-items-center text-2xl shrink-0">
          {contact.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold leading-tight">{contact.label}</p>
          <p className="text-[11px] text-muted-foreground">
            {contact.phone ? contact.phone : "Chưa có số"}
          </p>
        </div>
        <button
          onClick={() => onCall(contact)}
          disabled={!contact.phone}
          className="h-10 w-10 rounded-2xl bg-tint-green text-success grid place-items-center shrink-0 disabled:opacity-40"
          aria-label={`Gọi ${contact.label}`}
        >
          <Phone className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <Field label="Tên hiển thị" value={name} onChange={setName} placeholder="VD: Bà Hoa" />
        <Field
          label="Số điện thoại"
          value={phone}
          onChange={setPhone}
          placeholder="VD: 0901 234 567"
          type="tel"
        />
      </div>

      <button
        disabled={!dirty || saving}
        onClick={() => onSave(contact, name, phone)}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold transition",
          dirty && !saving ? "bg-brand text-white" : "bg-muted text-muted-foreground",
        )}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {dirty ? "Lưu thay đổi" : "Đã lưu"}
      </button>
    </RoundedCard>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-card border border-border rounded-2xl px-3 py-2.5 text-sm"
      />
    </label>
  );
}
