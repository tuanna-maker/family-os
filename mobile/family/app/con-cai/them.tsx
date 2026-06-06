import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { FieldLabel, PageHeader, PrimaryButton, SelectChip, TextField } from "@mobile/components/ui";
import { DateField, DateTimeField, TimeField, toLocalIso, toDateOnly } from "@mobile/components/DateTimeField";
import { EmojiPicker } from "@mobile/components/EmojiPicker";
import { LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import {
  listChildren,
  upsertAchievement,
  upsertChild,
  upsertHomework,
  upsertParentReminder,
  upsertSchedule,
} from "@mobile/api/children";
import { toast } from "@mobile/utils/toast";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

type FormType = "child" | "schedule" | "homework" | "achievement" | "reminder";

const TITLES: Record<FormType, [string, string]> = {
  child: ["Thêm con", "Sửa hồ sơ con"],
  schedule: ["Thêm tiết học", "Sửa tiết học"],
  homework: ["Thêm bài tập", "Sửa bài tập"],
  achievement: ["Thêm thành tích", "Sửa thành tích"],
  reminder: ["Thêm nhắc", "Sửa nhắc"],
};

const WEEKDAYS = [
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
  { value: 0, label: "Chủ nhật" },
];

export default function ConCaiThemScreen() {
  const router = useRouter();
  const styles = useFormStyles();
  const { type = "child", childId, id } = useLocalSearchParams<{ type?: FormType; childId?: string; id?: string }>();
  const formType = (type ?? "child") as FormType;
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["children", familyId],
    queryFn: () => listChildren({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const existing = useMemo(() => {
    if (!id || !q.data) return null;
    if (formType === "child") return q.data.children.find((c) => c.id === id);
    if (formType === "homework") return q.data.homeworks.find((h) => h.id === id);
    if (formType === "reminder") return q.data.reminders.find((r) => r.id === id);
    if (formType === "schedule") return q.data.schedules.find((s) => s.id === id);
    if (formType === "achievement") return q.data.achievements.find((a) => a.id === id);
    return null;
  }, [id, q.data, formType]);

  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [avatar, setAvatar] = useState("🧒");
  const [dob, setDob] = useState("");
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState(toLocalIso(new Date()));
  const [remindAt, setRemindAt] = useState(toLocalIso(new Date()));
  const [activeChildId, setActiveChildId] = useState(childId ?? "");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [timeStart, setTimeStart] = useState("08:00");
  const [earnedAt, setEarnedAt] = useState(toDateOnly(new Date()));

  useEffect(() => {
    if (existing) {
      if (formType === "child") {
        const c = existing as {
          name: string;
          school?: string | null;
          grade?: string | null;
          avatar?: string | null;
          dob?: string | null;
          notes?: string | null;
        };
        setName(c.name);
        setSchool(c.school ?? "");
        setGrade(c.grade ?? "");
        setAvatar(c.avatar?.trim() || "🧒");
        setDob(c.dob ?? "");
        setNotes((c as { notes?: string | null }).notes ?? "");
      }
      if (formType === "homework") {
        const h = existing as { title: string; subject: string; child_id: string; due_date?: string | null };
        setTitle(h.title);
        setSubject(h.subject);
        setActiveChildId(h.child_id);
        if (h.due_date) setDueDate(`${h.due_date}T09:00`);
      }
      if (formType === "reminder") {
        const r = existing as { title: string; remind_at: string; child_id?: string | null };
        setTitle(r.title);
        setRemindAt(toLocalIso(new Date(r.remind_at)));
        if (r.child_id) setActiveChildId(r.child_id);
      }
      if (formType === "schedule") {
        const s = existing as { subject: string; child_id: string; day_of_week: number; time_start?: string | null };
        setSubject(s.subject);
        setActiveChildId(s.child_id);
        setDayOfWeek(s.day_of_week);
        setTimeStart(s.time_start?.slice(0, 5) ?? "08:00");
      }
      if (formType === "achievement") {
        const a = existing as { title: string; child_id: string; earned_at: string };
        setTitle(a.title);
        setActiveChildId(a.child_id);
        setEarnedAt(a.earned_at.slice(0, 10));
      }
    }
  }, [existing, formType]);

  useEffect(() => {
    if (!activeChildId && q.data?.children[0]) setActiveChildId(q.data.children[0].id);
  }, [q.data, activeChildId]);

  const [addT, editT] = TITLES[formType];
  const pageTitle = existing ? editT : addT;

  const mut = useMutation({
    mutationFn: async () => {
      if (!familyId) throw new Error("Chưa có gia đình");
      if (formType === "child") {
        if (!name.trim()) throw new Error("Nhập tên bé");
        return upsertChild({
          id,
          family_id: familyId,
          name: name.trim(),
          school: school.trim() || null,
          grade: grade.trim() || null,
          avatar: avatar.trim() || "🧒",
          dob: dob || null,
          notes: notes.trim() || null,
        });
      }
      if (formType === "homework") {
        return upsertHomework({
          id,
          family_id: familyId,
          child_id: activeChildId,
          title: title.trim(),
          subject: subject.trim() || "Khác",
          due_date: dueDate.slice(0, 10),
        });
      }
      if (formType === "reminder") {
        return upsertParentReminder({
          id,
          family_id: familyId,
          child_id: activeChildId || null,
          title: title.trim(),
          remind_at: new Date(remindAt).toISOString(),
        });
      }
      if (formType === "schedule") {
        if (!subject.trim()) throw new Error("Nhập môn học");
        if (!activeChildId) throw new Error("Chọn bé trước");
        return upsertSchedule({
          id,
          family_id: familyId,
          child_id: activeChildId,
          day_of_week: dayOfWeek,
          subject: subject.trim(),
          time_start: timeStart,
        });
      }
      if (!title.trim()) throw new Error("Nhập tiêu đề");
      return upsertAchievement({
        id,
        family_id: familyId,
        child_id: activeChildId,
        title: title.trim(),
        earned_at: earnedAt,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["children", familyId] });
      toast.success("Đã lưu");
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading || !familyId) return <Screen><LoadingState /></Screen>;

  const children = q.data?.children ?? [];

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow="Đồng hành cùng con" title={pageTitle} back="/con-cai" />

      {formType === "child" && (
        <>
          <EmojiPicker value={avatar} onChange={setAvatar} />
          <TextField label="Tên bé *" value={name} onChangeText={setName} placeholder="Bé Minh" />
          <DateField label="Ngày sinh" value={dob} onChange={setDob} />
          <TextField label="Trường" value={school} onChangeText={setSchool} placeholder="TH Nguyễn Du" />
          <TextField label="Lớp" value={grade} onChangeText={setGrade} placeholder="Lớp 3A" />
          <TextField label="Ghi chú" value={notes} onChangeText={setNotes} multiline placeholder="Sở thích, dị ứng…" />
        </>
      )}

      {formType === "homework" && (
        <>
          <TextField label="Môn" value={subject} onChangeText={setSubject} placeholder="Toán" />
          <TextField label="Bài tập" value={title} onChangeText={setTitle} placeholder="Làm bài 5" />
          <DateField label="Hạn nộp" value={dueDate.slice(0, 10)} onChange={(d) => setDueDate(`${d}T09:00`)} />
        </>
      )}

      {formType === "reminder" && (
        <>
          <TextField label="Nội dung nhắc" value={title} onChangeText={setTitle} />
          <DateTimeField label="Thời gian" value={remindAt} onChange={setRemindAt} />
        </>
      )}

      {formType === "schedule" && (
        <>
          {children.length > 1 && (
            <>
              <FieldLabel>Chọn bé</FieldLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={styles.chipRow}>
                  {children.map((c) => (
                    <SelectChip
                      key={c.id}
                      label={c.name}
                      active={activeChildId === c.id}
                      onPress={() => setActiveChildId(c.id)}
                    />
                  ))}
                </View>
              </ScrollView>
            </>
          )}
          <TextField label="Môn học *" value={subject} onChangeText={setSubject} placeholder="Toán" />
          <FieldLabel>Thứ trong tuần</FieldLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={styles.chipRow}>
              {WEEKDAYS.map((d) => (
                <SelectChip
                  key={d.value}
                  label={d.label}
                  active={dayOfWeek === d.value}
                  onPress={() => setDayOfWeek(d.value)}
                />
              ))}
            </View>
          </ScrollView>
          <TimeField label="Giờ học" value={timeStart} onChange={setTimeStart} />
        </>
      )}

      {formType === "achievement" && (
        <>
          <TextField label="Thành tích *" value={title} onChangeText={setTitle} placeholder="Học sinh giỏi tháng 5" />
          <DateField label="Ngày đạt được" value={earnedAt} onChange={setEarnedAt} />
        </>
      )}

      <View style={{ marginTop: 8 }}>
        <PrimaryButton label="Lưu" onPress={() => mut.mutate()} loading={mut.isPending} />
      </View>
      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useFormStyles() {
  return useThemedStyles(() => ({
    chipRow: { flexDirection: "row" as const, gap: 8, paddingBottom: 4 },
  }));
}
