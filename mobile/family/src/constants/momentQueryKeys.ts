export function momentQueryKeys(familyId: string | null | undefined) {
  return {
    list: ["family-moments", familyId] as const,
    preview: ["family-moments-preview", familyId] as const,
    detail: (momentId: string) => ["moment", momentId, familyId] as const,
  };
}

export function invalidateMomentQueries(
  qc: { invalidateQueries: (opts: { queryKey: readonly unknown[] }) => void },
  familyId: string,
) {
  qc.invalidateQueries({ queryKey: ["family-moments", familyId] });
  qc.invalidateQueries({ queryKey: ["family-moments-preview", familyId] });
  qc.invalidateQueries({ queryKey: ["moments", familyId] });
}
