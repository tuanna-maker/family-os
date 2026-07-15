import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listHealth } from "@mobile/api/health";
import {
  PILOT_ACTIVITY,
  PILOT_ALLERGIES,
  PILOT_APPTS,
  PILOT_CONDITIONS,
  PILOT_MEDS,
  PILOT_PROFILES,
  PILOT_RECORDS,
} from "@mobile/components/health/healthVisuals";
import { useFamilyContext } from "@mobile/hooks/useFamilyContext";

export function useHealthOverview() {
  const { familyId } = useFamilyContext();
  const q = useQuery({
    queryKey: ["health-overview", familyId],
    queryFn: () => listHealth({ family_id: familyId! }),
    enabled: !!familyId,
    staleTime: 60_000,
  });

  const usingPilot = useMemo(() => {
    const data = q.data;
    return !data || ((data.meds?.length ?? 0) === 0 && (data.appts?.length ?? 0) === 0);
  }, [q.data]);

  const profiles = useMemo(() => {
    const fromDb = q.data?.profiles ?? [];
    if (fromDb.length > 0) return fromDb;
    if (!q.data || usingPilot) return PILOT_PROFILES;
    return [];
  }, [q.data, usingPilot]);
  const meds = (q.data?.meds?.length ? q.data.meds : PILOT_MEDS).filter((m) => m.active);
  const appts = q.data?.appts?.length ? q.data.appts : PILOT_APPTS;
  const records = (q.data?.records?.length ? q.data.records : PILOT_RECORDS) as Array<{
    id: string;
    member_name?: string;
    kind?: string;
    title?: string;
    value?: string;
    recorded_at?: string;
  }>;
  const activity = usingPilot ? PILOT_ACTIVITY : PILOT_ACTIVITY;

  const allergies = useMemo(() => {
    const fromDb = profiles
      .filter((p) => p.allergies?.trim())
      .map((p) => ({ member: p.name, detail: p.allergies!.trim() }));
    return fromDb.length > 0 ? fromDb : usingPilot ? PILOT_ALLERGIES : [];
  }, [profiles, usingPilot]);

  const conditions = useMemo(() => {
    const fromDb = profiles
      .filter((p) => p.conditions?.trim())
      .map((p) => ({ member: p.name, detail: p.conditions!.trim() }));
    return fromDb.length > 0 ? fromDb : usingPilot ? PILOT_CONDITIONS : [];
  }, [profiles, usingPilot]);

  const isInitialLoading = q.isLoading && !q.data;

  return {
    ...q,
    isLoading: isInitialLoading,
    usingPilot,
    profiles,
    meds,
    appts,
    records,
    activity,
    allergies,
    conditions,
  };
}
