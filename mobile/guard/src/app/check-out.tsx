import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { showAppAlert } from "@mobile/components/AppAlert";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SubHeader } from "@mobile/components/SubHeader";
import { MapPin, AlertTriangle, Check } from "lucide-react-native";
import { checkOutShift, getActiveShift } from "@guard/api/guard-shifts";
import { listOpenResidentRequests } from "@guard/api/security";
import { invalidateShiftQueries, resolveGuardLocation, type GuardCoords } from "@mobile/utils/guardGeo";
import { shiftLabel, shiftTimeRange } from "@mobile/utils/guardFormat";
import { useTheme } from "@mobile/theme/themeStore";
import { radius } from "@mobile/theme/colors";

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const MANUAL_CHECKLIST = [
  "Không còn sự cố chờ xử lý",
  "Đã bàn giao chìa khoá / bộ đàm",
  "Đã hoàn thành tuần tra",
] as const;

const RESIDENT_CHECK_LABEL = "Không còn yêu cầu cư dân đang mở";

export default function CheckOutScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const now = useLiveClock();
  const [coords, setCoords] = useState<GuardCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [manualChecks, setManualChecks] = useState<boolean[]>([false, false, false]);

  const { data: activeShift, isLoading: shiftLoading } = useQuery({
    queryKey: ["guard-active-shift"],
    queryFn: () => getActiveShift(),
  });

  const { data: openRequests = [] } = useQuery({
    queryKey: ["guard-open-requests"],
    queryFn: () => listOpenResidentRequests(),
    refetchInterval: 30_000,
  });

  const onDuty = activeShift?.status === "checked_in";
  const residentClear = openRequests.length === 0;
  const manualDone = manualChecks.every(Boolean);
  const canCheckOut = onDuty && manualDone && residentClear;
  const btnBusy = checkingOut || shiftLoading;

  useEffect(() => {
    void (async () => {
      const { coords: c, error } = await resolveGuardLocation();
      setCoords(c);
      setGeoError(error);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (shiftLoading) return;
    if (!onDuty) {
      showAppAlert({
        title: "Chưa vào ca",
        message: "Bạn chưa check-in ca trực nên không thể kết thúc ca.",
        buttons: [{ text: "OK", onPress: () => router.back() }],
      });
    }
  }, [shiftLoading, onDuty, router]);

  const handleCheckOut = async () => {
    if (!canCheckOut) return;
    setCheckingOut(true);
    try {
      await checkOutShift({ location: coords ?? undefined });
      invalidateShiftQueries(qc);
      showAppAlert({
        title: "Thành công",
        message: "Đã kết thúc ca trực!",
        buttons: [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
      });
    } catch (e) {
      showAppAlert({ title: "Lỗi", message: (e as Error).message || "Không kết thúc ca được" });
    } finally {
      setCheckingOut(false);
    }
  };

  const timeStr = now.toLocaleTimeString("vi-VN", { hour12: false });
  const dateStr = now.toLocaleDateString("vi-VN");

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SubHeader title="Kết thúc ca" back="/(tabs)" />
      <View style={styles.body}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.hero}>
          <View style={[styles.mapRing, { borderColor: colors.emergency, backgroundColor: colors.card }]}>
            <View style={[styles.mapInner, { backgroundColor: colors.tintRed }]}>
              <MapPin size={40} color={colors.emergency} />
            </View>
          </View>
          {loading ? (
            <Text style={[styles.geoText, { color: colors.muted }]}>Đang lấy vị trí…</Text>
          ) : coords ? (
            <Text style={[styles.geoText, { color: colors.success }]}>Vị trí hiện tại đã ghi nhận</Text>
          ) : (
            <Text style={[styles.geoText, { color: colors.warning }]}>{geoError}</Text>
          )}
          {onDuty && activeShift ? (
            <Text style={[styles.shiftMeta, { color: colors.muted }]}>
              {shiftLabel(activeShift.shift_type)} · {shiftTimeRange(activeShift.shift_type)}
            </Text>
          ) : null}
        </View>

        <View style={styles.clockWrap}>
          <Text style={[styles.clock, { color: colors.emergency }]}>{timeStr}</Text>
          <Text style={[styles.date, { color: colors.muted }]}>{dateStr}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Xác nhận kết thúc ca</Text>
        <View style={[styles.checklist, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {MANUAL_CHECKLIST.map((label, i) => {
            const checked = manualChecks[i];
            return (
              <Pressable
                key={label}
                style={styles.checkRow}
                onPress={() =>
                  setManualChecks((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
                }
              >
                <View
                  style={[
                    styles.checkCircle,
                    checked
                      ? { backgroundColor: colors.success, borderColor: colors.success }
                      : { borderColor: colors.foreground, backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  {checked ? <Check size={14} color={colors.white} /> : null}
                </View>
                <Text style={[styles.checkLabel, { color: colors.foreground, opacity: checked ? 1 : 0.88 }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}

          <View style={styles.checkRow}>
            <View
              style={[
                styles.checkCircle,
                residentClear
                  ? { backgroundColor: colors.success, borderColor: colors.success }
                  : { borderColor: colors.warning, backgroundColor: colors.tintOrange },
              ]}
            >
              {residentClear ? <Check size={14} color={colors.white} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.checkLabel, { color: residentClear ? colors.foreground : colors.warning }]}>
                {RESIDENT_CHECK_LABEL}
              </Text>
              {!residentClear ? (
                <Pressable onPress={() => router.push("/requests")}>
                  <Text style={[styles.checkHint, { color: colors.brand }]}>
                    Còn {openRequests.length} yêu cầu đang mở — nhấn để xử lý
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {!canCheckOut && onDuty && !shiftLoading ? (
          <Text style={[styles.hint, { color: colors.muted }]}>
            {!manualDone
              ? "Tick đủ 3 mục xác nhận phía trên."
              : `Còn ${openRequests.length} yêu cầu cư dân — xử lý xong mới kết thúc ca.`}
          </Text>
        ) : null}

        {!onDuty && !shiftLoading ? (
          <View style={styles.warnBox}>
            <AlertTriangle size={28} color={colors.warning} />
            <Text style={[styles.warnText, { color: colors.warning }]}>Bạn chưa vào ca trực.</Text>
          </View>
        ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.cardBorder }]}>
          <Pressable
            onPress={() => void handleCheckOut()}
            disabled={btnBusy || !canCheckOut}
            style={[
              styles.submitBtn,
              {
                backgroundColor: canCheckOut && !btnBusy ? colors.emergency : colors.mutedBg,
                borderColor: canCheckOut && !btnBusy ? colors.emergency : colors.cardBorder,
                opacity: btnBusy ? 0.7 : canCheckOut ? 1 : 0.55,
              },
            ]}
          >
            <Text
              style={[
                styles.submitText,
                { color: canCheckOut && !btnBusy ? colors.white : colors.muted },
              ]}
            >
              {checkingOut ? "Đang xử lý…" : "Xác nhận kết thúc ca"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hero: { alignItems: "center", marginBottom: 20 },
  mapRing: {
    height: 144,
    width: 144,
    borderRadius: 72,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  mapInner: {
    height: 112,
    width: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  geoText: { marginTop: 16, fontSize: 14, textAlign: "center", paddingHorizontal: 16 },
  shiftMeta: { marginTop: 8, fontSize: 12 },
  clockWrap: { alignItems: "center", marginBottom: 20 },
  clock: { fontSize: 40, fontWeight: "700", letterSpacing: 1 },
  date: { marginTop: 4, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  checklist: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 12,
    flexShrink: 0,
  },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  checkCircle: {
    height: 26,
    width: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkLabel: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "500" },
  checkHint: { fontSize: 12, marginTop: 4, fontWeight: "600" },
  hint: { fontSize: 12, textAlign: "center", marginBottom: 12 },
  warnBox: { alignItems: "center", paddingVertical: 8, marginBottom: 8 },
  warnText: { marginTop: 8, textAlign: "center" },
  submitBtn: {
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitText: { fontSize: 15, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
});
