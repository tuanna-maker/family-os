export type EmergencyContact = {
  id: string;
  label: string;
  name: string;
  phone: string;
  kind: "elder" | "family" | "security" | "sos";
};

export const emergencyContacts: EmergencyContact[] = [
  { id: "c1", label: "Gọi ông/bà", name: "Bà Hoa", phone: "0901234567", kind: "elder" },
  { id: "c2", label: "Gọi người thân", name: "Mẹ Linh", phone: "0912345678", kind: "family" },
  { id: "c3", label: "Gọi bảo an", name: "Bảo an toà nhà", phone: "1900111", kind: "security" },
  { id: "c4", label: "SOS khẩn cấp", name: "Cấp cứu 115", phone: "115", kind: "sos" },
];
