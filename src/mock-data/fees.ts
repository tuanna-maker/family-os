import type { Fee, Payment, FeeStatus, FeeType } from "@/types/core";
import { seedApartments } from "./apartments";

const now = new Date();
const period = (off: number) => {
  const d = new Date(now.getFullYear(), now.getMonth() + off, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const iso = (offsetH: number) => new Date(now.getTime() + offsetH * 3600_000).toISOString();

const TYPES: { type: FeeType; base: number }[] = [
  { type: "management", base: 750_000 },
  { type: "parking", base: 1_200_000 },
  { type: "electricity", base: 850_000 },
  { type: "water", base: 180_000 },
];

const occupied = seedApartments.filter((a) => a.status === "occupied").slice(0, 30);

export const seedFees: Fee[] = occupied.flatMap((apt, ai) =>
  TYPES.flatMap((t, ti) =>
    [-1, 0].map((mo) => {
      const status: FeeStatus = mo === -1
        ? (ai % 7 === 0 ? "overdue" : "paid")
        : (ai % 3 === 0 ? "unpaid" : ai % 5 === 0 ? "partial" : "unpaid");
      const amount = t.base + (apt.areaSqm * 1000);
      const paidAmount = status === "paid" ? amount : status === "partial" ? Math.round(amount * 0.5) : 0;
      return {
        id: `fee-${apt.id}-${t.type}-${mo}`,
        tenantId: apt.tenantId,
        projectId: apt.projectId,
        apartmentId: apt.id,
        type: t.type,
        period: period(mo),
        amount,
        paidAmount,
        dueDate: new Date(now.getFullYear(), now.getMonth() + mo, 28).toISOString(),
        status,
        createdAt: iso(-(72 + ti * 6)),
        updatedAt: iso(-(72 + ti * 6)),
      };
    }),
  ),
);

export const seedPayments: Payment[] = seedFees
  .filter((f) => f.status === "paid" || f.status === "partial")
  .map((f, i) => ({
    id: `pay-${f.id}`,
    tenantId: f.tenantId,
    projectId: f.projectId,
    apartmentId: f.apartmentId,
    feeId: f.id,
    amount: f.paidAmount,
    method: (["vietqr", "bank_transfer", "cash", "card"] as const)[i % 4],
    reference: `TXN${String(100000 + i).padStart(6, "0")}`,
    paidAt: iso(-(24 + i)),
    receivedBy: "u-bqls",
    receiptNo: `BL${new Date().getFullYear()}${String(1000 + i).padStart(5, "0")}`,
    createdAt: iso(-(24 + i)),
    updatedAt: iso(-(24 + i)),
  }));
