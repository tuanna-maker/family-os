import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Phone, RotateCcw, Check, ChevronDown } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { PageHeader } from "@/components/common/PageHeader";
import { RoundedCard, SectionHeader } from "@/components/common/RoundedCard";
import {
  familyOptions,
  useFamilyContacts,
  type ContactSlot,
} from "@/features/family-core/contacts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lien-he")({
  head: () => ({
    meta: [
      { title: "Người liên hệ — STOS Life" },
      {
        name: "description",
        content:
          "Đặt số điện thoại cho Gọi ông/bà, Gọi người thân, Gọi bảo an theo từng gia đình.",
      },
    ],
  }),
  component: ContactsPage,
});

function ContactsPage() {
  const [familyId, setFamilyId] = useState(familyOptions[0].id);
  const family = useMemo(
    () => familyOptions.find((f) => f.id === familyId) ?? familyOptions[0],
    [familyId],
  );
  const { contacts, update, reset } = useFamilyContacts(familyId);

  function handleSave(c: ContactSlot, name: string, phone: string) {
    const cleaned = phone.replace(/[^\d+]/g, "");
    if (!cleaned) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }
    update(c.id, { name: name.trim() || c.name, phone: cleaned });
    toast.success(`Đã lưu ${c.label}`, { description: `${name} · ${cleaned}` });
  }

  function handleCall(c: ContactSlot) {
    if (!c.phone) return;
    if (typeof window !== "undefined") window.location.href = `tel:${c.phone}`;
  }

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Family Core"
        back="/gia-dinh"
        title="Người liên hệ"
        subtitle="Đặt số gọi nhanh cho gia đình"
        emoji="📇"
      />

      {/* Chọn gia đình */}
      <section className="px-4 mt-2">
        <RoundedCard className="p-3">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Gia đình
          </label>
          <div className="relative mt-1">
            <select
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              className="w-full appearance-none bg-card border border-border rounded-2xl pl-3 pr-9 py-2.5 text-sm font-semibold"
            >
              {familyOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} — {f.apartment}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Mỗi gia đình có danh bạ riêng. Số này được dùng cho nút Gọi nhanh ở trang
            Chăm sóc ông bà.
          </p>
        </RoundedCard>
      </section>

      {/* Danh sách slot */}
      <section className="px-4 mt-5">
        <SectionHeader
          title="Số gọi nhanh"
          subtitle="3 số quan trọng nhất, ai trong nhà cũng gọi được"
        />
        <div className="space-y-3">
          {contacts.map((c) => (
            <ContactCard
              key={`${familyId}-${c.id}`}
              contact={c}
              onSave={handleSave}
              onCall={handleCall}
            />
          ))}
        </div>
      </section>

      <section className="px-4 mt-6 mb-8">
        <button
          onClick={() => {
            reset();
            toast.success("Đã khôi phục số mặc định");
          }}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground py-3 rounded-2xl border border-border bg-card"
        >
          <RotateCcw className="h-4 w-4" />
          Khôi phục mặc định cho {family.name}
        </button>
      </section>
    </MobileShell>
  );
}

function ContactCard({
  contact,
  onSave,
  onCall,
}: {
  contact: ContactSlot;
  onSave: (c: ContactSlot, name: string, phone: string) => void;
  onCall: (c: ContactSlot) => void;
}) {
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone);
  const dirty = name !== contact.name || phone !== contact.phone;

  return (
    <RoundedCard className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-tint-blue grid place-items-center text-2xl shrink-0">
          {contact.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold leading-tight">{contact.label}</p>
          <p className="text-[11px] text-muted-foreground">{contact.description}</p>
        </div>
        <button
          onClick={() => onCall(contact)}
          className="h-10 w-10 rounded-2xl bg-tint-green text-success grid place-items-center shrink-0"
          aria-label={`Gọi ${contact.label}`}
        >
          <Phone className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <Field
          label="Tên hiển thị"
          value={name}
          onChange={setName}
          placeholder="VD: Bà Hoa"
        />
        <Field
          label="Số điện thoại"
          value={phone}
          onChange={setPhone}
          placeholder="VD: 0901 234 567"
          type="tel"
        />
      </div>

      <button
        disabled={!dirty}
        onClick={() => onSave(contact, name, phone)}
        className={cn(
          "w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold transition",
          dirty
            ? "bg-brand text-white"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Check className="h-4 w-4" />
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
