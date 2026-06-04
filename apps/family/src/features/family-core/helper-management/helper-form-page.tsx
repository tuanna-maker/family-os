import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { MobileShell } from "@shared/ui/mobile/MobileShell";
import { PageHeader } from "@shared/ui/common/PageHeader";
import {
  FormScreen,
  FormField,
  FormTextInput,
  FormPrimaryButton,
  DateField,
} from "@shared/ui/common/form-fields";
import { InlineSelect } from "@shared/ui/common/inline-select";
import { LoadingState } from "@shared/ui/common/States";
import { listHelpers, redeemHelperShiftToken, setHelperAttendance, upsertHelper, upsertHelperTask } from "@/api/helpers";
import { normalizeQrPayload, isHelperShiftToken } from "@/lib/qr-payload";

export type HelperFormType = "helper" | "task" | "attendance" | "qr";

const ATT_STATUS = [
  { value: "present", label: "Có mặt" },
  { value: "leave", label: "Nghỉ phép" },
  { value: "absent", label: "Vắng" },
];

export function HelperFormPage({
  familyId,
  type,
  helperId,
  editId,
}: {
  familyId: string;
  type: HelperFormType;
  helperId?: string;
  editId?: string;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const helpersQ = useQuery({
    queryKey: ["family-helpers", familyId],
    queryFn: () => listHelpers({ family_id: familyId }),
  });

  const existingHelper = useMemo(() => {
    if (type !== "helper" || !editId || !helpersQ.data) return null;
    return helpersQ.data.find((h) => h.id === editId) ?? null;
  }, [editId, helpersQ.data, type]);

  const [form, setForm] = useState<Record<string, unknown>>({
    name: "",
    phone: "",
    role: "Giúp việc",
    salary: "",
    avatar: "🧑‍🍳",
    title: "",
    time: "",
    task_date: new Date().toISOString().slice(0, 10),
    att_date: new Date().toISOString().slice(0, 10),
    status: "present",
    scanToken: "",
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (existingHelper) {
      setForm((f) => ({
        ...f,
        name: existingHelper.name,
        phone: existingHelper.phone ?? "",
        role: existingHelper.role ?? "Giúp việc",
        salary: existingHelper.salary ? String(existingHelper.salary) : "",
        avatar: existingHelper.avatar,
      }));
    }
  }, [existingHelper]);

  const activeHelperId = helperId ?? editId ?? helpersQ.data?.[0]?.id;

  const titles: Record<HelperFormType, [string, string]> = {
    helper: ["Thêm giúp việc", "Sửa hồ sơ"],
    task: ["Thêm việc", "Sửa việc"],
    attendance: ["Chấm công thủ công", "Chấm công thủ công"],
    qr: ["Nhập mã QR ca", "Nhập mã QR ca"],
  };
  const [addT, editT] = titles[type];
  const pageTitle = editId && type === "helper" ? editT : addT;

  const mut = useMutation({
    mutationFn: async () => {
      if (type === "helper") {
        return upsertHelper({
          id: editId,
          family_id: familyId,
          name: String(form.name).trim(),
          phone: String(form.phone).trim() || undefined,
          role: String(form.role).trim() || undefined,
          salary: form.salary ? Number(form.salary) : undefined,
          avatar: String(form.avatar).trim() || undefined,
        });
      }
      if (!activeHelperId) throw new Error("Chọn người giúp việc");
      if (type === "task") {
        return upsertHelperTask({
          id: editId,
          helper_id: activeHelperId,
          title: String(form.title).trim(),
          time: String(form.time).trim() || undefined,
          task_date: String(form.task_date),
        });
      }
      if (type === "attendance") {
        return setHelperAttendance({
          helper_id: activeHelperId,
          att_date: String(form.att_date),
          status: form.status as "present" | "leave" | "absent",
        });
      }
      const token = normalizeQrPayload(String(form.scanToken));
      if (!isHelperShiftToken(token)) throw new Error("Cần mã ca HLP-…");
      return redeemHelperShiftToken({ token });
    },
    onSuccess: () => {
      toast.success("Đã lưu");
      qc.invalidateQueries({ queryKey: ["family-helpers"] });
      qc.invalidateQueries({ queryKey: ["helper-bundle"] });
      navigate({ to: "/quan-ly-giup-viec" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (helpersQ.isLoading && type !== "helper") return <LoadingState />;

  return (
    <MobileShell>
      <PageHeader eyebrow="Giúp việc" title={pageTitle} back="/quan-ly-giup-viec" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
      >
        <FormScreen
          footer={
            <FormPrimaryButton type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Đang lưu…" : "Lưu"}
            </FormPrimaryButton>
          }
        >
          {type === "helper" && (
            <>
              <FormField label="Họ tên *">
                <FormTextInput value={String(form.name)} onChange={(e) => set("name", e.target.value)} autoFocus />
              </FormField>
              <FormField label="Điện thoại">
                <FormTextInput value={String(form.phone)} onChange={(e) => set("phone", e.target.value)} inputMode="tel" />
              </FormField>
              <FormField label="Vai trò">
                <FormTextInput value={String(form.role)} onChange={(e) => set("role", e.target.value)} />
              </FormField>
              <FormField label="Lương tháng (VNĐ)">
                <FormTextInput
                  type="number"
                  inputMode="numeric"
                  value={String(form.salary)}
                  onChange={(e) => set("salary", e.target.value)}
                />
              </FormField>
              <FormField label="Emoji">
                <FormTextInput maxLength={4} value={String(form.avatar)} onChange={(e) => set("avatar", e.target.value)} />
              </FormField>
            </>
          )}
          {type === "task" && (
            <>
              <FormField label="Việc cần làm *">
                <FormTextInput
                  value={String(form.title)}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Nấu bữa trưa, đón bé…"
                  autoFocus
                />
              </FormField>
              <DateField label="Ngày" value={String(form.task_date)} onChange={(e) => set("task_date", e.target.value)} />
              <FormField label="Giờ (tuỳ chọn)">
                <FormTextInput
                  value={String(form.time)}
                  onChange={(e) => set("time", e.target.value)}
                  placeholder="08:00"
                />
              </FormField>
            </>
          )}
          {type === "attendance" && (
            <>
              <DateField label="Ngày chấm công" value={String(form.att_date)} onChange={(e) => set("att_date", e.target.value)} />
              <InlineSelect
                label="Trạng thái"
                value={String(form.status)}
                onChange={(v) => set("status", v)}
                options={ATT_STATUS}
              />
            </>
          )}
          {type === "qr" && (
            <FormField label="Mã QR ca *">
              <FormTextInput
                value={String(form.scanToken)}
                onChange={(e) => set("scanToken", e.target.value)}
                placeholder="Dán mã HLP-…"
                className="font-mono text-xs"
                autoFocus
              />
            </FormField>
          )}
        </FormScreen>
      </form>
    </MobileShell>
  );
}
