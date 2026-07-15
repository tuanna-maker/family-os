import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { RotateCcw } from "lucide-react-native";
import { Screen } from "@mobile/components/Screen";
import { Card, PageHeader, PrimaryButton, TextField } from "@mobile/components/ui";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  loadFamilyContacts,
  localizeContactSlots,
  resetFamilyContacts,
  updateFamilyContact,
  type ContactSlot,
} from "@mobile/lib/family-contacts";
import { useI18n } from "@mobile/i18n/useI18n";
import { toast } from "@mobile/utils/toast";
import { colors, radius } from "@mobile/theme/colors";

export default function LienHeScreen() {
  const router = useRouter();
  const { familyId } = useFamilyContext();
  const { locale, s } = useI18n();
  const ct = s.screens.contact;
  const c = s.common;
  const [contacts, setContacts] = useState<ContactSlot[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    loadFamilyContacts(familyId).then(setContacts);
  }, [familyId]);

  const save = async (id: ContactSlot["id"], name: string, phone: string) => {
    if (!familyId) return;
    const cleaned = phone.replace(/[^\d+]/g, "");
    if (!cleaned) {
      toast.error(ct.phoneRequired);
      return;
    }
    setBusy(true);
    try {
      const next = await updateFamilyContact(familyId, id, { name: name.trim(), phone: cleaned });
      setContacts(next);
      toast.success(c.saved);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader title={ct.contactsTitle} back="/cham-soc-ong-ba" />
      <Text style={styles.sub}>{ct.contactsSub}</Text>

      {localizeContactSlots(contacts, locale).map((slot) => (
        <ContactEditor key={slot.id} slot={slot} disabled={busy} onSave={save} />
      ))}

      <Pressable
        style={styles.resetBtn}
        onPress={async () => {
          if (!familyId) return;
          const next = await resetFamilyContacts(familyId);
          setContacts(next);
          toast.success(ct.resetDone);
        }}
      >
        <RotateCcw color={colors.muted} size={16} />
        <Text style={styles.resetText}>{ct.resetDefault}</Text>
      </Pressable>
      <View style={{ height: 24 }} />
    </Screen>
  );
}

function ContactEditor({
  slot,
  disabled,
  onSave,
}: {
  slot: ContactSlot;
  disabled: boolean;
  onSave: (id: ContactSlot["id"], name: string, phone: string) => void;
}) {
  const { s } = useI18n();
  const ct = s.screens.contact;
  const c = s.common;
  const [name, setName] = useState(slot.name);
  const [phone, setPhone] = useState(slot.phone);

  useEffect(() => {
    setName(slot.name);
    setPhone(slot.phone);
  }, [slot]);

  return (
    <Card style={{ marginBottom: 12 }}>
      <Text style={styles.slotTitle}>
        {slot.icon} {slot.label}
      </Text>
      <Text style={styles.slotDesc}>{slot.description}</Text>
      <TextField label={ct.displayName} value={name} onChangeText={setName} />
      <TextField label={c.phone} value={phone} onChangeText={setPhone} keyboardType="numeric" />
      <View style={styles.row}>
        <PrimaryButton
          label={c.save}
          onPress={() => onSave(slot.id, name, phone)}
          disabled={disabled}
        />
        <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${phone.replace(/\s/g, "")}`)}>
          <Text style={styles.callText}>{ct.testCall}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.muted, marginBottom: 16, lineHeight: 20 },
  slotTitle: { fontWeight: "800", fontSize: 16, color: colors.foreground },
  slotDesc: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  row: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 4 },
  callBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  callText: { fontWeight: "700", color: colors.brand },
  resetBtn: { flexDirection: "row", gap: 8, justifyContent: "center", padding: 12 },
  resetText: { color: colors.muted, fontWeight: "600" },
});
