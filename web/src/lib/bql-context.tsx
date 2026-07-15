import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listBqlProjects } from "@/lib/bql.functions";

type Project = { id: string; name: string; code: string };

type Ctx = {
  projectId: string; // "" means All
  setProjectId: (id: string) => void;
  projects: Project[];
  isLoading: boolean;
};

const BqlProjectCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = "bql.projectId";

export function BqlProjectProvider({ children }: { children: ReactNode }) {
  const fn = useServerFn(listBqlProjects);
  const { data, isLoading } = useQuery({
    queryKey: ["bql-projects"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
  });
  const projects = data?.projects ?? [];

  const [projectId, setProjectIdState] = useState<string>("");

  // Initialize from localStorage once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY) ?? "";
    setProjectIdState(saved);
  }, []);

  // If saved selection is no longer in scope, reset
  useEffect(() => {
    if (!projects.length || !projectId) return;
    if (!projects.some((p) => p.id === projectId)) {
      setProjectIdState("");
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [projects, projectId]);

  const setProjectId = (id: string) => {
    setProjectIdState(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const value = useMemo<Ctx>(() => ({ projectId, setProjectId, projects, isLoading }), [projectId, projects, isLoading]);
  return <BqlProjectCtx.Provider value={value}>{children}</BqlProjectCtx.Provider>;
}

export function useBqlProject(): Ctx {
  const ctx = useContext(BqlProjectCtx);
  if (!ctx) throw new Error("useBqlProject must be used inside <BqlProjectProvider>");
  return ctx;
}

export function BqlProjectSelector({ className }: { className?: string }) {
  const { projectId, setProjectId, projects, isLoading } = useBqlProject();
  return (
    <select
      value={projectId}
      onChange={(e) => setProjectId(e.target.value)}
      disabled={isLoading}
      className={
        "h-8 rounded-md border border-input bg-background px-2 text-xs max-w-[200px] " + (className ?? "")
      }
      title="Chọn dự án hiện hành"
    >
      <option value="">{isLoading ? "Đang tải…" : `Tất cả dự án (${projects.length})`}</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
