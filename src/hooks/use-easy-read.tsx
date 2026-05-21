import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Ctx = { easyRead: boolean; setEasyRead: (v: boolean) => void; toggle: () => void };

const EasyReadContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "ui:easy-read";

export function EasyReadProvider({ children }: { children: ReactNode }) {
  const [easyRead, setEasyReadState] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "1") setEasyReadState(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (easyRead) root.classList.add("easy-read");
    else root.classList.remove("easy-read");
    try {
      localStorage.setItem(STORAGE_KEY, easyRead ? "1" : "0");
    } catch {}
  }, [easyRead]);

  const setEasyRead = (v: boolean) => setEasyReadState(v);
  const toggle = () => setEasyReadState((v) => !v);

  return (
    <EasyReadContext.Provider value={{ easyRead, setEasyRead, toggle }}>
      {children}
    </EasyReadContext.Provider>
  );
}

export function useEasyRead() {
  const ctx = useContext(EasyReadContext);
  if (!ctx) throw new Error("useEasyRead must be used within EasyReadProvider");
  return ctx;
}
