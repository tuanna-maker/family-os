import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getSosEvent,
  type SosEvent,
  type SosTimelineEntry,
} from "@/lib/sos.functions";

export type SosRealtimeStatus = "connecting" | "connected" | "disconnected" | "error";

export type UseSosRealtimeResult = {
  event: SosEvent | null;
  timeline: SosTimelineEntry[];
  status: SosRealtimeStatus;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

/**
 * Subscribe to realtime updates for a single SOS event.
 *
 * - Initial fetch via `getSosEvent` server fn (RLS enforced).
 * - Subscribes to Supabase channel `sos:<eventId>` listening to
 *   postgres_changes on `care.sos_event` (UPDATE) and `care.sos_timeline` (INSERT)
 *   filtered by event_id.
 * - On any change, invalidates the cached query so React re-renders fresh data.
 */
export function useSosRealtime(eventId: string | null | undefined): UseSosRealtimeResult {
  const qc = useQueryClient();
  const fetchEvent = useServerFn(getSosEvent);
  const [status, setStatus] = useState<SosRealtimeStatus>("connecting");

  const queryKey = ["sos-event", eventId] as const;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchEvent({ data: { eventId: eventId as string } }),
    enabled: !!eventId,
    staleTime: 5_000,
  });

  useEffect(() => {
    if (!eventId) {
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");

    const channel = supabase
      .channel(`sos:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "care",
          table: "sos_event",
          filter: `id=eq.${eventId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "care",
          table: "sos_timeline",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "care",
          table: "dispatch_assignment",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey });
        },
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus("connected");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("error");
        else if (s === "CLOSED") setStatus("disconnected");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, qc]);

  return {
    event: data?.event ?? null,
    timeline: data?.timeline ?? [],
    status,
    isLoading,
    error: error as Error | null,
    refetch: () => {
      refetch();
    },
  };
}
