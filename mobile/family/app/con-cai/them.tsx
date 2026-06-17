import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Screen } from "@mobile/components/Screen";
import { AvatarUploadButton } from "@mobile/components/AvatarUploadButton";
import { FieldLabel, PageHeader, PrimaryButton, SelectChip, TextField } from "@mobile/components/ui";
import { DateField, DateTimeField, TimeField, toLocalIso, toDateOnly } from "@mobile/components/DateTimeField";
import { LoadingState } from "@mobile/components/states";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";
import { uploadAvatarFromUri } from "@mobile/api/avatars";
import {
  listChildren,
  upsertAchievement,
  upsertChild,
  upsertHomework,
  upsertParentReminder,
  upsertSchedule,
} from "@mobile/api/children";
import { isChildAvatarUrl } from "@mobile/utils/childAvatar";
import { toast } from "@mobile/utils/toast";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { useI18n } from "@mobile/i18n/useI18n";

type FormType = "child" | "schedule" | "homework" | "achievement" | "reminder";

const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 0] as const;

export default function ConCaiThemScreen() {
  const router = useRouter();
  const styles = useFormStyles();
  const { s } = useI18n();
  const ch = s.screens.children;
  const f = ch.form;
  const c = s.common;
  const ex = s.expense;
  const { type = "child", childId, id } = useLocalSearchParams<{ type?: FormType; childId?: string; id?: string }>();
  const formType = (type ?? "child") as FormType;
  const { familyId } = useFamilyContext();
  const qc = useQueryClient();

  const titles: Record<FormType, [string, string]> = {
    child: [f.addChild, f.editChild],
    schedule: [f.addSchedule, f.editSchedule],
    homework: [f.addHomework, f.editHomework],
    achievement: [f.addAchievement, f.editAchievement],
    reminder: [f.addReminder, f.editReminder],
  };

  const q = useQuery({
    queryKey: ["children", familyId],
    queryFn: () => listChildren({ family_id: familyId! }),
    enabled: !!familyId,
  });

  const existing = useMemo(() => {
    if (!id || !q.data) return null;
    if (formType === "child") return q.data.children.find((child) => child.id === id);
    if (formType === "homework") return q.data.homeworks.find((h) => h.id === id);
    if (formType === "reminder") return q.data.reminders.find((r) => r.id === id);
    if (formType === "schedule") return q.data.schedules.find((item) => item.id === id);
    if (formType === "achievement") return q.data.achievements.find((a) => a.id === id);
    return null;
  }, [id, q.data, formType]);

  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [avatar, setAvatar] = useState("");
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
        const child = existing as {
          name: string;
          school?: string | null;
          grade?: string | null;
          avatar?: string | null;
          dob?: string | null;
          notes?: string | null;
        };
        setName(child.name);
        setSchool(child.school ?? "");
        setGrade(child.grade ?? "");
        setAvatar(isChildAvatarUrl(child.avatar) ? child.avatar!.trim() : "");
        setDob(child.dob ?? "");
        setNotes((child as { notes?: string | null }).notes ?? "");
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
        const item = existing as { subject: string; child_id: string; day_of_week: number; time_start?: string | null };
        setSubject(item.subject);
        setActiveChildId(item.child_id);
        setDayOfWeek(item.day_of_week);
        setTimeStart(item.time_start?.slice(0, 5) ?? "08:00");
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

  const [addT, editT] = titles[formType];
  const pageTitle = existing ? editT : addT;

  const mut = useMutation({
    mutationFn: async () => {
      if (!familyId) throw new Error(c.noFamilyYet);
      if (formType === "child") {
        if (!name.trim()) throw new Error(f.enterName);
        return upsertChild({
          id,
          family_id: familyId,
          name: name.trim(),
          school: school.trim() || null,
          grade: grade.trim() || null,
          avatar: isChildAvatarUrl(avatar) ? avatar.trim() : null,
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
          subject: subject.trim() || ex.other,
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
        if (!subject.trim()) throw new Error(f.enterSubject);
        if (!activeChildId) throw new Error(f.pickChildFirst);
        return upsertSchedule({
          id,
          family_id: familyId,
          child_id: activeChildId,
          day_of_week: dayOfWeek,
          subject: subject.trim(),
          time_start: timeStart,
        });
      }
      if (!title.trim()) throw new Error(f.enterTitle);
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
      toast.success(c.saved);
      router.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading || !familyId) return <Screen><LoadingState /></Screen>;

  const children = q.data?.children ?? [];

  return (
    <Screen contentStyle={{ paddingTop: 0 }}>
      <PageHeader eyebrow={ch.title} title={pageTitle} back="/con-cai" />

      {formType === "child" && (
        <>
          <View style={styles.avatarSection}>
            <AvatarUploadButton
              uri={isChildAvatarUrl(avatar) ? avatar : null}
              fallbackInitial={name || "B"}
              size={96}
              hint={ch.avatarPhoto}
              onPick={async (uri) => {
                const url = await uploadAvatarFromUri(uri, `child-${id ?? "new"}`);
                setAvatar(url);
                toast.success(c.avatarUpdated);
              }}
            />
          </View>
          <TextField label={f.childName} value={name} onChangeText={setName} placeholder="Bé Minh" />
          <DateField label={f.dob} value={dob} onChange={setDob} />
          <TextField label={f.schoolField} value={school} onChangeText={setSchool} placeholder="TH Nguyễn Du" />
          <TextField label={f.grade} value={grade} onChangeText={setGrade} placeholder="Lớp 3A" />
          <TextField label={f.notes} value={notes} onChangeText={setNotes} multiline placeholder={f.notesPh} />
        </>
      )}

      {formType === "homework" && (
        <>
          <TextField label={f.subject} value={subject} onChangeText={setSubject} placeholder="Toán" />
          <TextField label={f.homeworkTitle} value={title} onChangeText={setTitle} placeholder="Làm bài 5" />
          <DateField label={f.dueDate} value={dueDate.slice(0, 10)} onChange={(d) => setDueDate(`${d}T09:00`)} />
        </>
      )}

      {formType === "reminder" && (
        <>
          <TextField label={f.reminderContent} value={title} onChangeText={setTitle} />
          <DateTimeField label={c.scheduledAt} value={remindAt} onChange={setRemindAt} />
        </>
      )}

      {formType === "schedule" && (
        <>
          {children.length > 1 && (
            <>
              <FieldLabel>{f.pickChild}</FieldLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={styles.chipRow}>
                  {children.map((child) => (
                    <SelectChip
                      key={child.id}
                      label={child.name}
                      active={activeChildId === child.id}
                      onPress={() => setActiveChildId(child.id)}
                    />
                  ))}
                </View>
              </ScrollView>
            </>
          )}
          <TextField label={f.subjectRequired} value={subject} onChangeText={setSubject} placeholder="Toán" />
          <FieldLabel>{f.weekday}</FieldLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={styles.chipRow}>
              {WEEKDAY_VALUES.map((value) => (
                <SelectChip
                  key={value}
                  label={ch.weekdays[value]}
                  active={dayOfWeek === value}
                  onPress={() => setDayOfWeek(value)}
                />
              ))}
            </View>
          </ScrollView>
          <TimeField label={f.classTime} value={timeStart} onChange={setTimeStart} />
        </>
      )}

      {formType === "achievement" && (
        <>
          <TextField label={f.achievement} value={title} onChangeText={setTitle} placeholder="Học sinh giỏi tháng 5" />
          <DateField label={f.earnedDate} value={earnedAt} onChange={setEarnedAt} />
        </>
      )}

      <View style={{ marginTop: 8 }}>
        <PrimaryButton label={c.save} onPress={() => mut.mutate()} loading={mut.isPending} />
      </View>
      <View style={{ height: 32 }} />
    </Screen>
  );
}

function useFormStyles() {
  return useThemedStyles(() => ({
    chipRow: { flexDirection: "row" as const, gap: 8, paddingBottom: 4 },
    avatarSection: { alignItems: "center" as const, marginBottom: 12 },
  }));
}
