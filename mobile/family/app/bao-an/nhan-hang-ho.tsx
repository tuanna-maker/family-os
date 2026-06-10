import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChipSelect,
  CostSummary,
  FormField,
  FormSection,
  FormSwitch,
  PlanCardSelect,
  SecurityServiceScreen,
  todayISO,
} from "@mobile/components/security/SecurityForm";
import {
  createPackageHold,
  HOLD_PLAN_META,
  HOLD_PLANS,
  ITEM_TYPES,
} from "@mobile/api/security-services";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { toast } from "@mobile/utils/toast";
import { securityMeta } from "@mobile/constants/security";
import { missingFieldMessage } from "@mobile/utils/formValidation";

export default function NhanHangHoScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { family, profile } = useFamilyContext();
  const [busy, setBusy] = useState(false);
  const [address, setAddress] = useState("");
  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const [itemType, setItemType] = useState<(typeof ITEM_TYPES)[number]>("package");
  const [courier, setCourier] = useState("Giao hàng nhanh (GHN)");
  const [expectedDate, setExpectedDate] = useState(todayISO());
  const [holdPlan, setHoldPlan] = useState<(typeof HOLD_PLANS)[number]>("standard");
  const [notify, setNotify] = useState(true);
  const [photo, setPhoto] = useState(true);

  useEffect(() => {
    if (family?.apartment && !address) setAddress(family.apartment);
    if (profile?.full_name && !recipient) setRecipient(profile.full_name);
  }, [family, profile, address, recipient]);

  const submit = async () => {
    const err = missingFieldMessage([
      { value: address, label: "địa chỉ căn hộ" },
      { value: recipient, label: "người nhận hàng" },
      { value: phone, label: "số điện thoại" },
    ]);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      const res = await createPackageHold({
        address: address.trim(),
        recipient_name: recipient.trim(),
        phone: phone.trim(),
        item_type: itemType,
        courier,
        expected_date: expectedDate,
        hold_plan: holdPlan,
        notify_on_arrival: notify,
        photo_on_receive: photo,
        estimated_cost: 0,
      });
      void qc.invalidateQueries({ queryKey: ["security-requests"] });
      toast.success(
        `Đã đăng ký nhận hàng hộ · Mã ${res.ticket_code}`,
        `Phản hồi ~${securityMeta.responseTimeMinutes} phút`,
      );
      router.back();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gửi thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SecurityServiceScreen
      title="Nhận & giữ hàng hộ"
      subtitle="Bảo vệ nhận, kiểm tra và giữ hộ bưu kiện đến khi bạn lấy"
      onSubmit={() => void submit()}
      busy={busy}
    >
      <FormSection title="1. Thông tin nhận hàng">
        <FormField label="Địa chỉ căn hộ" value={address} onChangeText={setAddress} placeholder="VD: A-1502" />
        <FormField label="Người nhận hàng" value={recipient} onChangeText={setRecipient} placeholder="Tên người nhận" />
        <FormField
          label="Số điện thoại"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="VD: 0901 234 567"
        />
      </FormSection>

      <FormSection title="2. Thông tin đơn hàng">
        <ChipSelect
          label="Loại hàng"
          value={itemType}
          onChange={setItemType}
          options={ITEM_TYPES.map((id) => ({
            id,
            label: { package: "Bưu kiện", food: "Đồ ăn", fragile: "Dễ vỡ", document: "Tài liệu", other: "Khác" }[id],
          }))}
        />
        <FormField label="Đơn vị giao" value={courier} onChangeText={setCourier} placeholder="VD: GHN, GHTK…" />
        <FormField label="Ngày dự kiến đến" value={expectedDate} onChangeText={setExpectedDate} />
      </FormSection>

      <FormSection title="3. Lựa chọn lưu giữ">
        <PlanCardSelect
          label="Gói giữ hộ"
          value={holdPlan}
          onChange={setHoldPlan}
          options={HOLD_PLANS.map((id) => ({
            id,
            label: HOLD_PLAN_META[id].label,
            sub: HOLD_PLAN_META[id].sub,
            price: HOLD_PLAN_META[id].price,
          }))}
        />
      </FormSection>

      <FormSection title="4. Tuỳ chọn bổ sung">
        <FormSwitch
          label="Thông báo khi hàng đến"
          description="Gửi thông báo ngay khi bảo vệ nhận hàng"
          value={notify}
          onValueChange={setNotify}
        />
        <FormSwitch
          label="Chụp ảnh khi nhận hàng"
          description="Bảo vệ chụp ảnh khi nhận hàng"
          value={photo}
          onValueChange={setPhoto}
        />
      </FormSection>

      <CostSummary label="Phí ước tính" value={HOLD_PLAN_META[holdPlan].price} accent />
    </SecurityServiceScreen>
  );
}
