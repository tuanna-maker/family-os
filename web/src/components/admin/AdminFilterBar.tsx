import { Search } from "lucide-react";
import { family } from "@/features/family-core";

type Props = {
  search: string;
  onSearch: (v: string) => void;
  familyId: string;
  onFamily: (v: string) => void;
  placeholder?: string;
  right?: React.ReactNode;
};

// Mock family list — single family in mock data
const FAMILIES = [{ id: "all", name: "Tất cả gia đình" }, { id: "fam-1", name: family.name }];

export function AdminFilterBar({ search, onSearch, familyId, onFamily, placeholder, right }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder ?? "Tìm kiếm…"}
          className="w-full h-10 pl-9 pr-3 rounded-xl bg-card border border-border text-sm"
        />
      </div>
      <select
        value={familyId}
        onChange={(e) => onFamily(e.target.value)}
        className="h-10 px-3 rounded-xl bg-card border border-border text-sm"
      >
        {FAMILIES.map((f) => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
      {right}
    </div>
  );
}

export function StatusBadge({ tone, children }: { tone: "ok" | "warn" | "alert" | "muted" | "info"; children: React.ReactNode }) {
  const map: Record<string, string> = {
    ok: "bg-tint-green text-success",
    warn: "bg-tint-orange text-warning",
    alert: "bg-tint-red text-emergency",
    muted: "bg-muted text-muted-foreground",
    info: "bg-tint-blue text-brand",
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[tone]}`}>{children}</span>;
}
