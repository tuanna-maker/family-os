import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChipSelect,
  FormField,
  SecurityServiceScreen,
  formatVnd,
  todayISO,
} from "@mobile/components/security/SecurityForm";
import { createEscort, ESCORT_BASE_FEE } from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";
import { useI18n } from "@mobile/i18n/useI18n";
import { useTheme } from "@mobile/theme/themeStore";

const TARGET_OPTIONS = ["elderly", "child", "patient", "other"] as const;

export default function DuaDonCanHoScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family, profile } = useFamilyContext();
  const { s } = useI18n();
  const { colors } = useTheme();
  const f = s.security.forms;
  const scr = f.screens.escort;
  const [busy, setBusy] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [recipientName, setRecipientName] = useState("");
  const [target, setTarget] = useState<(typeof TARGET_OPTIONS)[number]>("elderly");
  const [pickup, setPickup] = useState(f.defaultLobby);
  const [dropoff, setDropoff] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("09:00");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    if (family?.apartment && !dropoff) setDropoff(family.apartment);
    if (profile?.full_name && !contactName) setContactName(profile.full_name);
  }, [family, profile, dropoff, contactName]);

  const submit = async () => {
    const err = missingFieldMessage([
      { value: recipientName, label: f.validation.escortRecipient },
      { value: pickup, label: f.validation.pickup },
      { value: dropoff, label: f.validation.dropoff },
      { value: contactName, label: f.validation.contact },
      { value: contactPhone, label: f.validation.contactPhone },
    ]);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await createEscort({
        direction,
        direction_label: f.directions[direction],
        recipient_name: recipientName.trim(),
        recipient_target: target,
        pickup_location: pickup.trim(),
        dropoff_location: dropoff.trim(),
        scheduled_date: date,
        scheduled_time: time,
        frequency: "once",
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        estimated_total: ESCORT_BASE_FEE,
      });
      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success(scr.success);
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : f.sendFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SecurityServiceScreen title={scr.title} subtitle={scr.subtitle} onSubmit={() => void submit()} busy={busy}>
      <ChipSelect
        label={f.fields.direction}
        value={direction}
        onChange={setDirection}
        options={[
          { id: "up", label: f.directions.up },
          { id: "down", label: f.directions.down },
        ]}
      />
      <ChipSelect
        label={f.fields.target}
        value={target}
        onChange={setTarget}
        options={TARGET_OPTIONS.map((id) => ({ id, label: f.targets[id] }))}
      />
      <FormField label={f.fields.escortRecipient} value={recipientName} onChangeText={setRecipientName} />
      <FormField label={f.fields.pickup} value={pickup} onChangeText={setPickup} />
      <FormField label={f.fields.dropoff} value={dropoff} onChangeText={setDropoff} />
      <FormField label={f.fields.date} value={date} onChangeText={setDate} />
      <FormField label={f.fields.time} value={time} onChangeText={setTime} />
      <FormField label={f.fields.contact} value={contactName} onChangeText={setContactName} />
      <FormField
        label={f.fields.phone}
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
      />
      <Text style={{ fontSize: 13, color: colors.muted }}>{f.baseFee(formatVnd(ESCORT_BASE_FEE))}</Text>
    </SecurityServiceScreen>
  );
}
