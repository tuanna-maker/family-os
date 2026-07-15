// FAMILY CORE — Người liên hệ khẩn cấp (per-family, lưu localStorage)
import { useEffect, useState, useCallback } from "react";

export type ContactSlotId = "elder" | "family" | "security";

export type ContactSlot = {
  id: ContactSlotId;
  label: string;
  description: string;
  icon: string;
  name: string;
  phone: string;
};

export type FamilyOption = {
  id: string;
  name: string;
  apartment: string;
};

// Mock danh sách gia đình (sau này sẽ lấy từ backend)
export const familyOptions: FamilyOption[] = [
  { id: "fam-nguyen", name: "Gia đình Nguyễn", apartment: "A-1502, Sunrise" },
  { id: "fam-tran", name: "Gia đình Trần", apartment: "B-0812, Sunrise" },
];

export const defaultContacts: ContactSlot[] = [
  {
    id: "elder",
    label: "Gọi ông/bà",
    description: "Số máy của ông hoặc bà trong nhà",
    icon: "👵",
    name: "Bà Hoa",
    phone: "0901234567",
  },
  {
    id: "family",
    label: "Gọi người thân",
    description: "Người thân được liên hệ đầu tiên khi có việc",
    icon: "👨‍👩‍👧",
    name: "Mẹ Linh",
    phone: "0912345678",
  },
  {
    id: "security",
    label: "Gọi bảo an",
    description: "Bảo vệ toà nhà hoặc khu dân cư",
    icon: "🛡️",
    name: "Bảo an toà nhà",
    phone: "1900111",
  },
];

const KEY_PREFIX = "stos:contacts:";

function load(familyId: string): ContactSlot[] {
  if (typeof window === "undefined") return defaultContacts;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + familyId);
    if (!raw) return defaultContacts;
    const parsed = JSON.parse(raw) as ContactSlot[];
    // merge để đảm bảo đủ 3 slot
    return defaultContacts.map(
      (d) => parsed.find((p) => p.id === d.id) ?? d,
    );
  } catch {
    return defaultContacts;
  }
}

function save(familyId: string, contacts: ContactSlot[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_PREFIX + familyId, JSON.stringify(contacts));
}

export function useFamilyContacts(familyId: string) {
  const [contacts, setContacts] = useState<ContactSlot[]>(() => load(familyId));

  useEffect(() => {
    setContacts(load(familyId));
  }, [familyId]);

  const update = useCallback(
    (id: ContactSlotId, patch: Partial<Pick<ContactSlot, "name" | "phone">>) => {
      setContacts((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
        save(familyId, next);
        return next;
      });
    },
    [familyId],
  );

  const reset = useCallback(() => {
    save(familyId, defaultContacts);
    setContacts(defaultContacts);
  }, [familyId]);

  return { contacts, update, reset };
}
