import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Shared realtime subscription for the SOS ops dashboard.
 * Ref-counted: OpenSosCard + DispatchAssignmentsCard share 1 channel
 * instead of opening 2 identical subscriptions on the same table.
 *
 * On any change to `security_requests` where request_type=sos, invalidates
 * both `open-sos` and `recent-dispatches` query keys.
 */
let channel: RealtimeChannel | null = null;
let refCount = 0;
const listeners = new Set<() => void>();

function ensureChannel() {
  if (channel) return;
  channel = supabase
    .channel("sos-ops-stream")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "security_requests",
        filter: "request_type=eq.sos",
      },
      () => {
        listeners.forEach((fn) => fn());
      },
    )
    .subscribe();
}

function releaseChannel() {
  if (channel && refCount === 0) {
    supabase.removeChannel(channel);
    channel = null;
  }
}

export function useSosOpsStream() {
  const qc = useQueryClient();

  useEffect(() => {
    const onChange = () => {
      qc.invalidateQueries({ queryKey: ["open-sos"] });
      qc.invalidateQueries({ queryKey: ["recent-dispatches"] });
    };
    listeners.add(onChange);
    refCount++;
    ensureChannel();

    return () => {
      listeners.delete(onChange);
      refCount--;
      if (refCount <= 0) {
        refCount = 0;
        releaseChannel();
      }
    };
  }, [qc]);
}
