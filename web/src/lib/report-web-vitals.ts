import type { Metric } from "web-vitals";

const ENDPOINT = "/api/public/vitals";
const queue: Array<{
  metric: string;
  value: number;
  rating?: string;
  route?: string;
  page?: string;
  nav_type?: string;
}> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  flushTimer = null;
  if (queue.length === 0) return;
  const payload = JSON.stringify({ metrics: queue.splice(0, queue.length) });
  // sendBeacon ưu tiên (tồn tại qua unload); fetch keepalive là fallback.
  const blob = new Blob([payload], { type: "application/json" });
  if (navigator.sendBeacon?.(ENDPOINT, blob)) return;
  fetch(ENDPOINT, { method: "POST", body: payload, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
}

function enqueue(m: Metric) {
  queue.push({
    metric: m.name,
    value: Math.round(m.value * 1000) / 1000,
    rating: m.rating,
    route: window.location.pathname,
    page: window.location.pathname + window.location.search,
    nav_type: m.navigationType,
  });
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[vitals] ${m.name}=${m.value.toFixed(1)} (${m.rating})`);
  }
  if (flushTimer == null) flushTimer = setTimeout(flush, 3000);
}

let started = false;
export function startWebVitals() {
  if (started || typeof window === "undefined") return;
  started = true;
  // Lazy import giữ web-vitals khỏi initial bundle
  import("web-vitals").then(({ onLCP, onINP, onCLS, onFCP, onTTFB }) => {
    onLCP(enqueue);
    onINP(enqueue);
    onCLS(enqueue);
    onFCP(enqueue);
    onTTFB(enqueue);
  });
  // Flush khi tab ẩn đi
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}
