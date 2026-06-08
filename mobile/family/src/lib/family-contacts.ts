import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppLocale } from "@mobile/hooks/useAppPrefs";
import { getStrings } from "@mobile/i18n/useI18n";
import { getLocaleRef } from "@mobile/i18n/localeRef";

export type ContactSlotId = "elder" | "family" | "security";

export type ContactSlot = {
  id: ContactSlotId;
  label: string;
  description: string;
  icon: string;
  name: string;
  phone: string;
};

export function getDefaultContacts(locale: AppLocale = getLocaleRef()): ContactSlot[] {
  const slots = getStrings(locale).screens.contact.slots;
  return [
    {
      id: "elder",
      label: slots.elder.label,
      description: slots.elder.description,
      icon: "👵",
      name: slots.elder.defaultName,
      phone: "0901234567",
    },
    {
      id: "family",
      label: slots.family.label,
      description: slots.family.description,
      icon: "👨‍👩‍👧",
      name: slots.family.defaultName,
      phone: "0912345678",
    },
    {
      id: "security",
      label: slots.security.label,
      description: slots.security.description,
      icon: "🛡️",
      name: slots.security.defaultName,
      phone: "1900111",
    },
  ];
}

export function localizeContactSlots(slots: ContactSlot[], locale: AppLocale = getLocaleRef()): ContactSlot[] {
  const labels = getStrings(locale).screens.contact.slots;
  return slots.map((slot) => ({
    ...slot,
    label: labels[slot.id].label,
    description: labels[slot.id].description,
  }));
}

const KEY_PREFIX = "stos:contacts:";

export async function loadFamilyContacts(familyId: string): Promise<ContactSlot[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + familyId);
    const defaults = getDefaultContacts();
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as ContactSlot[];
    return defaults.map((d) => parsed.find((p) => p.id === d.id) ?? d);
  } catch {
    return getDefaultContacts();
  }
}

export async function saveFamilyContacts(familyId: string, slots: ContactSlot[]) {
  await AsyncStorage.setItem(KEY_PREFIX + familyId, JSON.stringify(slots));
}

export async function updateFamilyContact(
  familyId: string,
  id: ContactSlotId,
  patch: Partial<Pick<ContactSlot, "name" | "phone">>,
): Promise<ContactSlot[]> {
  const current = await loadFamilyContacts(familyId);
  const next = current.map((s) => (s.id === id ? { ...s, ...patch } : s));
  await saveFamilyContacts(familyId, next);
  return next;
}

export async function resetFamilyContacts(familyId: string): Promise<ContactSlot[]> {
  const defaults = getDefaultContacts();
  await saveFamilyContacts(familyId, defaults);
  return defaults;
}
