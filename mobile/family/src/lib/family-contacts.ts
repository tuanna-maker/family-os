import AsyncStorage from "@react-native-async-storage/async-storage";

export type ContactSlotId = "elder" | "family" | "security";

export type ContactSlot = {
  id: ContactSlotId;
  label: string;
  description: string;
  icon: string;
  name: string;
  phone: string;
};

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
    description: "Người thân được liên hệ đầu tiên",
    icon: "👨‍👩‍👧",
    name: "Mẹ Linh",
    phone: "0912345678",
  },
  {
    id: "security",
    label: "Gọi bảo an",
    description: "Bảo vệ toà nhà",
    icon: "🛡️",
    name: "Bảo an toà nhà",
    phone: "1900111",
  },
];

const KEY_PREFIX = "stos:contacts:";

export async function loadFamilyContacts(familyId: string): Promise<ContactSlot[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + familyId);
    if (!raw) return defaultContacts;
    const parsed = JSON.parse(raw) as ContactSlot[];
    return defaultContacts.map((d) => parsed.find((p) => p.id === d.id) ?? d);
  } catch {
    return defaultContacts;
  }
}

export async function saveFamilyContacts(familyId: string, contacts: ContactSlot[]) {
  await AsyncStorage.setItem(KEY_PREFIX + familyId, JSON.stringify(contacts));
}

export async function updateFamilyContact(
  familyId: string,
  id: ContactSlotId,
  patch: Partial<Pick<ContactSlot, "name" | "phone">>,
) {
  const current = await loadFamilyContacts(familyId);
  const next = current.map((c) => (c.id === id ? { ...c, ...patch } : c));
  await saveFamilyContacts(familyId, next);
  return next;
}

export async function resetFamilyContacts(familyId: string) {
  await saveFamilyContacts(familyId, defaultContacts);
  return defaultContacts;
}
