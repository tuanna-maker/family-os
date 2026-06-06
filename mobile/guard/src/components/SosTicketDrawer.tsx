import { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, X } from "lucide-react-native";
import { getSupabase } from "@shared/supabase/get-client";
import {
  addSosNote,
  listSosEvents,
  updateSosStatus,
  type OpenSosRow,
  type SosEvent,
  type SosStatus,
} from "@guard/api/security";

const STATUS_LABEL: Record<string, string> = {
  open: "Đang mở",
  in_progress: "Đang xử lý",
  resolved: "Hoàn thành",
  cancelled: "Đã huỷ",
  dispatched: "Đã điều động",
};

function fmtTime(s: string) {
  return new Date(s).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export function SosTicketDrawer({
  row,
  open,
  onClose,
}: {
  row: OpenSosRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const { data: events = [], isLoading } = useQuery<SosEvent[]>({
    queryKey: ["sos-events", row?.id],
    queryFn: () => listSosEvents({ id: row!.id }),
    enabled: !!row && open,
    refetchInterval: open ? 30_000 : false,
  });

  useEffect(() => {
    if (!row?.id || !open) return;
    const supabase = getSupabase();
    const ch = supabase
      .channel(`sos-ticket-${row.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sos_events",
          filter: `request_id=eq.${row.id}`,
        },
        () => qc.invalidateQueries({ queryKey: ["sos-events", row.id] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [row?.id, open, qc]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sos-events", row?.id] });
    qc.invalidateQueries({ queryKey: ["guard-open-requests"] });
  };

  const statusMut = useMutation({
    mutationFn: (vars: { status: SosStatus; note?: string }) =>
      updateSosStatus({ id: row!.id, status: vars.status, note: vars.note }),
    onSuccess: (_d, vars) => {
      Alert.alert("Thành công", `Đã chuyển sang "${STATUS_LABEL[vars.status]}"`);
      invalidate();
    },
    onError: (e) => Alert.alert("Lỗi", e instanceof Error ? e.message : "Lỗi"),
  });

  const noteMut = useMutation({
    mutationFn: (n: string) => addSosNote({ id: row!.id, note: n }),
    onSuccess: () => {
      setNote("");
      invalidate();
    },
    onError: (e) => Alert.alert("Lỗi", e instanceof Error ? e.message : "Lỗi"),
  });

  if (!row) return null;
  const busy = statusMut.isPending || noteMut.isPending;

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        <View className="px-4 pt-12 pb-3 flex-row items-center border-b border-border bg-white">
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground">{row.ticket_code}</Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              {row.incident_type} · {row.priority}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4">
          <View className="bg-white rounded-2xl border border-border p-4 mb-4">
            <Text className="text-sm font-semibold">{row.zone ?? "—"}</Text>
            {row.location ? (
              <Text className="text-sm text-muted-foreground mt-1">{row.location}</Text>
            ) : null}
            {row.team_name ? (
              <Text className="text-xs text-muted-foreground mt-2">Đội: {row.team_name}</Text>
            ) : null}
            <View className="flex-row items-center mt-2">
              <Clock size={12} color="#9ca3af" />
              <Text className="text-xs text-muted-foreground ml-1">
                {STATUS_LABEL[row.status] ?? row.status}
              </Text>
            </View>
          </View>

          <Text className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
            Nhật ký xử lý
          </Text>
          {isLoading ? (
            <ActivityIndicator className="my-4" />
          ) : events.length === 0 ? (
            <Text className="text-sm text-muted-foreground mb-4">Chưa có sự kiện.</Text>
          ) : (
            events.map((ev) => (
              <View key={ev.id} className="bg-white rounded-xl border border-border p-3 mb-2">
                <Text className="text-[11px] text-muted-foreground">{fmtTime(ev.created_at)}</Text>
                <Text className="text-sm font-medium mt-0.5">
                  {ev.event_type === "note"
                    ? ev.note
                    : ev.to_status
                      ? `→ ${STATUS_LABEL[ev.to_status] ?? ev.to_status}`
                      : ev.note ?? ev.event_type}
                </Text>
              </View>
            ))
          )}

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Thêm ghi chú..."
            className="bg-white border border-border rounded-xl px-3 py-2 text-sm mt-2"
            multiline
          />
          <TouchableOpacity
            disabled={busy || !note.trim()}
            onPress={() => noteMut.mutate(note.trim())}
            className="mt-2 bg-muted rounded-xl py-3 items-center"
          >
            <Text className="text-sm font-semibold">Ghi chú</Text>
          </TouchableOpacity>
        </ScrollView>

        <View className="p-4 border-t border-border bg-white flex-row flex-wrap gap-2">
          {row.status === "open" && (
            <TouchableOpacity
              disabled={busy}
              onPress={() => statusMut.mutate({ status: "in_progress" })}
              className="flex-1 min-w-[45%] bg-brand rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold text-sm">Tiếp nhận</Text>
            </TouchableOpacity>
          )}
          {row.status !== "resolved" && (
            <TouchableOpacity
              disabled={busy}
              onPress={() => statusMut.mutate({ status: "resolved" })}
              className="flex-1 min-w-[45%] bg-success rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold text-sm">Hoàn thành</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
