import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChipSelect,
  CostSummary,
  FormField,
  FormSection,
  PlanCardSelect,
  SecurityServiceScreen,
  formatVnd,
  todayISO,
} from "@mobile/components/security/SecurityForm";
import { CARE_DURATIONS, createHomeCare } from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { missingFieldMessage } from "@mobile/utils/formValidation";

export default function ChamSocTaiNhaScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family, profile } = useFamilyContext();
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<"elderly" | "child" | "patient" | "other">("elderly");
  const [otherTarget, setOtherTarget] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [apartment, setApartment] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("09:00");
  const [durationId, setDurationId] = useState<(typeof CARE_DURATIONS)[number]["id"]>("h2");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const dur = CARE_DURATIONS.find((d) => d.id === durationId)!;

  useEffect(() => {
    if (family?.apartment && !apartment) setApartment(family.apartment);
    if (profile?.full_name && !contactName) setContactName(profile.full_name);
  }, [family, profile, apartment, contactName]);

  const submit = async () => {
    const err =
      missingFieldMessage([
        { value: recipientName, label: "tên người được chăm" },
        { value: apartment, label: "căn hộ" },
        { value: contactName, label: "người liên hệ" },
        { value: contactPhone, label: "SĐT liên hệ" },
      ]) ??
      (target === "other"
        ? missingFieldMessage([{ value: otherTarget, label: "mô tả đối tượng" }])
        : null);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      await createHomeCare({
        target,
        recipient_name: recipientName.trim(),
        apartment: apartment.trim(),
        start_date: startDate,
        start_time: startTime,
        duration_id: durationId,
        duration_label: dur.label,
        duration_hours: dur.hours,
        tasks: target === "other" && otherTarget.trim() ? [otherTarget.trim()] : [],
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        base_fee: dur.fee,
        estimated_total: dur.fee,
      });
      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success("Đã đăng ký chăm sóc tại nhà");
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SecurityServiceScreen title="Chăm sóc tại nhà" subtitle="Hỗ trợ ông bà / bé khi gia đình vắng" onSubmit={() => void submit()} busy={busy}>
      <FormSection title="1. Thông tin chăm sóc">
      <ChipSelect
        label="Đối tượng"
        value={target}
        onChange={setTarget}
        otherId="other"
        otherValue={otherTarget}
        onOtherChange={setOtherTarget}
        options={[
          { id: "elderly", label: "Người lớn tuổi" },
          { id: "child", label: "Trẻ em" },
          { id: "patient", label: "Bệnh nhân" },
          { id: "other", label: "Khác" },
        ]}
      />
      <FormField label="Tên người được chăm" value={recipientName} onChangeText={setRecipientName} />
      <FormField label="Căn hộ" value={apartment} onChangeText={setApartment} />
      <FormField label="Ngày bắt đầu" value={startDate} onChangeText={setStartDate} />
      <FormField label="Giờ bắt đầu" value={startTime} onChangeText={setStartTime} />
      <PlanCardSelect
        label="Thời lượng"
        value={durationId}
        onChange={setDurationId}
        options={CARE_DURATIONS.map((d) => ({
          id: d.id,
          label: d.label,
          price: formatVnd(d.fee),
        }))}
      />
      <FormField label="Người liên hệ" value={contactName} onChangeText={setContactName} />
      <FormField label="SĐT liên hệ" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
      </FormSection>
      <CostSummary label="Ước tính" value={formatVnd(dur.fee)} />
    </SecurityServiceScreen>
  );
}
