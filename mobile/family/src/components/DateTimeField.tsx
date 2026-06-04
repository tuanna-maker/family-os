import { useState, type ReactNode } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Calendar, Clock } from "lucide-react-native";
import { radius } from "@mobile/theme/colors";
import { useTheme } from "@mobile/theme/themeStore";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function formatDateVi(d: Date) {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDateTimeVi(d: Date) {
  return `${formatDateVi(d)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTimeVi(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toLocalIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toDateOnly(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDateOnly(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T12:00:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function parseTime(value: string): Date {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  const d = new Date();
  if (m) {
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    return d;
  }
  return d;
}

function usePickerStyles() {
  return useThemedStyles((colors, fontScale) => ({
    field: { marginBottom: 16, gap: 6 },
    label: { fontSize: 14 * fontScale, fontWeight: "600" as const, color: colors.foreground },
    box: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 52,
    },
    value: { flex: 1, fontSize: 16 * fontScale, color: colors.foreground, fontWeight: "500" as const },
    placeholder: { color: colors.muted },
    pickerWrap: {
      marginTop: 4,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: "hidden" as const,
    },
    iosDone: {
      alignItems: "flex-end" as const,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    iosDoneText: { color: colors.brand, fontWeight: "700" as const, fontSize: 16 * fontScale },
  }));
}

type PickerShellProps = {
  label: string;
  display: string;
  icon: typeof Calendar;
  show: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: ReactNode;
};

function PickerShell({ label, display, icon: Icon, show, onOpen, onClose, children }: PickerShellProps) {
  const { colors } = useTheme();
  const styles = usePickerStyles();

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={onOpen} style={styles.box} accessibilityRole="button">
        <Icon color={colors.brand} size={20} />
        <Text style={[styles.value, !display && styles.placeholder]}>{display || "Chọn…"}</Text>
      </Pressable>
      {show && (
        <View style={styles.pickerWrap}>
          {children}
          {Platform.OS === "ios" && (
            <Pressable onPress={onClose} style={styles.iosDone}>
              <Text style={styles.iosDoneText}>Xong</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

/** Chỉ ngày — trả về `YYYY-MM-DD` */
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
}: {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const date = parseDateOnly(value || toDateOnly(new Date()));
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(date);

  const onPicker = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShow(false);
    if (event.type === "dismissed" || !selected) return;
    setDraft(selected);
    onChange(toDateOnly(selected));
    if (Platform.OS === "ios") setShow(false);
  };

  return (
    <PickerShell
      label={label}
      display={value ? formatDateVi(parseDateOnly(value)) : ""}
      icon={Calendar}
      show={show}
      onOpen={() => {
        setDraft(parseDateOnly(value));
        setShow(true);
      }}
      onClose={() => setShow(false)}
    >
      <DateTimePicker
        value={draft}
        mode="date"
        display={Platform.OS === "ios" ? "spinner" : "default"}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={onPicker}
      />
    </PickerShell>
  );
}

/** Ngày + giờ — trả về local ISO `YYYY-MM-DDTHH:mm` */
export function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (localIso: string) => void;
}) {
  const date = value ? new Date(value) : new Date();
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<"date" | "time">("date");
  const [draft, setDraft] = useState(date);

  const onPicker = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "dismissed") {
      setShow(false);
      setMode("date");
      return;
    }
    if (!selected) return;

    if (Platform.OS === "android") {
      if (mode === "date") {
        setDraft(selected);
        setMode("time");
        setShow(false);
        setTimeout(() => setShow(true), 50);
        return;
      }
      onChange(toLocalIso(selected));
      setShow(false);
      setMode("date");
      return;
    }

    setDraft(selected);
    onChange(toLocalIso(selected));
    setShow(false);
  };

  const open = () => {
    setDraft(value ? new Date(value) : new Date());
    setMode("date");
    setShow(true);
  };

  return (
    <PickerShell
      label={label}
      display={value ? formatDateTimeVi(new Date(value)) : ""}
      icon={Calendar}
      show={show}
      onOpen={open}
      onClose={() => {
        onChange(toLocalIso(draft));
        setShow(false);
        setMode("date");
      }}
    >
      <DateTimePicker
        value={draft}
        mode={Platform.OS === "ios" ? "datetime" : mode}
        is24Hour
        display={Platform.OS === "ios" ? "spinner" : "default"}
        onChange={onPicker}
      />
    </PickerShell>
  );
}

/** Chỉ giờ — trả về `HH:mm` */
export function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hhmm: string) => void;
}) {
  const date = parseTime(value);
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(date);

  const onPicker = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShow(false);
    if (event.type === "dismissed" || !selected) return;
    setDraft(selected);
    onChange(formatTimeVi(selected));
    if (Platform.OS === "ios") setShow(false);
  };

  return (
    <PickerShell
      label={label}
      display={value ? value : formatTimeVi(date)}
      icon={Clock}
      show={show}
      onOpen={() => {
        setDraft(parseTime(value));
        setShow(true);
      }}
      onClose={() => setShow(false)}
    >
      <DateTimePicker
        value={draft}
        mode="time"
        is24Hour
        display={Platform.OS === "ios" ? "spinner" : "default"}
        onChange={onPicker}
      />
    </PickerShell>
  );
}
